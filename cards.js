import { app, auth, database } from './firebase-config.js';
import { ref, onValue, set, push, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

class CardSystem {
    constructor() {
        this.cards = new Map();
        this.loadOrCreateCards();
        
        // Добавляем метод collectCard в глобальную область видимости
        window.collectCard = this.collectCard.bind(this);
    }

    async loadOrCreateCards() {
        try {
            // Сначала пробуем загрузить из локального хранилища
            const localCards = localStorage.getItem('cards');
            if (localCards) {
                const cardsData = JSON.parse(localCards);
                for (const [id, card] of Object.entries(cardsData)) {
                    this.cards.set(id, card);
                }
                console.log('Карточки загружены из локального хранилища:', this.cards.size);
            }

            // Затем пробуем синхронизировать с Firebase
            if (auth.currentUser) {
                const cardsRef = ref(database, 'cards');
                const snapshot = await get(cardsRef);
                
                if (!snapshot.exists()) {
                    console.log('Создаем начальные карточки...');
                    await this.createInitialCards();
                } else {
                    console.log('Загружаем существующие карточки...');
                    const cardsData = snapshot.val();
                    for (const [id, card] of Object.entries(cardsData)) {
                        this.cards.set(id, card);
                    }
                    // Сохраняем в локальное хранилище
                    localStorage.setItem('cards', JSON.stringify(Object.fromEntries(this.cards)));
                }

                // Добавляем стартовые карточки в инвентарь
                await this.addStarterCards();
            }
        } catch (error) {
            console.error('Ошибка при загрузке карточек:', error);
        }
    }

    async createInitialCards() {
        const initialCards = this.generateInitialCards();
        try {
            if (auth.currentUser) {
                const cardsRef = ref(database, 'cards');
                await set(cardsRef, initialCards);
            }
            
            for (const [id, card] of Object.entries(initialCards)) {
                this.cards.set(id, card);
            }
            
            // Сохраняем в локальное хранилище
            localStorage.setItem('cards', JSON.stringify(initialCards));
        } catch (error) {
            console.error('Ошибка при создании карточек:', error);
            // В случае ошибки все равно сохраняем локально
            for (const [id, card] of Object.entries(initialCards)) {
                this.cards.set(id, card);
            }
            localStorage.setItem('cards', JSON.stringify(initialCards));
        }
    }

    generateInitialCards() {
        const cards = {};
        const types = ['Существо', 'Заклинание', 'Артефакт'];
        const rarities = ['Обычная', 'Редкая', 'Эпическая', 'Легендарная'];
        
        // Генерируем случайные координаты в радиусе 500 метров от текущей позиции
        const generateNearbyLocation = (center) => {
            const radius = 0.005; // примерно 500 метров
            
            const lat = center.lat + (Math.random() - 0.5) * radius * 2;
            const lng = center.lng + (Math.random() - 0.5) * radius * 2;
            
            return { lat, lng };
        };

        // Получаем текущую позицию или используем дефолтную
        let center = { lat: 55.7558, lng: 37.6173 }; // дефолтная позиция
        if (window.userPosition) {
            center = {
                lat: window.userPosition.coords.latitude,
                lng: window.userPosition.coords.longitude
            };
        }
        
        for (let i = 0; i < 10; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const rarity = rarities[Math.floor(Math.random() * rarities.length)];
            const location = generateNearbyLocation(center);
            
            const id = `card_${i + 1}`;
            cards[id] = {
                id,
                name: `${type} #${i + 1}`,
                type,
                rarity,
                power: Math.floor(Math.random() * 10) + 1,
                location: location,
                collected: {}
            };
        }
        
        return cards;
    }

    getCardsInRadius(center, radius) {
        const result = [];
        
        this.cards.forEach(card => {
            const distance = this.calculateDistance(
                center.lat,
                center.lng,
                card.location.lat,
                card.location.lng
            );
            
            if (distance <= radius) {
                result.push(card);
            }
        });
        
        return result;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Радиус Земли в метрах
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    createCardMarker(card, map) {
        const marker = L.marker([card.location.lat, card.location.lng], {
            icon: L.divIcon({
                className: 'card-marker',
                html: '🎴',
                iconSize: [30, 30]
            })
        }).addTo(map);

        marker.bindPopup(`
            <div class="card-popup">
                <h3>${card.name}</h3>
                <p>Тип: ${card.type}</p>
                <p>Редкость: ${card.rarity}</p>
                <p>Сила: ${card.power}</p>
                <button onclick="collectCard('${card.id}')">Собрать</button>
            </div>
        `);

        return marker;
    }

    async collectCard(cardId) {
        try {
            const card = this.cards.get(cardId);
            if (!card) {
                console.error('Карточка не найдена:', cardId);
                return;
            }

            const userId = auth.currentUser?.uid;
            if (!userId) {
                console.error('Пользователь не авторизован');
                return;
            }

            // Обновляем локальное состояние
            if (!card.collected) card.collected = {};
            card.collected[userId] = true;
            
            // Сохраняем в локальное хранилище
            localStorage.setItem('cards', JSON.stringify(Object.fromEntries(this.cards)));

            // Пробуем обновить в Firebase
            try {
                if (auth.currentUser) {
                    const cardRef = ref(database, `cards/${cardId}/collected/${userId}`);
                    await set(cardRef, true);
                }
            } catch (error) {
                console.error('Ошибка при сохранении в Firebase:', error);
                // Продолжаем работу с локальными данными
            }

            console.log('Карточка собрана:', cardId);
            return true;
        } catch (error) {
            console.error('Ошибка при сборе карточки:', error);
            return false;
        }
    }

    async addStarterCards() {
        if (!auth.currentUser) {
            console.log('Пользователь не авторизован, не можем добавить стартовые карточки');
            return;
        }

        const userId = auth.currentUser.uid;
        const userInventoryRef = ref(database, `users/${userId}/inventory`);
        
        try {
            console.log('Проверяем инвентарь пользователя...');
            // Проверяем, есть ли уже карточки в инвентаре
            const snapshot = await get(userInventoryRef);
            if (snapshot.exists()) {
                console.log('У пользователя уже есть карточки в инвентаре');
                return;
            }

            console.log('Добавляем стартовые карточки...');
            // Создаем стартовые карточки
            const starterCards = {
                'starter1': {
                    id: 'starter1',
                    name: 'Храбрый Воин',
                    type: 'Существо',
                    rarity: 'Обычная',
                    attack: 2,
                    defense: 2,
                    description: 'Начальная карта. Верный спутник в начале пути.'
                },
                'starter2': {
                    id: 'starter2',
                    name: 'Огненный Шар',
                    type: 'Заклинание',
                    rarity: 'Обычная',
                    attack: 3,
                    defense: 0,
                    description: 'Начальная карта. Базовое заклинание огня.'
                },
                'starter3': {
                    id: 'starter3',
                    name: 'Деревянный Щит',
                    type: 'Артефакт',
                    rarity: 'Обычная',
                    attack: 0,
                    defense: 3,
                    description: 'Начальная карта. Простая, но надежная защита.'
                },
                'starter4': {
                    id: 'starter4',
                    name: 'Ученик Мага',
                    type: 'Существо',
                    rarity: 'Обычная',
                    attack: 1,
                    defense: 3,
                    description: 'Начальная карта. Начинающий маг с большим потенциалом.'
                }
            };

            // Добавляем карточки в инвентарь пользователя
            await set(userInventoryRef, starterCards);
            console.log('Стартовые карточки успешно добавлены в инвентарь');
        } catch (error) {
            console.error('Ошибка при добавлении стартовых карточек:', error);
        }
    }
}

export const cardSystem = new CardSystem();

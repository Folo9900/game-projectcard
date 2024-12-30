import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, onValue, set, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { cardSystem } from './cards.js';

let map;
let userMarker;
let watchId;
let visibleCards = new Map();
let inventory = new Map();
let experience = 0;
let level = 1;

// Инициализация карты
function initMap(position) {
    if (map) {
        map.remove();
    }

    const lat = position ? position.coords.latitude : 55.7558;
    const lng = position ? position.coords.longitude : 37.6173;

    map = L.map('map').setView([lat, lng], 16);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Создаем маркер игрока
    userMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'player-marker',
            html: '👤',
            iconSize: [30, 30]
        })
    }).addTo(map);

    // Добавляем карту в начальной позиции
    const cardMarker = L.marker([55.7558, 37.6173], {
        icon: L.divIcon({
            className: 'card-marker',
            html: '🎴',
            iconSize: [30, 30]
        })
    }).addTo(map);

    // Проверяем расстояние до карты при движении
    map.on('move', () => {
        const playerPos = userMarker.getLatLng();
        const cardPos = cardMarker.getLatLng();
        const distance = playerPos.distanceTo(cardPos);
        
        // Если игрок находится в пределах 10 метров от карты
        if (distance < 10) {
            cardMarker.remove(); // Убираем карту с карты
            // Здесь можно добавить логику добавления карты в инвентарь
            console.log('Карта собрана!');
            
            // Отправляем информацию в базу данных
            if (auth.currentUser) {
                const cardData = {
                    collectedAt: Date.now(),
                    location: {
                        lat: cardPos.lat,
                        lng: cardPos.lng
                    }
                };
                
                const userCardsRef = ref(database, `users/${auth.currentUser.uid}/cards/${Date.now()}`);
                set(userCardsRef, cardData).then(() => {
                    console.log('Карта сохранена в инвентаре');
                }).catch(error => {
                    console.error('Ошибка сохранения карты:', error);
                });
            }
        }
    });

    // Сразу обновляем карточки на карте
    updateNearbyCards({ coords: { latitude: lat, longitude: lng } });
}

// Запрос геолокации
function requestLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                initMap(position);
                startLocationTracking();
            },
            (error) => {
                console.error('Ошибка геолокации:', error);
                initMap(null); // Инициализируем карту с дефолтными координатами
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        console.error('Геолокация не поддерживается');
        initMap(null);
    }
}

// Отслеживание местоположения
function startLocationTracking() {
    if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                window.userPosition = position; // Сохраняем позицию
                if (userMarker) {
                    userMarker.setLatLng([latitude, longitude]);
                    map.setView([latitude, longitude]);
                }
                updateNearbyCards(position);
            },
            (error) => {
                console.error('Ошибка отслеживания:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
}

// Остановка отслеживания
function stopLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

// Обновление карточек поблизости
function updateNearbyCards(position) {
    // Очищаем старые маркеры
    visibleCards.forEach(marker => marker.remove());
    visibleCards.clear();

    // Эмодзи для разных типов карт
    const cardEmojis = {
        'Существо': '🐉',
        'Заклинание': '✨',
        'Артефакт': '🎭',
        'Легендарная': '👑',
        'Редкая': '💎',
        'Обычная': '🃏'
    };

    // Получаем карточки из базы данных
    const cardsRef = ref(database, 'cards');
    onValue(cardsRef, (snapshot) => {
        const cards = snapshot.val();
        if (!cards) return;

        Object.entries(cards).forEach(([id, card]) => {
            if (card.location) {
                const distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    card.location.lat,
                    card.location.lng
                );

                // Показываем карточки в радиусе 100 метров
                if (distance <= 0.1) {
                    const emoji = cardEmojis[card.type] || cardEmojis[card.rarity] || '🃏';
                    const marker = L.marker([card.location.lat, card.location.lng], {
                        icon: L.divIcon({
                            className: `card-marker ${card.rarity.toLowerCase()}`,
                            html: `<div class="card-emoji">${emoji}</div>`,
                            iconSize: [40, 40]
                        })
                    }).addTo(map);

                    marker.on('click', () => collectCard(id, card));
                    visibleCards.set(id, marker);
                }
            }
        });
    });
}

// Инициализация чата
function initChat() {
    console.log('Инициализация чата...');
    
    // Получаем элементы чата
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-message-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    
    if (!chatMessages || !chatInput || !chatSendBtn) {
        console.error('Элементы чата не найдены:', {
            messages: !!chatMessages,
            input: !!chatInput,
            button: !!chatSendBtn
        });
        return;
    }

    console.log('Элементы чата найдены');

    // Функция отправки сообщения
    function sendMessage() {
        if (!auth.currentUser) {
            console.error('Пользователь не авторизован');
            return;
        }

        const text = chatInput.value.trim();
        if (!text) {
            console.log('Пустое сообщение');
            return;
        }

        console.log('Отправка сообщения:', text);

        // Создаем ссылку на новое сообщение
        const messagesRef = ref(database, 'chat/messages');
        const newMessageRef = push(messagesRef);

        // Создаем объект сообщения
        const message = {
            user: auth.currentUser.email,
            text: text,
            timestamp: Date.now()
        };

        // Отправляем сообщение
        set(newMessageRef, message)
            .then(() => {
                console.log('Сообщение успешно отправлено');
                chatInput.value = '';
            })
            .catch((error) => {
                console.error('Ошибка отправки сообщения:', error);
            });
    }

    // Слушаем сообщения
    const messagesRef = ref(database, 'chat/messages');
    onValue(messagesRef, (snapshot) => {
        console.log('Получены новые сообщения');
        const messages = snapshot.val() || {};
        
        // Очищаем контейнер сообщений
        chatMessages.innerHTML = '';
        
        // Сортируем и отображаем сообщения
        Object.values(messages)
            .sort((a, b) => a.timestamp - b.timestamp)
            .forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message';
                messageDiv.innerHTML = `
                    <span class="chat-user">${msg.user}:</span>
                    <span class="chat-text">${msg.text}</span>
                    <span class="chat-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                `;
                chatMessages.appendChild(messageDiv);
            });

        // Прокручиваем к последнему сообщению
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, (error) => {
        console.error('Ошибка получения сообщений:', error);
    });

    // Добавляем обработчики событий
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    console.log('Чат инициализирован');
}

// Показываем панель
function showPanel(panelName) {
    console.log('Показываем панель:', panelName);
    
    // Получаем все панели и кнопки
    const panels = document.querySelectorAll('.panel');
    const buttons = document.querySelectorAll('.nav-btn');
    
    // Скрываем все панели и деактивируем все кнопки
    panels.forEach(panel => {
        panel.style.display = 'none';
        panel.classList.remove('active');
    });
    
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Показываем нужную панель и активируем кнопку
    const panel = document.getElementById(`${panelName}-panel`);
    const button = document.getElementById(`${panelName}-btn`);
    
    if (panel && button) {
        // Устанавливаем специальные стили для разных панелей
        switch(panelName) {
            case 'chat':
                panel.style.display = 'flex';
                break;
            case 'inventory':
            case 'guild':
                panel.style.display = 'flex';
                break;
            default:
                panel.style.display = 'block';
        }
        
        panel.classList.add('active');
        button.classList.add('active');
        
        console.log(`Панель ${panelName} активирована, display:`, panel.style.display);
        
        // Если это чат, прокручиваем к последнему сообщению
        if (panelName === 'chat') {
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    } else {
        console.error(`Не найдена панель или кнопка для ${panelName}`);
    }
}

// Инициализация игры
function initGame() {
    console.log('Инициализация игры...');
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('Пользователь авторизован:', user.email);
            
            // Инициализируем чат
            initChat();
            
            // Слушаем изменения в инвентаре пользователя
            const userInventoryRef = ref(database, `users/${user.uid}/inventory`);
            onValue(userInventoryRef, (snapshot) => {
                const data = snapshot.val();
                inventory.clear();
                if (data) {
                    Object.entries(data).forEach(([id, card]) => {
                        inventory.set(id, card);
                    });
                }
                updateInventoryDisplay();
            });

            // Запрашиваем геолокацию
            requestLocation();
            
            // Добавляем обработчики для кнопок
            document.getElementById('map-btn').addEventListener('click', () => showPanel('map'));
            document.getElementById('inventory-btn').addEventListener('click', () => showPanel('inventory'));
            document.getElementById('guild-btn').addEventListener('click', () => showPanel('guild'));
            document.getElementById('chat-btn').addEventListener('click', () => showPanel('chat'));
            document.getElementById('logout-btn').addEventListener('click', () => {
                auth.signOut();
                window.location.reload();
            });

        } else {
            console.log('Пользователь не авторизован');
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('auth-container').style.display = 'block';
        }
    });
}

// Обновление информации об игроке
function updatePlayerInfo(userData) {
    const levelElement = document.getElementById('player-level');
    const experienceElement = document.getElementById('experience-bar');

    if (levelElement && experienceElement) {
        const level = userData.level || 1;
        const experience = userData.experience || 0;
        const nextLevelExp = level * 100;

        levelElement.textContent = `Уровень: ${level}`;
        experienceElement.textContent = `Опыт: ${experience}/${nextLevelExp}`;
    }
}

// Сбор карточки
function collectCard(card) {
    if (cardSystem.collectCard(card)) {
        addExperience(card.power);
        updateInventoryDisplay();
    }
}

// Добавление опыта
function addExperience(amount) {
    experience += amount;
    const newLevel = Math.floor(Math.sqrt(experience / 100)) + 1;
    
    if (newLevel > level) {
        level = newLevel;
        alert(`Поздравляем! Вы достигли ${level} уровня!`);
    }
    
    updateStats();
}

// Обновление статистики
function updateStats() {
    if (auth.currentUser) {
        const userRef = ref(database, `users/${auth.currentUser.uid}`);
        set(userRef, {
            experience: experience,
            level: level,
            lastUpdate: Date.now()
        });
    }
}

// Обновление отображения инвентаря
function updateInventoryDisplay() {
    const container = document.getElementById('inventory-list');
    if (!container) {
        console.error('Контейнер инвентаря не найден');
        return;
    }

    console.log('Обновление инвентаря, количество карт:', inventory.size);
    container.innerHTML = '';

    if (inventory.size === 0) {
        container.innerHTML = '<div class="no-cards">У вас пока нет карточек</div>';
        return;
    }

    inventory.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'inventory-card';
        cardElement.innerHTML = `
            <div class="card-header ${card.rarity.toLowerCase()}">
                <h3>${card.name}</h3>
                <span class="card-type">${card.type}</span>
            </div>
            <div class="card-stats">
                <div class="stat">
                    <span class="label">Атака:</span>
                    <span class="value">${card.attack}</span>
                </div>
                <div class="stat">
                    <span class="label">Защита:</span>
                    <span class="value">${card.defense}</span>
                </div>
            </div>
            <div class="card-description">
                <p>${card.description}</p>
            </div>
            <div class="card-footer">
                <span class="card-rarity">${card.rarity}</span>
            </div>
        `;
        container.appendChild(cardElement);
    });
}

// Запускаем игру
initGame();

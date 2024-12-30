import { auth, database } from './firebase-config.js';
import { ref, set, get, push, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

class GuildSystem {
    constructor() {
        this.currentGuild = null;
        this.init();
    }

    init() {
        // Ждем загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initGuildUI());
        } else {
            this.initGuildUI();
        }

        // Слушаем изменения авторизации
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.loadGuilds();
            } else {
                this.currentGuild = null;
                const currentGuildDiv = document.getElementById('current-guild');
                if (currentGuildDiv) currentGuildDiv.style.display = 'none';
            }
        });
    }

    initGuildUI() {
        const guildPanel = document.getElementById('guild-info');
        if (!guildPanel) {
            console.error('Элемент guild-info не найден');
            return;
        }

        // Добавляем форму создания гильдии
        guildPanel.innerHTML = `
            <div id="guild-container">
                <div id="current-guild" style="display: none;">
                    <h2>Моя гильдия</h2>
                    <div id="guild-details"></div>
                    <div id="guild-members"></div>
                    <button id="leave-guild">Покинуть гильдию</button>
                </div>
                
                <div id="create-guild-form">
                    <h2>Создать гильдию</h2>
                    <input type="text" id="guild-name" placeholder="Название гильдии" required>
                    <textarea id="guild-description" placeholder="Описание гильдии" required></textarea>
                    <select id="guild-type">
                        <option value="public">Публичная</option>
                        <option value="private">Приватная</option>
                    </select>
                    <button id="create-guild-btn">Создать гильдию</button>
                </div>
                
                <div id="guild-list">
                    <h2>Доступные гильдии</h2>
                    <div id="available-guilds"></div>
                </div>
            </div>
        `;

        // Добавляем обработчики событий
        const createGuildBtn = document.getElementById('create-guild-btn');
        const leaveGuildBtn = document.getElementById('leave-guild');

        if (createGuildBtn) {
            createGuildBtn.addEventListener('click', () => this.createGuild());
        }
        if (leaveGuildBtn) {
            leaveGuildBtn.addEventListener('click', () => this.leaveGuild());
        }
    }

    async createGuild() {
        const nameInput = document.getElementById('guild-name');
        const descriptionInput = document.getElementById('guild-description');
        const typeInput = document.getElementById('guild-type');

        if (!nameInput || !descriptionInput || !typeInput) {
            console.error('Не найдены поля формы создания гильдии');
            return;
        }

        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const type = typeInput.value;
        
        if (!name || !description) {
            alert('Заполните все поля!');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            alert('Необходимо войти в систему');
            return;
        }

        try {
            const guildRef = push(ref(database, 'guilds'));
            const newGuild = {
                name,
                description,
                type,
                leader: user.uid,
                members: {
                    [user.uid]: {
                        role: 'leader',
                        email: user.email,
                        joinDate: new Date().toISOString()
                    }
                },
                created: new Date().toISOString()
            };

            await set(guildRef, newGuild);
            
            // Обновляем информацию о пользователе
            await set(ref(database, `users/${user.uid}/guild`), guildRef.key);
            
            this.currentGuild = guildRef.key;
            this.showGuildDetails(newGuild);
            
            // Очищаем форму
            nameInput.value = '';
            descriptionInput.value = '';
            typeInput.value = 'public';

            alert('Гильдия успешно создана!');
        } catch (error) {
            console.error('Ошибка при создании гильдии:', error);
            alert('Ошибка при создании гильдии');
        }
    }

    async loadGuilds() {
        const user = auth.currentUser;
        if (!user) {
            console.log('Пользователь не авторизован');
            return;
        }

        try {
            // Проверяем, состоит ли пользователь в гильдии
            const userGuildRef = ref(database, `users/${user.uid}/guild`);
            const userGuildSnapshot = await get(userGuildRef);
            
            if (userGuildSnapshot.exists()) {
                this.currentGuild = userGuildSnapshot.val();
                const guildRef = ref(database, `guilds/${this.currentGuild}`);
                onValue(guildRef, (snapshot) => {
                    if (snapshot.exists()) {
                        this.showGuildDetails(snapshot.val());
                    }
                });
            }

            // Загружаем список доступных гильдий
            const guildsRef = ref(database, 'guilds');
            onValue(guildsRef, (snapshot) => {
                if (snapshot.exists()) {
                    this.showAvailableGuilds(snapshot.val());
                }
            });
        } catch (error) {
            console.error('Ошибка при загрузке гильдий:', error);
        }
    }

    showGuildDetails(guild) {
        const currentGuildDiv = document.getElementById('current-guild');
        const createGuildForm = document.getElementById('create-guild-form');
        const guildDetails = document.getElementById('guild-details');
        const guildMembers = document.getElementById('guild-members');

        if (!currentGuildDiv || !createGuildForm || !guildDetails || !guildMembers) {
            console.error('Не найдены элементы интерфейса гильдии');
            return;
        }

        currentGuildDiv.style.display = 'block';
        createGuildForm.style.display = 'none';

        guildDetails.innerHTML = `
            <h3>${guild.name}</h3>
            <p>${guild.description}</p>
            <p>Тип: ${guild.type === 'public' ? 'Публичная' : 'Приватная'}</p>
        `;

        // Показываем список участников
        let membersHtml = '<h4>Участники:</h4>';
        Object.entries(guild.members).forEach(([uid, member]) => {
            membersHtml += `
                <div class="guild-member">
                    <span>${member.role === 'leader' ? '👑' : '👤'}</span>
                    <span>${member.email || uid}</span>
                </div>
            `;
        });
        guildMembers.innerHTML = membersHtml;
    }

    showAvailableGuilds(guilds) {
        const availableGuildsDiv = document.getElementById('available-guilds');
        if (!availableGuildsDiv) {
            console.error('Не найден элемент available-guilds');
            return;
        }

        let html = '';
        Object.entries(guilds).forEach(([guildId, guild]) => {
            // Не показываем гильдию, если пользователь уже в ней
            if (guildId === this.currentGuild) return;

            // Не показываем приватные гильдии
            if (guild.type === 'private') return;

            html += `
                <div class="guild-item">
                    <h3>${guild.name}</h3>
                    <p>${guild.description}</p>
                    <p>Участников: ${Object.keys(guild.members).length}</p>
                    <button onclick="window.guildSystem.joinGuild('${guildId}')">Вступить</button>
                </div>
            `;
        });

        availableGuildsDiv.innerHTML = html || '<p>Нет доступных гильдий</p>';
    }

    async joinGuild(guildId) {
        const user = auth.currentUser;
        if (!user) {
            alert('Необходимо войти в систему');
            return;
        }

        try {
            // Проверяем, не состоит ли пользователь уже в гильдии
            if (this.currentGuild) {
                alert('Сначала покиньте текущую гильдию');
                return;
            }

            // Добавляем пользователя в гильдию
            await set(ref(database, `guilds/${guildId}/members/${user.uid}`), {
                role: 'member',
                email: user.email,
                joinDate: new Date().toISOString()
            });

            // Обновляем информацию о пользователе
            await set(ref(database, `users/${user.uid}/guild`), guildId);

            this.currentGuild = guildId;
            alert('Вы успешно вступили в гильдию!');
        } catch (error) {
            console.error('Ошибка при вступлении в гильдию:', error);
            alert('Ошибка при вступлении в гильдию');
        }
    }

    async leaveGuild() {
        const user = auth.currentUser;
        if (!user || !this.currentGuild) {
            alert('Вы не состоите в гильдии');
            return;
        }

        try {
            // Проверяем, не является ли пользователь лидером
            const guildRef = ref(database, `guilds/${this.currentGuild}`);
            const guildSnapshot = await get(guildRef);
            const guild = guildSnapshot.val();

            if (guild.leader === user.uid) {
                if (Object.keys(guild.members).length > 1) {
                    alert('Передайте лидерство другому участнику перед выходом');
                    return;
                }
                // Если лидер последний участник, удаляем гильдию
                await set(guildRef, null);
            } else {
                // Удаляем пользователя из гильдии
                await set(ref(database, `guilds/${this.currentGuild}/members/${user.uid}`), null);
            }

            // Удаляем информацию о гильдии у пользователя
            await set(ref(database, `users/${user.uid}/guild`), null);

            this.currentGuild = null;
            const currentGuildDiv = document.getElementById('current-guild');
            const createGuildForm = document.getElementById('create-guild-form');

            if (currentGuildDiv) currentGuildDiv.style.display = 'none';
            if (createGuildForm) createGuildForm.style.display = 'block';

            alert('Вы покинули гильдию');
        } catch (error) {
            console.error('Ошибка при выходе из гильдии:', error);
            alert('Ошибка при выходе из гильдии');
        }
    }
}

// Создаем глобальный экземпляр системы гильдий
window.guildSystem = new GuildSystem();

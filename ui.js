import { auth, database, ref, onValue, push, set } from './firebase-config.js';

class UI {
    constructor() {
        this.initializeUI();
        this.setupEventListeners();
    }

    initializeUI() {
        // Инициализация панелей
        this.leftPanel = document.getElementById('left-panel');
        this.rightPanel = document.getElementById('right-panel');
        
        // Инициализация кнопок
        this.inventoryBtn = document.getElementById('inventory-btn');
        this.questsBtn = document.getElementById('quests-btn');
        this.chatBtn = document.getElementById('chat-btn');
        this.guildBtn = document.getElementById('guild-btn');
        
        // Инициализация контейнеров контента
        this.inventoryContent = document.getElementById('inventory-content');
        this.questsContent = document.getElementById('quests-content');
        this.chatContent = document.getElementById('chat-content');
        this.guildContent = document.getElementById('guild-content');
        
        // Инициализация чата
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');

        // Создаем кнопку создания гильдии
        this.createGuildButton();
    }

    setupEventListeners() {
        // Обработчики для кнопок панелей
        this.inventoryBtn?.addEventListener('click', () => this.togglePanel('inventory'));
        this.questsBtn?.addEventListener('click', () => this.togglePanel('quests'));
        this.chatBtn?.addEventListener('click', () => this.togglePanel('chat'));
        this.guildBtn?.addEventListener('click', () => this.togglePanel('guild'));
        
        // Обработчик для отправки сообщений в чат
        this.chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.chatInput.value.trim()) {
                this.sendChatMessage(this.chatInput.value.trim());
                this.chatInput.value = '';
            }
        });

        // Слушаем изменения в чате
        if (auth.currentUser) {
            const chatRef = ref(database, 'chat/global');
            onValue(chatRef, (snapshot) => {
                const messages = snapshot.val();
                this.updateChat(messages);
            });
        }
    }

    togglePanel(panelName) {
        const panels = {
            'inventory': this.inventoryContent,
            'quests': this.questsContent,
            'chat': this.chatContent,
            'guild': this.guildContent
        };

        // Скрываем все панели
        Object.values(panels).forEach(panel => {
            if (panel) panel.style.display = 'none';
        });

        // Показываем выбранную панель
        const selectedPanel = panels[panelName];
        if (selectedPanel) {
            selectedPanel.style.display = 'block';
        }
    }

    async sendChatMessage(message) {
        if (!auth.currentUser) return;

        const chatRef = ref(database, 'chat/global');
        await push(chatRef, {
            text: message,
            userId: auth.currentUser.uid,
            username: auth.currentUser.email,
            timestamp: Date.now()
        });
    }

    updateChat(messages) {
        if (!this.chatMessages) return;
        
        this.chatMessages.innerHTML = '';
        if (messages) {
            Object.values(messages).forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message';
                messageDiv.innerHTML = `
                    <span class="chat-username">${msg.username}:</span>
                    <span class="chat-text">${msg.text}</span>
                `;
                this.chatMessages.appendChild(messageDiv);
            });
            
            // Прокручиваем чат вниз
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    createGuildButton() {
        if (!this.guildContent) return;

        const createGuildBtn = document.createElement('button');
        createGuildBtn.id = 'create-guild-btn';
        createGuildBtn.textContent = 'Создать гильдию';
        createGuildBtn.addEventListener('click', () => this.createGuild());
        
        this.guildContent.appendChild(createGuildBtn);
    }

    async createGuild() {
        if (!auth.currentUser) {
            alert('Войдите в игру, чтобы создать гильдию');
            return;
        }

        const guildName = prompt('Введите название гильдии:');
        if (!guildName) return;

        try {
            const guildsRef = ref(database, 'guilds');
            const newGuildRef = push(guildsRef);
            
            await set(newGuildRef, {
                name: guildName,
                owner: auth.currentUser.uid,
                members: {
                    [auth.currentUser.uid]: {
                        role: 'owner',
                        joinedAt: Date.now()
                    }
                },
                createdAt: Date.now()
            });

            // Обновляем информацию о пользователе
            const userRef = ref(database, `users/${auth.currentUser.uid}`);
            await set(userRef, {
                guildId: newGuildRef.key
            }, { merge: true });

            alert('Гильдия успешно создана!');
        } catch (error) {
            console.error('Ошибка при создании гильдии:', error);
            alert('Не удалось создать гильдию. Попробуйте позже.');
        }
    }
}

// Создаем и экспортируем экземпляр UI
export const ui = new UI();

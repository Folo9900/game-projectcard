class SocialSystem {
    constructor(game) {
        this.game = game;
        this.friends = [];
        this.guildMembers = [];
        this.nearbyPlayers = [];
        this.chatMessages = [];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Обработчики для вкладок
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Обработчик чата
        const chatInput = document.querySelector('#chat-input input');
        const chatButton = document.querySelector('#chat-input button');
        
        chatButton.addEventListener('click', () => this.sendMessage(chatInput.value));
        chatInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                this.sendMessage(chatInput.value);
            }
        });

        // Открытие социального окна
        document.getElementById('social-button').addEventListener('click', () => {
            document.getElementById('social-modal').style.display = 'block';
            this.updateNearbyPlayers();
        });

        // Закрытие социального окна
        document.getElementById('close-social').addEventListener('click', () => {
            document.getElementById('social-modal').style.display = 'none';
        });
    }

    switchTab(tabName) {
        // Обновляем активную кнопку
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // Обновляем содержимое
        const container = document.getElementById('social-container');
        container.innerHTML = '';

        switch(tabName) {
            case 'friends':
                this.renderFriendsList(container);
                break;
            case 'guild':
                this.renderGuildInfo(container);
                break;
            case 'nearby':
                this.renderNearbyPlayers(container);
                break;
        }
    }

    renderFriendsList(container) {
        if(this.friends.length === 0) {
            container.innerHTML = '<p>У вас пока нет друзей. Найдите их поблизости!</p>';
            return;
        }

        this.friends.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.className = 'friend-item';
            friendElement.innerHTML = `
                <span>${friend.name}</span>
                <span>Уровень: ${friend.level}</span>
                <button onclick="challengeFriend('${friend.id}')">Вызвать на бой</button>
            `;
            container.appendChild(friendElement);
        });
    }

    renderGuildInfo(container) {
        if(!this.game.playerGuild) {
            container.innerHTML = `
                <div class="guild-create">
                    <h3>У вас нет гильдии</h3>
                    <button onclick="createGuild()">Создать гильдию</button>
                    <button onclick="searchGuilds()">Найти гильдию</button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="guild-info">
                <h3>${this.game.playerGuild.name}</h3>
                <p>Уровень: ${this.game.playerGuild.level}</p>
                <p>Участников: ${this.guildMembers.length}</p>
                <div class="guild-members">
                    ${this.guildMembers.map(member => `
                        <div class="member-item">
                            <span>${member.name}</span>
                            <span>Уровень: ${member.level}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderNearbyPlayers(container) {
        this.updateNearbyPlayers();

        if(this.nearbyPlayers.length === 0) {
            container.innerHTML = '<p>Поблизости нет игроков</p>';
            return;
        }

        this.nearbyPlayers.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'nearby-player';
            playerElement.innerHTML = `
                <span>${player.name}</span>
                <span>Уровень: ${player.level}</span>
                <span>Расстояние: ${Math.round(player.distance)}м</span>
                <div class="player-actions">
                    <button onclick="addFriend('${player.id}')">Добавить в друзья</button>
                    <button onclick="challengePlayer('${player.id}')">Вызвать на бой</button>
                </div>
            `;
            container.appendChild(playerElement);
        });
    }

    updateNearbyPlayers() {
        // В реальном приложении здесь будет запрос к серверу
        // Сейчас генерируем случайных игроков для демонстрации
        this.nearbyPlayers = Array(5).fill(null).map((_, i) => ({
            id: `player${i}`,
            name: `Игрок ${i + 1}`,
            level: Math.floor(Math.random() * 10) + 1,
            distance: Math.random() * 100
        }));
    }

    sendMessage(text) {
        if(!text.trim()) return;

        const message = {
            id: Date.now(),
            text: text,
            sender: 'Вы',
            timestamp: new Date()
        };

        this.addMessageToChat(message);
        
        // Очищаем поле ввода
        document.querySelector('#chat-input input').value = '';
    }

    addMessageToChat(message) {
        this.chatMessages.push(message);
        
        const chatContainer = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <span class="sender">${message.sender}:</span>
            <span class="text">${message.text}</span>
            <span class="time">${message.timestamp.toLocaleTimeString()}</span>
        `;
        
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Ограничиваем количество сообщений в памяти
        if(this.chatMessages.length > 100) {
            this.chatMessages.shift();
        }
    }

    challengePlayer(playerId) {
        const player = this.nearbyPlayers.find(p => p.id === playerId);
        if(player) {
            this.game.battleSystem.startBattle(player);
        }
    }

    addFriend(playerId) {
        const player = this.nearbyPlayers.find(p => p.id === playerId);
        if(player && !this.friends.some(f => f.id === playerId)) {
            this.friends.push(player);
            this.game.showNotification(`${player.name} добавлен в друзья!`);
        }
    }
}

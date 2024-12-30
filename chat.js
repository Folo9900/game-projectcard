import { auth, database, ref, push, onValue } from './firebase-config.js';

class ChatSystem {
    constructor() {
        this.currentChannel = 'global';
        this.messagesContainer = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-message');
        this.channelSelect = document.getElementById('chat-channel');

        this.setupEventListeners();
        this.subscribeToMessages();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        this.channelSelect.addEventListener('change', (e) => {
            this.currentChannel = e.target.value;
            this.messagesContainer.innerHTML = '';
            this.subscribeToMessages();
        });
    }

    async sendMessage() {
        if (!auth.currentUser) {
            alert('Необходимо войти в систему для отправки сообщений');
            return;
        }

        const messageText = this.messageInput.value.trim();
        if (!messageText) return;

        try {
            const chatRef = ref(database, `chat/${this.currentChannel}`);
            await push(chatRef, {
                text: messageText,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                timestamp: Date.now()
            });

            this.messageInput.value = '';
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            alert('Не удалось отправить сообщение');
        }
    }

    subscribeToMessages() {
        const chatRef = ref(database, `chat/${this.currentChannel}`);
        
        onValue(chatRef, (snapshot) => {
            this.messagesContainer.innerHTML = '';
            const messages = snapshot.val();
            
            if (messages) {
                Object.values(messages)
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .forEach(msg => this.displayMessage(msg));
            }
        });
    }

    displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        const time = new Date(message.timestamp).toLocaleTimeString();
        const isOwnMessage = message.userId === auth.currentUser?.uid;
        
        messageElement.innerHTML = `
            <span class="message-time">[${time}]</span>
            <span class="message-author${isOwnMessage ? ' own-message' : ''}">${message.userEmail}:</span>
            <span class="message-text">${this.escapeHtml(message.text)}</span>
        `;
        
        this.messagesContainer.appendChild(messageElement);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Создаем экземпляр системы чата
const chatSystem = new ChatSystem();

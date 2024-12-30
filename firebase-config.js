// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase, ref, set, onValue, push, get, child } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';


// Конфигурация Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyAzI6xCgKtdVlISwJlegnuvhSCvh4XGCBo",
  authDomain: "card-collector-game-114ab.firebaseapp.com",
  databaseURL: "https://card-collector-game-114ab-default-rtdb.firebaseio.com",
  projectId: "card-collector-game-114ab",
  storageBucket: "card-collector-game-114ab.firebasestorage.app",
  messagingSenderId: "1029133549732",
  appId: "1:1029133549732:web:f895b1840be0454403a631",
  measurementId: "G-JRXZ3T6X5P"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Экспортируем все необходимые объекты
export { app, auth, database };

// Структура базы данных
const dbRefs = {
    // Пользователи
    users: {
        get: (userId) => ref(database, `users/${userId}`),
        profile: (userId) => ref(database, `users/${userId}/profile`),
        inventory: (userId) => ref(database, `users/${userId}/inventory`),
        quests: (userId) => ref(database, `users/${userId}/quests`)
    },
    
    // Карточки
    cards: {
        all: ref(database, 'cards'),
        byId: (cardId) => ref(database, `cards/${cardId}`),
        collected: (cardId, userId) => ref(database, `cards/${cardId}/collected/${userId}`)
    },
    
    // Чат
    chat: {
        global: ref(database, 'chat/global'),
        local: (area) => ref(database, `chat/local/${area}`),
        guild: (guildId) => ref(database, `chat/guild/${guildId}`),
        message: (channel, messageId) => ref(database, `chat/${channel}/${messageId}`)
    },
    
    // Гильдии
    guilds: {
        all: ref(database, 'guilds'),
        byId: (guildId) => ref(database, `guilds/${guildId}`),
        members: (guildId) => ref(database, `guilds/${guildId}/members`)
    }
};

// Вспомогательные функции
const firebaseHelpers = {
    // Генерация нового ID для сообщений чата
    generateMessageId: () => push(ref(database)).key,
    
    // Текущий пользователь
    getCurrentUser: () => auth.currentUser,
    
    // Timestamp сервера
    getServerTimestamp: () => database.ServerValue.TIMESTAMP,
    
    // Форматирование времени для чата
    formatMessageTime: (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
};

// Экспорт для использования в других файлах
export { 
    dbRefs, 
    firebaseHelpers, 
    ref, 
    set, 
    onValue, 
    push, 
    get, 
    child 
};

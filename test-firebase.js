import { auth, database, dbRefs } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set, onValue, push } from 'firebase/database';

// Тестовые функции для Firebase
const FirebaseTest = {
    // Тест регистрации
    async testRegistration(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Регистрация успешна:', userCredential.user);
            return userCredential.user;
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            throw error;
        }
    },

    // Тест входа
    async testLogin(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Вход успешен:', userCredential.user);
            return userCredential.user;
        } catch (error) {
            console.error('Ошибка входа:', error);
            throw error;
        }
    },

    // Тест выхода
    async testLogout() {
        try {
            await signOut(auth);
            console.log('Выход успешен');
        } catch (error) {
            console.error('Ошибка выхода:', error);
            throw error;
        }
    },

    // Тест сохранения данных
    async testSaveData(userId, data) {
        try {
            const userRef = ref(database, `users/${userId}`);
            await set(userRef, data);
            console.log('Данные сохранены');
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            throw error;
        }
    },

    // Тест чтения данных
    testReadData(userId) {
        const userRef = ref(database, `users/${userId}`);
        onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            console.log('Прочитанные данные:', data);
        });
    },

    // Тест отправки сообщения в чат
    async testSendMessage(message) {
        try {
            const chatRef = ref(database, 'chat/global');
            const newMessageRef = push(chatRef);
            await set(newMessageRef, {
                text: message,
                timestamp: Date.now(),
                userId: auth.currentUser?.uid || 'test-user'
            });
            console.log('Сообщение отправлено');
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            throw error;
        }
    },

    // Тест прослушивания чата
    testListenToChat() {
        const chatRef = ref(database, 'chat/global');
        onValue(chatRef, (snapshot) => {
            const messages = snapshot.val();
            console.log('Сообщения чата:', messages);
        });
    }
};

// Добавляем функции тестирования в глобальную область видимости
window.testFirebase = FirebaseTest;

// Пример использования:
console.log('Firebase тесты загружены. Используйте window.testFirebase для тестирования.');
console.log('Пример: await testFirebase.testRegistration("test@example.com", "password123")');

import { app, auth, database } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

class AuthSystem {
    constructor() {
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.setupAuthListeners();
        this.setupFormHandlers();
        this.setupLogoutHandler();

        // Проверяем доступность Firebase
        this.checkFirebaseAvailability();
    }

    async checkFirebaseAvailability() {
        const errorElement = document.querySelector('#authError');
        try {
            // Пробуем выполнить тестовый запрос к Firebase
            await auth.setPersistence(browserLocalPersistence);
        } catch (error) {
            console.error('Ошибка подключения к Firebase:', error);
            if (errorElement) {
                errorElement.textContent = 'Пожалуйста, отключите блокировщик рекламы для работы с приложением';
                errorElement.style.color = 'red';
            }
        }
    }

    setupAuthListeners() {
        onAuthStateChanged(auth, (user) => {
            const gameContainer = document.querySelector('#game-container');
            const authContainer = document.querySelector('#auth-container');
            const errorElement = document.querySelector('#authError');

            if (user) {
                console.log('Пользователь вошел:', user.email);
                if (gameContainer) gameContainer.style.display = 'block';
                if (authContainer) authContainer.style.display = 'none';
                if (errorElement) errorElement.textContent = '';
            } else {
                console.log('Пользователь вышел');
                if (gameContainer) gameContainer.style.display = 'none';
                if (authContainer) authContainer.style.display = 'flex';
            }
        });
    }

    setupFormHandlers() {
        const loginForm = document.querySelector('#loginForm');
        const registerForm = document.querySelector('#registerForm');
        const errorElement = document.querySelector('#authError');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.querySelector('#loginEmail').value;
                const password = document.querySelector('#loginPassword').value;

                if (!email || !password) {
                    if (errorElement) errorElement.textContent = 'Введите email и пароль';
                    return;
                }

                try {
                    await signInWithEmailAndPassword(auth, email, password);
                    if (errorElement) errorElement.textContent = '';
                } catch (error) {
                    console.error('Ошибка входа:', error);
                    if (errorElement) errorElement.textContent = this.getErrorMessage(error.code);
                }
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.querySelector('#registerEmail').value;
                const password = document.querySelector('#registerPassword').value;

                if (!email || !password) {
                    if (errorElement) errorElement.textContent = 'Введите email и пароль';
                    return;
                }

                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;

                    // Инициализируем данные пользователя
                    await this.initializeNewUser(user.uid);

                    if (errorElement) errorElement.textContent = '';
                } catch (error) {
                    console.error('Ошибка регистрации:', error);
                    if (errorElement) {
                        const errorMessage = this.getErrorMessage(error.code);
                        errorElement.textContent = errorMessage;
                        errorElement.style.color = 'red';
                    }
                }
            });
        }
    }

    async initializeNewUser(userId) {
        try {
            console.log('Инициализация нового пользователя:', userId);
            // Создаем базовую структуру данных пользователя
            await set(ref(database, `users/${userId}`), {
                email: auth.currentUser.email,
                experience: 0,
                level: 1,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                inventory: {}
            });

            // Добавляем стартовые карточки
            await this.addStarterCards(userId);
            
            console.log('Пользователь успешно инициализирован');
        } catch (error) {
            console.error('Ошибка при инициализации пользователя:', error);
            throw error;
        }
    }

    async addStarterCards(userId) {
        try {
            console.log('Добавляем стартовые карточки для пользователя:', userId);
            const starterCards = {
                'warrior': {
                    id: 'warrior',
                    name: 'Храбрый Воин',
                    type: 'Существо',
                    rarity: 'Обычная',
                    attack: 2,
                    defense: 2,
                    description: 'Начальная карта. Верный спутник в начале пути.'
                },
                'fireball': {
                    id: 'fireball',
                    name: 'Огненный Шар',
                    type: 'Заклинание',
                    rarity: 'Обычная',
                    attack: 3,
                    defense: 0,
                    description: 'Начальная карта. Базовое заклинание огня.'
                },
                'shield': {
                    id: 'shield',
                    name: 'Деревянный Щит',
                    type: 'Артефакт',
                    rarity: 'Обычная',
                    attack: 0,
                    defense: 3,
                    description: 'Начальная карта. Простая, но надежная защита.'
                },
                'apprentice': {
                    id: 'apprentice',
                    name: 'Ученик Мага',
                    type: 'Существо',
                    rarity: 'Обычная',
                    attack: 1,
                    defense: 3,
                    description: 'Начальная карта. Начинающий маг с большим потенциалом.'
                }
            };

            // Добавляем карточки в инвентарь пользователя
            await set(ref(database, `users/${userId}/inventory`), starterCards);
            console.log('Стартовые карточки успешно добавлены');
        } catch (error) {
            console.error('Ошибка при добавлении стартовых карточек:', error);
            throw error;
        }
    }

    setupLogoutHandler() {
        const logoutBtn = document.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error('Ошибка выхода:', error);
                }
            });
        }
    }

    getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'Этот email уже используется';
            case 'auth/invalid-email':
                return 'Неверный формат email';
            case 'auth/operation-not-allowed':
                return 'Операция не разрешена';
            case 'auth/weak-password':
                return 'Слишком слабый пароль (минимум 6 символов)';
            case 'auth/user-disabled':
                return 'Аккаунт отключен';
            case 'auth/user-not-found':
                return 'Пользователь не найден';
            case 'auth/wrong-password':
                return 'Неверный пароль';
            case 'auth/network-request-failed':
                return 'Ошибка сети. Проверьте подключение к интернету';
            default:
                return `Произошла ошибка при авторизации: ${errorCode}`;
        }
    }
}

// Создаем экземпляр системы авторизации
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AuthSystem());
} else {
    new AuthSystem();
}

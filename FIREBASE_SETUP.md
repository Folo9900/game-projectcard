# Настройка Firebase для Card Collector Game

## 1. Создание проекта

1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Нажмите "Create Project" (Создать проект)
3. Введите название проекта: "card-collector-game"
4. Отключите Google Analytics (не требуется для нашего проекта)
5. Нажмите "Create Project"

## 2. Настройка веб-приложения

1. На главной странице проекта нажмите на иконку веб-приложения (</>)
2. Зарегистрируйте приложение с названием "Card Collector Game"
3. Скопируйте предоставленную конфигурацию и замените значения в файле firebase-config.js

## 3. Настройка аутентификации

1. В меню слева выберите "Authentication"
2. Нажмите "Get Started"
3. Во вкладке "Sign-in method" включите:
   - Email/Password
   - Google (опционально)

## 4. Настройка Realtime Database

1. В меню слева выберите "Realtime Database"
2. Нажмите "Create Database"
3. Выберите регион "europe-west1" (ближайший к нам)
4. Начните в тестовом режиме
5. В разделе "Rules" установите следующие правила:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "profile": {
          ".read": "auth != null"
        }
      }
    },
    "cards": {
      ".read": "auth != null",
      ".write": false,
      "$cardId": {
        "collected": {
          "$uid": {
            ".write": "$uid === auth.uid"
          }
        }
      }
    },
    "chat": {
      "global": {
        ".read": "auth != null",
        ".write": "auth != null",
        "$messageId": {
          ".validate": "newData.hasChildren(['text', 'userId', 'timestamp'])"
        }
      },
      "local": {
        "$area": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      },
      "guild": {
        "$guildId": {
          ".read": "root.child('users').child(auth.uid).child('guildId').val() === $guildId",
          ".write": "root.child('users').child(auth.uid).child('guildId').val() === $guildId"
        }
      }
    },
    "guilds": {
      ".read": "auth != null",
      "$guildId": {
        ".write": "auth != null && (!data.exists() || data.child('owner').val() === auth.uid)"
      }
    }
  }
}
```

## 5. Структура базы данных

```
/users
  /$userId
    /profile
      displayName: string
      level: number
      experience: number
      steps: number
      lastActive: timestamp
    /inventory
      /$cardId: timestamp
    /quests
      /$questId
        progress: number
        completed: boolean
    /guildId: string (optional)

/cards
  /$cardId
    type: string
    element: string
    rarity: string
    position: {lat: number, lng: number}
    collected
      /$userId: timestamp

/chat
  /global
    /$messageId
      text: string
      userId: string
      timestamp: number
  /local
    /$area
      /$messageId
        text: string
        userId: string
        timestamp: number
  /guild
    /$guildId
      /$messageId
        text: string
        userId: string
        timestamp: number

/guilds
  /$guildId
    name: string
    owner: string
    members
      /$userId: true
    level: number
    experience: number
```

## 6. Проверка настройки

1. Попробуйте зарегистрировать нового пользователя
2. Проверьте, что данные сохраняются в базу данных
3. Проверьте работу чата
4. Убедитесь, что карточки отображаются на карте

## 7. Безопасность

1. В Project Settings > General убедитесь, что домен вашего сайта добавлен в Authorized Domains
2. Регулярно проверяйте логи аутентификации в разделе Authentication > Users
3. Настройте бюджет в разделе Usage and billing для контроля расходов

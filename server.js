import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Статические файлы
app.use(express.static(__dirname));

// WebSocket подключения
wss.on('connection', (ws) => {
    console.log('Новое WebSocket подключение');

    ws.on('message', (message) => {
        // Отправляем сообщение всем клиентам
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

// Функция для поиска свободного порта
function startServer(port) {
    server.listen(port, () => {
        console.log(`Сервер запущен на http://localhost:${port}`);
    }).on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`Порт ${port} занят, пробуем следующий...`);
            startServer(port + 1);
        } else {
            console.error('Ошибка сервера:', e);
        }
    });
}

// Начинаем с порта 3000
startServer(3000);

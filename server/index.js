import http from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server/utils';

const PORT = 1234;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SyncSpace Y.js WebSocket Server');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('New client connected');

  setupWSConnection(ws, req, {
    gc: true
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`SyncSpace WebSocket server running on ws://localhost:${PORT}`);
});

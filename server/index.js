const http = require('http');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const PORT = 1234;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SyncSpace Y.js WebSocket Server');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log('New client connected');

  setupWSConnection(ws, req, {
    gc: true // Enable garbage collection for outdated documents
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`SyncSpace WebSocket server running on ws://localhost:${PORT}`);
});

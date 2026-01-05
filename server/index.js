import http from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection, setPersistence } from '@y/websocket-server/utils';
import { LeveldbPersistence } from 'y-leveldb';
import * as Y from 'yjs';

const PORT = process.env.PORT || 1234;

// Initialize persistence with LevelDB
const ldb = new LeveldbPersistence('./data');

// Configure persistence for the websocket server
setPersistence({
  provider: ldb,
  bindState: async (docName, ydoc) => {
    console.log(`📂 Loading persisted state for document: ${docName}`);
    const persistedYdoc = await ldb.getYDoc(docName);
    const newUpdates = Y.encodeStateAsUpdate(ydoc);
    ldb.storeUpdate(docName, newUpdates);
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));
    ydoc.on('update', update => {
      console.log(`💾 Storing update for document: ${docName}`);
      ldb.storeUpdate(docName, update);
    });
  },
  writeState: async (_docName, _ydoc) => {
    console.log(`📝 Writing final state for document: ${_docName}`);
  }
});

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SyncSpace Y.js WebSocket Server with Persistence');
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
  console.log('📁 Persistence enabled - data stored in ./data directory');
});

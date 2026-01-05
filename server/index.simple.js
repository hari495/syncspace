import http from 'http';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';

const PORT = process.env.PORT || 1234;

// Store Y.js documents in memory
const docs = new Map();

const getYDoc = (docname) => map.setIfUndefined(docs, docname, () => {
  const doc = new Y.Doc();
  console.log(`📄 Created new document: ${docname}`);
  return doc;
});

const messageSync = 0;
const messageAwareness = 1;

// Setup WebSocket connection for a Y.js document
const setupWSConnection = (conn, req, { docName = req.url.slice(1).split('?')[0], gc = true } = {}) => {
  conn.binaryType = 'arraybuffer';
  const doc = getYDoc(docName);
  const awareness = new awarenessProtocol.Awareness(doc);

  awareness.setLocalState(null);

  const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
    const changedClients = added.concat(updated, removed);
    if (conn.readyState === conn.OPEN) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
      conn.send(encoding.toUint8Array(encoder));
    }
  };

  awareness.on('update', awarenessChangeHandler);

  conn.on('message', (message) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          if (encoding.length(encoder) > 1) {
            conn.send(encoding.toUint8Array(encoder));
          }
          break;
        case messageAwareness:
          awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), conn);
          break;
      }
    } catch (err) {
      console.error('❌ Message handling error:', err);
    }
  });

  conn.on('close', () => {
    awareness.off('update', awarenessChangeHandler);
    awareness.destroy();
    console.log(`❌ Client disconnected from: ${docName}`);
  });

  // Send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));

  // Send awareness states
  if (awareness.getStates().size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(awarenessEncoder, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())));
    conn.send(encoding.toUint8Array(awarenessEncoder));
  }
};

// HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SyncSpace Y.js WebSocket Server');
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('✅ New client connected');
  setupWSConnection(ws, req, { gc: true });
});

server.listen(PORT, () => {
  console.log(`🚀 SyncSpace WebSocket server running on port ${PORT}`);
  console.log(`📡 WebSocket URL: ws://localhost:${PORT}`);
});

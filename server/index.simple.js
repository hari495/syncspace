import http from 'http';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';
import * as persistence from './persistence.js';

const PORT = process.env.PORT || 1234;

// Store Y.js documents in memory
const docs = new Map();

// Debounce timers for persistence
const persistenceTimers = new Map();
const SAVE_DEBOUNCE_MS = 2000; // Save after 2 seconds of inactivity

/**
 * Get or create a Y.js document, loading from persistence if available
 */
const getYDoc = async (docname) => {
  // If document is already in memory, return it
  if (docs.has(docname)) {
    return docs.get(docname);
  }

  // Create new document
  const doc = new Y.Doc();

  // Try to load persisted data
  const persistedState = await persistence.loadDocument(docname);
  if (persistedState) {
    Y.applyUpdate(doc, persistedState);
    console.log(`📂 Loaded persisted document: ${docname}`);
  } else {
    console.log(`📄 Created new document: ${docname}`);
  }

  // Set up persistence on updates
  doc.on('update', (update) => {
    // Debounce saves to avoid excessive disk writes
    if (persistenceTimers.has(docname)) {
      clearTimeout(persistenceTimers.get(docname));
    }

    const timer = setTimeout(async () => {
      await persistence.saveDocument(docname, Y.encodeStateAsUpdate(doc));
      persistenceTimers.delete(docname);
    }, SAVE_DEBOUNCE_MS);

    persistenceTimers.set(docname, timer);
  });

  docs.set(docname, doc);
  return doc;
};

const messageSync = 0;
const messageAwareness = 1;

// Setup WebSocket connection for a Y.js document
const setupWSConnection = async (conn, req, { docName = req.url.slice(1).split('?')[0], gc = true } = {}) => {
  conn.binaryType = 'arraybuffer';
  const doc = await getYDoc(docName);
  const awareness = new awarenessProtocol.Awareness(doc);

  awareness.setLocalState(null);

  const awarenessChangeHandler = ({ added, updated, removed }) => {
    const changedClients = added.concat(updated, removed);
    if (conn && conn.readyState === conn.OPEN && typeof conn.send === 'function') {
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
  setupWSConnection(ws, req, { gc: true }).catch(err => {
    console.error('❌ Error setting up connection:', err);
    ws.close();
  });
});

server.listen(PORT, async () => {
  console.log(`🚀 SyncSpace WebSocket server running on port ${PORT}`);
  console.log(`📡 WebSocket URL: ws://localhost:${PORT}`);
  console.log(`💾 Persistence enabled - data stored in ./data directory`);

  // Show storage stats on startup
  const stats = await persistence.getStats();
  console.log(`📊 Storage: ${stats.documentCount} documents, ${stats.totalSizeMB} MB`);
});

// Graceful shutdown - save all pending documents
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');

  // Clear all debounce timers and save immediately
  for (const [docname, timer] of persistenceTimers.entries()) {
    clearTimeout(timer);
    const doc = docs.get(docname);
    if (doc) {
      await persistence.saveDocument(docname, Y.encodeStateAsUpdate(doc));
    }
  }

  console.log('💾 All documents saved');
  process.exit(0);
});

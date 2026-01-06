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

// Store awareness instances per document (shared across all clients)
const awarenessInstances = new Map();

// Store all connections per document for broadcasting
const documentConnections = new Map();

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

/**
 * Get or create an Awareness instance for a document
 * Awareness is shared across all clients connected to the same document
 */
const getAwareness = (docname, doc) => {
  if (awarenessInstances.has(docname)) {
    return awarenessInstances.get(docname);
  }

  const awareness = new awarenessProtocol.Awareness(doc);
  awarenessInstances.set(docname, awareness);
  console.log(`👁️ Created awareness for: ${docname}`);

  return awareness;
};

const messageSync = 0;
const messageAwareness = 1;

// Setup WebSocket connection for a Y.js document
const setupWSConnection = async (conn, req, { docName = req.url.slice(1).split('?')[0], gc = true } = {}) => {
  conn.binaryType = 'arraybuffer';
  const doc = await getYDoc(docName);

  // Get or create shared awareness for this document
  const awareness = getAwareness(docName, doc);

  // Track this connection for broadcasting
  if (!documentConnections.has(docName)) {
    documentConnections.set(docName, new Set());
  }
  documentConnections.get(docName).add(conn);
  console.log(`✅ Client connected to: ${docName}, total: ${documentConnections.get(docName).size}`);

  // Broadcast document updates to all other clients
  const docUpdateHandler = (update, origin) => {
    // Don't broadcast back to the origin
    if (origin === conn) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    // Broadcast to all clients connected to this document
    const connections = documentConnections.get(docName);
    if (connections) {
      connections.forEach((client) => {
        if (client !== conn && client.readyState === client.OPEN) {
          client.send(message);
        }
      });
    }
  };

  doc.on('update', docUpdateHandler);

  // Broadcast awareness updates to all connected clients
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
          const awarenessUpdate = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(awareness, awarenessUpdate, conn);

          // Track client IDs from this connection
          // Decode the awareness update to extract client IDs
          const updateDecoder = decoding.createDecoder(awarenessUpdate);
          const numClients = decoding.readVarUint(updateDecoder);
          for (let i = 0; i < numClients; i++) {
            const clientID = decoding.readVarUint(updateDecoder);
            connectionClientIDs.add(clientID);
            // Skip clock and state
            decoding.readVarUint(updateDecoder); // clock
            const stateLen = decoding.readVarUint(updateDecoder);
            decoding.readVarUint8Array(updateDecoder); // state
          }
          break;
      }
    } catch (err) {
      console.error('❌ Message handling error:', err);
    }
  });

  // Track client IDs for this connection
  const connectionClientIDs = new Set();

  conn.on('close', () => {
    // Remove document update listener
    doc.off('update', docUpdateHandler);

    // Remove this connection's awareness updates
    awareness.off('update', awarenessChangeHandler);

    // Remove all client states associated with this connection
    if (connectionClientIDs.size > 0) {
      // Create awareness update to remove these clients
      awarenessProtocol.removeAwarenessStates(awareness, Array.from(connectionClientIDs), conn);
      console.log(`❌ Client disconnected from: ${docName}, removed ${connectionClientIDs.size} client(s)`);
    } else {
      console.log(`❌ Client disconnected from: ${docName}`);
    }

    // Remove from connection tracking
    const connections = documentConnections.get(docName);
    if (connections) {
      connections.delete(conn);
      console.log(`📊 Remaining connections for ${docName}: ${connections.size}`);

      // Clean up if no more connections
      if (connections.size === 0) {
        documentConnections.delete(docName);
      }
    }
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

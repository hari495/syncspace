import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

console.log('🧪 Testing Persistence\n');
console.log('=====================================\n');

async function testPersistence() {
  console.log('STEP 1: Creating initial data...\n');

  const doc1 = new Y.Doc();
  const provider1 = new WebsocketProvider(
    'ws://localhost:1234',
    'persistence-test-room',
    doc1,
    { WebSocketPolyfill: WebSocket }
  );
  const shapesMap1 = doc1.getMap('shapes');

  // Wait for initial sync
  await new Promise(resolve => provider1.on('sync', resolve));
  console.log('✓ Connected to server\n');

  // Clear any existing data
  shapesMap1.forEach((_, key) => shapesMap1.delete(key));
  await wait(500);

  // Create test shapes
  console.log('Creating test shapes...');
  shapesMap1.set('persistent-rect', {
    id: 'persistent-rect',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    color: 'blue'
  });

  shapesMap1.set('persistent-text', {
    id: 'persistent-text',
    type: 'text',
    x: 350,
    y: 100,
    text: 'This should persist!',
    fontSize: 24,
    color: 'red'
  });

  shapesMap1.set('persistent-line', {
    id: 'persistent-line',
    type: 'line',
    x: 0,
    y: 0,
    points: [50, 300, 100, 320, 150, 310, 200, 330],
    color: 'green'
  });

  // Wait for data to be persisted
  await wait(1000);

  console.log('✓ Created 3 shapes (rectangle, text, line)');
  console.log(`✓ Current shape count: ${shapesMap1.size}\n`);

  // Disconnect
  provider1.destroy();
  console.log('✓ Disconnected from server\n');

  console.log('=====================================\n');
  console.log('⏸️  Now restart the server and run this script again to verify persistence\n');
  console.log('   Expected: All 3 shapes should still be present after restart\n');
  console.log('=====================================\n');

  process.exit(0);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testPersistence().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('\n⏱️  Test timeout');
  process.exit(1);
}, 10000);

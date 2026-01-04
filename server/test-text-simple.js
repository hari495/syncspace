import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

console.log('🧪 Testing Text Creation\n');

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  'ws://localhost:1234',
  'syncspace-room',
  doc,
  { WebSocketPolyfill: WebSocket }
);
const shapesMap = doc.getMap('shapes');

provider.on('sync', async () => {
  console.log('✓ Connected to server\n');

  console.log('Creating a text shape...');
  const textId = 'test-text-' + Date.now();
  shapesMap.set(textId, {
    id: textId,
    type: 'text',
    x: 200,
    y: 200,
    text: 'Test Text',
    fontSize: 20,
    color: 'black'
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  const text = shapesMap.get(textId);
  if (text) {
    console.log('✓ Text created successfully');
    console.log('  Content:', text.text);
    console.log('  Position:', text.x, text.y);
  } else {
    console.log('✗ Failed to create text');
  }

  console.log('\nAll shapes in map:', Array.from(shapesMap.keys()));

  provider.destroy();
  process.exit(0);
});

setTimeout(() => {
  console.error('Timeout');
  process.exit(1);
}, 5000);

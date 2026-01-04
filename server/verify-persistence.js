import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

console.log('🧪 Verifying Persistence After Restart\n');
console.log('=====================================\n');

async function verifyPersistence() {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(
    'ws://localhost:1234',
    'persistence-test-room',
    doc,
    { WebSocketPolyfill: WebSocket }
  );
  const shapesMap = doc.getMap('shapes');

  // Wait for sync
  await new Promise(resolve => provider.on('sync', resolve));
  console.log('✓ Connected to server\n');

  // Wait a bit more to ensure all data is loaded
  await wait(1000);

  console.log('Checking for persisted shapes...\n');

  const rectExists = shapesMap.has('persistent-rect');
  const textExists = shapesMap.has('persistent-text');
  const lineExists = shapesMap.has('persistent-line');

  const rect = shapesMap.get('persistent-rect');
  const text = shapesMap.get('persistent-text');
  const line = shapesMap.get('persistent-line');

  let passed = 0;
  let failed = 0;

  function logTest(name, condition, details = '') {
    if (condition) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      if (details) console.log(`  ${details}`);
      failed++;
    }
  }

  logTest('Rectangle exists', rectExists);
  logTest('Rectangle has correct properties',
    rect?.type === 'rectangle' && rect?.x === 100 && rect?.y === 100,
    rect ? `Got: type=${rect.type}, x=${rect.x}, y=${rect.y}` : 'Shape not found');

  logTest('Text exists', textExists);
  logTest('Text has correct content',
    text?.text === 'This should persist!',
    text ? `Got: "${text.text}"` : 'Shape not found');

  logTest('Line exists', lineExists);
  logTest('Line has correct points',
    Array.isArray(line?.points) && line?.points.length === 8,
    line ? `Got: ${line.points?.length} points` : 'Shape not found');

  logTest('Total shape count is 3', shapesMap.size === 3,
    `Found ${shapesMap.size} shapes`);

  console.log('\n=====================================');
  console.log(`\n📊 Results:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 Persistence working correctly!');
    console.log('   All shapes survived the server restart.\n');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed`);
    console.log('   Persistence may not be working correctly.\n');
  }

  provider.destroy();
  process.exit(failed > 0 ? 1 : 0);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

verifyPersistence().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('\n⏱️  Test timeout');
  process.exit(1);
}, 10000);

import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

console.log('🧪 End-to-End Workflow Test\n');
console.log('Testing complete user workflow across all features\n');
console.log('=====================================\n');

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✓ ${name}`);
    testsPassed++;
  } else {
    console.log(`✗ ${name}`);
    if (details) console.log(`  Error: ${details}`);
    testsFailed++;
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulate two users working together
const user1Doc = new Y.Doc();
const user1Provider = new WebsocketProvider(
  'ws://localhost:1234',
  'e2e-test-room',
  user1Doc,
  { WebSocketPolyfill: WebSocket }
);
const user1Shapes = user1Doc.getMap('shapes');
const user1UndoManager = new Y.UndoManager(user1Shapes);

const user2Doc = new Y.Doc();
const user2Provider = new WebsocketProvider(
  'ws://localhost:1234',
  'e2e-test-room',
  user2Doc,
  { WebSocketPolyfill: WebSocket }
);
const user2Shapes = user2Doc.getMap('shapes');

Promise.all([
  new Promise(resolve => user1Provider.on('sync', resolve)),
  new Promise(resolve => user2Provider.on('sync', resolve))
]).then(() => {
  console.log('👥 User 1 and User 2 connected\n');
  runWorkflow();
});

async function runWorkflow() {
  // Clear any existing data
  user1Shapes.forEach((_, key) => user1Shapes.delete(key));
  await wait(500);

  console.log('SCENARIO 1: User creates shapes\n');

  // User 1 draws a rectangle
  console.log('User 1: Creating rectangle...');
  user1Shapes.set('rect-1', {
    id: 'rect-1',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    color: 'blue'
  });
  await wait(300);
  logTest('User 2 sees User 1\'s rectangle', user2Shapes.has('rect-1'));

  // User 2 draws a circle
  console.log('\nUser 2: Creating circle...');
  user2Shapes.set('circle-1', {
    id: 'circle-1',
    type: 'circle',
    x: 400,
    y: 200,
    radius: 75,
    color: 'red'
  });
  await wait(300);
  logTest('User 1 sees User 2\'s circle', user1Shapes.has('circle-1'));

  // User 1 draws with pencil
  console.log('\nUser 1: Drawing with pencil...');
  user1Shapes.set('line-1', {
    id: 'line-1',
    type: 'line',
    x: 0,
    y: 0,
    points: [50, 50, 100, 75, 150, 60, 200, 80],
    color: 'black'
  });
  await wait(300);
  logTest('User 2 sees User 1\'s pencil drawing', user2Shapes.has('line-1'));
  logTest('Pencil drawing has correct points', user2Shapes.get('line-1')?.points?.length === 8);

  console.log('\n\nSCENARIO 2: Shape manipulation\n');

  // User 2 transforms User 1's rectangle
  console.log('User 2: Transforming User 1\'s rectangle...');
  const rect = user1Shapes.get('rect-1');
  user2Shapes.set('rect-1', {
    ...rect,
    x: 150,
    y: 150,
    width: 250,
    height: 180,
    rotation: 15
  });
  await wait(300);
  const transformedRect = user1Shapes.get('rect-1');
  logTest('User 1 sees transformation', transformedRect?.x === 150 && transformedRect?.rotation === 15);
  logTest('Resize applied correctly', transformedRect?.width === 250 && transformedRect?.height === 180);

  console.log('\n\nSCENARIO 3: Text workflow\n');

  // User 1 creates text
  console.log('User 1: Creating text...');
  user1Shapes.set('text-1', {
    id: 'text-1',
    type: 'text',
    x: 300,
    y: 300,
    text: 'Hello from User 1',
    fontSize: 20,
    color: 'black'
  });
  await wait(300);
  logTest('User 2 sees User 1\'s text', user2Shapes.has('text-1'));
  logTest('Text content is correct', user2Shapes.get('text-1')?.text === 'Hello from User 1');

  // User 2 edits the text
  console.log('\nUser 2: Editing User 1\'s text...');
  const text = user2Shapes.get('text-1');
  user2Shapes.set('text-1', {
    ...text,
    text: 'Edited by User 2'
  });
  await wait(300);
  logTest('User 1 sees text edit', user1Shapes.get('text-1')?.text === 'Edited by User 2');

  console.log('\n\nSCENARIO 4: Deletion\n');

  // User 1 deletes the pencil line
  console.log('User 1: Deleting pencil line...');
  const beforeDelete = user2Shapes.size;
  user1Shapes.delete('line-1');
  await wait(300);
  logTest('User 2 sees deletion', !user2Shapes.has('line-1'));
  logTest('Shape count decreased', user2Shapes.size === beforeDelete - 1);

  console.log('\n\nSCENARIO 5: Undo/Redo\n');

  // User 1 creates a shape
  console.log('User 1: Creating shape for undo test...');
  user1Shapes.set('undo-test', {
    id: 'undo-test',
    type: 'rectangle',
    x: 500,
    y: 500,
    width: 100,
    height: 100,
    color: 'green'
  });
  await wait(300);
  logTest('Shape created', user1Shapes.has('undo-test') && user2Shapes.has('undo-test'));

  // User 1 undoes
  console.log('\nUser 1: Undoing...');
  user1UndoManager.undo();
  await wait(300);
  logTest('Undo removes shape from User 1', !user1Shapes.has('undo-test'));
  logTest('Undo syncs to User 2', !user2Shapes.has('undo-test'));

  // User 1 redoes
  console.log('\nUser 1: Redoing...');
  user1UndoManager.redo();
  await wait(300);
  logTest('Redo restores shape for User 1', user1Shapes.has('undo-test'));
  logTest('Redo syncs to User 2', user2Shapes.has('undo-test'));

  console.log('\n\nSCENARIO 6: Concurrent editing\n');

  // Both users edit different properties of the same shape simultaneously
  console.log('Both users editing the same rectangle simultaneously...');
  const rectToEdit = user1Shapes.get('rect-1');

  // User 1 changes position
  user1Shapes.set('rect-1', { ...rectToEdit, x: 200 });

  // User 2 changes color (almost simultaneously)
  user2Shapes.set('rect-1', { ...rectToEdit, color: 'purple' });

  await wait(500);

  const finalRect = user1Shapes.get('rect-1');
  logTest('Concurrent edits resolved', !!finalRect);
  logTest('Final state is consistent',
    user1Shapes.get('rect-1')?.color === user2Shapes.get('rect-1')?.color);

  console.log('\n\nSCENARIO 7: Multiple text objects\n');

  // Create multiple text objects to verify they don't interfere
  console.log('Creating multiple text objects...');
  user1Shapes.set('text-multi-1', {
    id: 'text-multi-1',
    type: 'text',
    x: 100,
    y: 400,
    text: 'Text A',
    fontSize: 18,
    color: 'red'
  });

  user2Shapes.set('text-multi-2', {
    id: 'text-multi-2',
    type: 'text',
    x: 200,
    y: 400,
    text: 'Text B',
    fontSize: 22,
    color: 'blue'
  });

  user1Shapes.set('text-multi-3', {
    id: 'text-multi-3',
    type: 'text',
    x: 300,
    y: 400,
    text: 'Text C',
    fontSize: 16,
    color: 'green'
  });

  await wait(500);

  logTest('All text objects sync',
    user1Shapes.has('text-multi-1') &&
    user1Shapes.has('text-multi-2') &&
    user1Shapes.has('text-multi-3') &&
    user2Shapes.has('text-multi-1') &&
    user2Shapes.has('text-multi-2') &&
    user2Shapes.has('text-multi-3'));

  logTest('Each text object has unique content',
    user2Shapes.get('text-multi-1')?.text === 'Text A' &&
    user2Shapes.get('text-multi-2')?.text === 'Text B' &&
    user2Shapes.get('text-multi-3')?.text === 'Text C');

  console.log('\n=====================================');
  console.log(`\n📊 End-to-End Test Results:`);
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n🎉 Complete workflow test passed!');
    console.log('✨ SyncSpace is working at high quality!\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed`);
  }

  user1Provider.destroy();
  user2Provider.destroy();
  process.exit(testsFailed > 0 ? 1 : 0);
}

setTimeout(() => {
  console.error('\n⏱️  Test timeout - workflow took too long');
  user1Provider.destroy();
  user2Provider.destroy();
  process.exit(1);
}, 30000);

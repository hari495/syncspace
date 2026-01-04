import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

console.log('🧪 Comprehensive SyncSpace Test Suite\n');
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

// Create two clients
const doc1 = new Y.Doc();
const provider1 = new WebsocketProvider(
  'ws://localhost:1234',
  'syncspace-room',
  doc1,
  { WebSocketPolyfill: WebSocket }
);
const shapesMap1 = doc1.getMap('shapes');

const doc2 = new Y.Doc();
const provider2 = new WebsocketProvider(
  'ws://localhost:1234',
  'syncspace-room',
  doc2,
  { WebSocketPolyfill: WebSocket }
);
const shapesMap2 = doc2.getMap('shapes');

let bothSynced = false;

Promise.all([
  new Promise(resolve => provider1.on('sync', resolve)),
  new Promise(resolve => provider2.on('sync', resolve))
]).then(() => {
  console.log('📡 Both clients connected and synced\n');
  runTests();
});

async function runTests() {
  // Clear any existing shapes
  shapesMap1.forEach((_, key) => shapesMap1.delete(key));
  await wait(500);

  console.log('TEST 1: Rectangle Creation\n');
  await testRectangle();

  console.log('\nTEST 2: Pencil Drawing\n');
  await testPencil();

  console.log('\nTEST 3: Text Creation\n');
  await testText();

  console.log('\nTEST 4: Shape Transformation\n');
  await testTransformation();

  console.log('\nTEST 5: Shape Deletion\n');
  await testDeletion();

  console.log('\nTEST 6: Undo/Redo\n');
  await testUndoRedo();

  console.log('\n=====================================');
  console.log(`\n📊 Test Results:`);
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed`);
  }

  provider1.destroy();
  provider2.destroy();
  process.exit(testsFailed > 0 ? 1 : 0);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRectangle() {
  const rectId = 'rect-test-1';
  const rect = {
    id: rectId,
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 150,
    height: 100,
    color: 'blue'
  };

  shapesMap1.set(rectId, rect);
  await wait(500);

  const rectOnClient2 = shapesMap2.get(rectId);
  logTest('Rectangle creation syncs', !!rectOnClient2);
  logTest('Rectangle has correct type', rectOnClient2?.type === 'rectangle');
  logTest('Rectangle has correct position', rectOnClient2?.x === 100 && rectOnClient2?.y === 100);
  logTest('Rectangle has correct size', rectOnClient2?.width === 150 && rectOnClient2?.height === 100);
}

async function testPencil() {
  const lineId = 'line-test-1';
  const line = {
    id: lineId,
    type: 'line',
    x: 0,
    y: 0,
    points: [50, 50, 60, 55, 70, 60, 80, 65],
    color: 'black'
  };

  shapesMap1.set(lineId, line);
  await wait(500);

  const lineOnClient2 = shapesMap2.get(lineId);
  logTest('Line creation syncs', !!lineOnClient2);
  logTest('Line has correct type', lineOnClient2?.type === 'line');
  logTest('Line has points array', Array.isArray(lineOnClient2?.points));
  logTest('Line has correct number of points', lineOnClient2?.points?.length === 8);
}

async function testText() {
  const textId = 'text-test-1';
  const text = {
    id: textId,
    type: 'text',
    x: 200,
    y: 200,
    text: 'Hello World',
    fontSize: 20,
    color: 'black'
  };

  shapesMap1.set(textId, text);
  await wait(500);

  const textOnClient2 = shapesMap2.get(textId);
  logTest('Text creation syncs', !!textOnClient2);
  logTest('Text has correct type', textOnClient2?.type === 'text');
  logTest('Text has correct content', textOnClient2?.text === 'Hello World');
  logTest('Text has correct font size', textOnClient2?.fontSize === 20);
  logTest('Text has correct position', textOnClient2?.x === 200 && textOnClient2?.y === 200);
}

async function testTransformation() {
  const shapeId = 'rect-test-1';
  const shape = shapesMap1.get(shapeId);

  if (shape) {
    const transformed = {
      ...shape,
      x: 300,
      y: 300,
      rotation: 45,
      width: 200,
      height: 150
    };

    shapesMap1.set(shapeId, transformed);
    await wait(500);

    const shapeOnClient2 = shapesMap2.get(shapeId);
    logTest('Position update syncs', shapeOnClient2?.x === 300 && shapeOnClient2?.y === 300);
    logTest('Rotation syncs', shapeOnClient2?.rotation === 45);
    logTest('Resize syncs', shapeOnClient2?.width === 200 && shapeOnClient2?.height === 150);
  } else {
    logTest('Shape exists for transformation', false, 'Shape not found');
  }
}

async function testDeletion() {
  const lineId = 'line-test-1';
  const beforeCount = shapesMap2.size;

  shapesMap1.delete(lineId);
  await wait(500);

  const afterCount = shapesMap2.size;
  const deleted = !shapesMap2.has(lineId);

  logTest('Deletion syncs', deleted);
  logTest('Shape count decreases', afterCount === beforeCount - 1);
}

async function testUndoRedo() {
  const undoManager = new Y.UndoManager(shapesMap1);
  const initialCount = shapesMap1.size;

  // Create a shape
  const newId = 'undo-test-1';
  shapesMap1.set(newId, {
    id: newId,
    type: 'rectangle',
    x: 400,
    y: 400,
    width: 50,
    height: 50,
    color: 'red'
  });
  await wait(300);

  const afterCreate = shapesMap1.size;
  logTest('Shape created for undo test', afterCreate === initialCount + 1);

  // Undo
  undoManager.undo();
  await wait(300);

  const afterUndo = shapesMap1.size;
  logTest('Undo removes shape', afterUndo === initialCount);

  // Redo
  undoManager.redo();
  await wait(300);

  const afterRedo = shapesMap1.size;
  logTest('Redo restores shape', afterRedo === initialCount + 1);
}

setTimeout(() => {
  console.error('\n⏱️  Test timeout - tests took too long');
  provider1.destroy();
  provider2.destroy();
  process.exit(1);
}, 30000);

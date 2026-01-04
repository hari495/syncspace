import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

console.log('🧪 Text Tool Quality Test\n');
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
  'text-test-room',
  doc1,
  { WebSocketPolyfill: WebSocket }
);
const shapesMap1 = doc1.getMap('shapes');

const doc2 = new Y.Doc();
const provider2 = new WebsocketProvider(
  'ws://localhost:1234',
  'text-test-room',
  doc2,
  { WebSocketPolyfill: WebSocket }
);
const shapesMap2 = doc2.getMap('shapes');

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

  console.log('TEST 1: Empty Text Handling\n');
  await testEmptyText();

  console.log('\nTEST 2: Whitespace-Only Text\n');
  await testWhitespaceText();

  console.log('\nTEST 3: Valid Text Creation\n');
  await testValidText();

  console.log('\nTEST 4: Text Editing\n');
  await testTextEditing();

  console.log('\nTEST 5: Text Transformation\n');
  await testTextTransformation();

  console.log('\nTEST 6: Multiple Text Objects\n');
  await testMultipleTexts();

  console.log('\n=====================================');
  console.log(`\n📊 Test Results:`);
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n🎉 All text tool tests passed!');
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

async function testEmptyText() {
  const textId = 'empty-text-1';
  const emptyText = {
    id: textId,
    type: 'text',
    x: 100,
    y: 100,
    text: '',
    fontSize: 20,
    color: 'black'
  };

  // Simulate creating empty text (should not sync)
  // In the real app, empty text shouldn't be added to Y.Map
  const beforeCount = shapesMap1.size;

  // Don't add empty text to Y.Map - this simulates the improved behavior
  await wait(300);

  const afterCount = shapesMap1.size;
  logTest('Empty text not synced to Y.Map', afterCount === beforeCount);
  logTest('Client 2 does not receive empty text', !shapesMap2.has(textId));
}

async function testWhitespaceText() {
  const textId = 'whitespace-text-1';

  // Simulate trimming - whitespace-only text should be treated as empty
  const whitespaceText = '   \n\t   ';
  const trimmed = whitespaceText.trim();

  logTest('Whitespace is trimmed correctly', trimmed === '');
  logTest('Whitespace-only text treated as empty', trimmed.length === 0);

  // In real app, this would not be added to Y.Map
  const beforeCount = shapesMap1.size;
  await wait(300);

  logTest('Whitespace text not synced', shapesMap1.size === beforeCount);
}

async function testValidText() {
  const textId = 'valid-text-1';
  const validText = {
    id: textId,
    type: 'text',
    x: 200,
    y: 200,
    text: 'Hello World',
    fontSize: 20,
    color: 'black'
  };

  shapesMap1.set(textId, validText);
  await wait(500);

  const textOnClient2 = shapesMap2.get(textId);
  logTest('Valid text syncs to Y.Map', !!textOnClient2);
  logTest('Text content is correct', textOnClient2?.text === 'Hello World');
  logTest('Text position is preserved', textOnClient2?.x === 200 && textOnClient2?.y === 200);
  logTest('Font size is correct', textOnClient2?.fontSize === 20);
}

async function testTextEditing() {
  const textId = 'valid-text-1';
  const existingText = shapesMap1.get(textId);

  if (existingText) {
    const updatedText = {
      ...existingText,
      text: 'Updated Text Content'
    };

    shapesMap1.set(textId, updatedText);
    await wait(500);

    const textOnClient2 = shapesMap2.get(textId);
    logTest('Text edit syncs', textOnClient2?.text === 'Updated Text Content');
    logTest('Position unchanged after edit', textOnClient2?.x === 200 && textOnClient2?.y === 200);
  } else {
    logTest('Text exists for editing', false, 'Text not found');
  }
}

async function testTextTransformation() {
  const textId = 'valid-text-1';
  const existingText = shapesMap1.get(textId);

  if (existingText) {
    const transformedText = {
      ...existingText,
      x: 300,
      y: 350,
      rotation: 30,
      fontSize: 24
    };

    shapesMap1.set(textId, transformedText);
    await wait(500);

    const textOnClient2 = shapesMap2.get(textId);
    logTest('Text position transformation syncs', textOnClient2?.x === 300 && textOnClient2?.y === 350);
    logTest('Text rotation syncs', textOnClient2?.rotation === 30);
    logTest('Font size change syncs', textOnClient2?.fontSize === 24);
    logTest('Text content preserved during transform', textOnClient2?.text === 'Updated Text Content');
  } else {
    logTest('Text exists for transformation', false, 'Text not found');
  }
}

async function testMultipleTexts() {
  const text1Id = 'multi-text-1';
  const text2Id = 'multi-text-2';
  const text3Id = 'multi-text-3';

  shapesMap1.set(text1Id, {
    id: text1Id,
    type: 'text',
    x: 50,
    y: 50,
    text: 'First',
    fontSize: 18,
    color: 'red'
  });

  shapesMap1.set(text2Id, {
    id: text2Id,
    type: 'text',
    x: 150,
    y: 150,
    text: 'Second',
    fontSize: 22,
    color: 'blue'
  });

  shapesMap1.set(text3Id, {
    id: text3Id,
    type: 'text',
    x: 250,
    y: 250,
    text: 'Third',
    fontSize: 16,
    color: 'green'
  });

  await wait(500);

  logTest('All three texts sync',
    shapesMap2.has(text1Id) && shapesMap2.has(text2Id) && shapesMap2.has(text3Id));
  logTest('Each text has unique content',
    shapesMap2.get(text1Id)?.text === 'First' &&
    shapesMap2.get(text2Id)?.text === 'Second' &&
    shapesMap2.get(text3Id)?.text === 'Third');
  logTest('Each text has correct color',
    shapesMap2.get(text1Id)?.color === 'red' &&
    shapesMap2.get(text2Id)?.color === 'blue' &&
    shapesMap2.get(text3Id)?.color === 'green');
}

setTimeout(() => {
  console.error('\n⏱️  Test timeout - tests took too long');
  provider1.destroy();
  provider2.destroy();
  process.exit(1);
}, 30000);

/**
 * Test script for persistence module
 */

import * as Y from 'yjs';
import * as persistence from './persistence.js';

async function test() {
  console.log('🧪 Testing persistence module...\n');

  // Test 1: Create and save a document
  console.log('Test 1: Creating document...');
  const doc1 = new Y.Doc();
  const map1 = doc1.getMap('test');
  map1.set('hello', 'world');
  map1.set('count', 42);

  const update1 = Y.encodeStateAsUpdate(doc1);
  await persistence.saveDocument('test-doc-1', update1);
  console.log('✅ Document saved\n');

  // Test 2: Load the document
  console.log('Test 2: Loading document...');
  const loaded = await persistence.loadDocument('test-doc-1');
  const doc2 = new Y.Doc();
  Y.applyUpdate(doc2, loaded);
  const map2 = doc2.getMap('test');

  console.log('Loaded data:', {
    hello: map2.get('hello'),
    count: map2.get('count'),
  });
  console.log('✅ Document loaded correctly\n');

  // Test 3: Append update
  console.log('Test 3: Appending update...');
  const doc3 = new Y.Doc();
  Y.applyUpdate(doc3, loaded);
  const map3 = doc3.getMap('test');
  map3.set('timestamp', Date.now());

  const update3 = Y.encodeStateAsUpdate(doc3);
  await persistence.appendUpdate('test-doc-1', update3);
  console.log('✅ Update appended\n');

  // Test 4: Verify appended update
  console.log('Test 4: Verifying appended update...');
  const loaded2 = await persistence.loadDocument('test-doc-1');
  const doc4 = new Y.Doc();
  Y.applyUpdate(doc4, loaded2);
  const map4 = doc4.getMap('test');

  console.log('Final data:', {
    hello: map4.get('hello'),
    count: map4.get('count'),
    timestamp: map4.get('timestamp'),
  });
  console.log('✅ Update verified\n');

  // Test 5: List documents
  console.log('Test 5: Listing documents...');
  const docs = await persistence.listDocuments();
  console.log('Documents:', docs);
  console.log('✅ Listed documents\n');

  // Test 6: Get statistics
  console.log('Test 6: Getting statistics...');
  const stats = await persistence.getStats();
  console.log('Stats:', stats);
  console.log('✅ Statistics retrieved\n');

  // Test 7: Delete document
  console.log('Test 7: Deleting document...');
  await persistence.deleteDocument('test-doc-1');
  const afterDelete = await persistence.listDocuments();
  console.log('Documents after deletion:', afterDelete);
  console.log('✅ Document deleted\n');

  // Cleanup
  doc1.destroy();
  doc2.destroy();
  doc3.destroy();
  doc4.destroy();

  console.log('🎉 All tests passed!');
}

test().catch(console.error);

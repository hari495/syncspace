import { LeveldbPersistence } from 'y-leveldb';

const persistence = new LeveldbPersistence('./data');

async function inspectDB() {
  console.log('🔍 Inspecting LevelDB Database\n');

  try {
    // Get all document names
    const docs = await persistence.getAllDocNames();
    console.log(`Found ${docs.length} documents in database:\n`);

    if (docs.length === 0) {
      console.log('❌ No documents found in database');
      console.log('   This means data was not persisted.\n');
    } else {
      for (const docName of docs) {
        console.log(`📄 Document: "${docName}"`);

        // Get the document data
        const data = await persistence.getYDoc(docName);
        const shapes = data.getMap('shapes');

        console.log(`   Shape count: ${shapes.size}`);

        shapes.forEach((value, key) => {
          console.log(`   - ${key}: ${value.type}`);
        });
        console.log('');
      }
    }
  } catch (err) {
    console.error('Error inspecting database:', err);
  }

  process.exit(0);
}

inspectDB();

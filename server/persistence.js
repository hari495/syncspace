/**
 * Simple file-based persistence for Y.js documents
 * No native dependencies - works on any platform including Render
 */

import * as Y from 'yjs';
import * as fs from 'fs/promises';
import * as path from 'path';

const PERSISTENCE_DIR = './data';

/**
 * Ensure persistence directory exists
 */
async function ensureDir() {
  try {
    await fs.mkdir(PERSISTENCE_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Get file path for a document
 */
function getDocPath(docName) {
  // Sanitize document name to prevent path traversal
  const sanitized = docName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(PERSISTENCE_DIR, `${sanitized}.yjs`);
}

/**
 * Load a Y.js document from disk
 * Returns the document state as Uint8Array, or null if not found
 */
export async function loadDocument(docName) {
  const docPath = getDocPath(docName);

  try {
    const data = await fs.readFile(docPath);
    console.log(`📂 Loaded document: ${docName} (${data.length} bytes)`);
    return new Uint8Array(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`📄 New document: ${docName}`);
      return null;
    }
    console.error(`❌ Error loading document ${docName}:`, err);
    return null;
  }
}

/**
 * Save a Y.js document to disk
 */
export async function saveDocument(docName, update) {
  await ensureDir();
  const docPath = getDocPath(docName);

  try {
    // Create a temporary document to merge all updates
    const doc = new Y.Doc();
    Y.applyUpdate(doc, update);

    // Get the full state vector
    const state = Y.encodeStateAsUpdate(doc);

    // Write to disk
    await fs.writeFile(docPath, state);
    console.log(`💾 Saved document: ${docName} (${state.length} bytes)`);

    doc.destroy();
  } catch (err) {
    console.error(`❌ Error saving document ${docName}:`, err);
  }
}

/**
 * Append an update to a document
 * This is more efficient than rewriting the entire document each time
 */
export async function appendUpdate(docName, update) {
  await ensureDir();
  const docPath = getDocPath(docName);

  try {
    // Load existing document
    const existing = await loadDocument(docName);

    // Merge updates
    const doc = new Y.Doc();
    if (existing) {
      Y.applyUpdate(doc, existing);
    }
    Y.applyUpdate(doc, update);

    // Save merged state
    const state = Y.encodeStateAsUpdate(doc);
    await fs.writeFile(docPath, state);

    console.log(`💾 Updated document: ${docName} (${state.length} bytes)`);

    doc.destroy();
  } catch (err) {
    console.error(`❌ Error appending update to ${docName}:`, err);
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(docName) {
  const docPath = getDocPath(docName);

  try {
    await fs.unlink(docPath);
    console.log(`🗑️  Deleted document: ${docName}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`❌ Error deleting document ${docName}:`, err);
    }
  }
}

/**
 * List all persisted documents
 */
export async function listDocuments() {
  await ensureDir();

  try {
    const files = await fs.readdir(PERSISTENCE_DIR);
    return files
      .filter(f => f.endsWith('.yjs'))
      .map(f => f.replace('.yjs', ''));
  } catch (err) {
    console.error('❌ Error listing documents:', err);
    return [];
  }
}

/**
 * Get storage statistics
 */
export async function getStats() {
  const docs = await listDocuments();
  let totalSize = 0;

  for (const docName of docs) {
    const docPath = getDocPath(docName);
    try {
      const stats = await fs.stat(docPath);
      totalSize += stats.size;
    } catch (err) {
      // Ignore
    }
  }

  return {
    documentCount: docs.length,
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
  };
}

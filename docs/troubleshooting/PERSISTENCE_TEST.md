# Manual Persistence Test

Follow these steps to verify that persistence is working correctly:

## Step 1: Start the server
```bash
cd server
node index.js
```

You should see:
```
SyncSpace WebSocket server running on ws://localhost:1234
📁 Persistence enabled - data stored in ./data directory
```

## Step 2: Open the client in your browser
```bash
cd client
npm run dev
```

Open http://localhost:5174/ in your browser

## Step 3: Draw something
1. Create a rectangle
2. Add some text
3. Draw with the pencil tool
4. Arrange them however you like

## Step 4: Stop the server
Go to the terminal running the server and press `Ctrl+C` to stop it.

## Step 5: Restart the server
```bash
node index.js
```

## Step 6: Refresh the browser
Refresh your browser (or open a new tab to http://localhost:5174/)

## Expected Result
✅ **All your shapes should still be there!**

The shapes you drew in Step 3 should automatically reload from the persistent storage.

---

## How it works

- All Y.js document updates are automatically saved to a LevelDB database in the `./data` directory
- When the server restarts, it loads the saved state from disk
- New clients connecting after a restart will receive the persisted data
- Updates are saved in real-time, so even if the server crashes, you won't lose work

## Data Storage

- Location: `server/data/` directory
- Database: LevelDB (embedded key-value store)
- Documents are organized by room name (default: "syncspace-room")

## Clean Start

If you ever want to start fresh with no persisted data:
```bash
rm -rf server/data/
```

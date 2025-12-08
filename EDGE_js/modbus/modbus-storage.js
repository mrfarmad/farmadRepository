const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class ModbusStorage {
  constructor(dbPath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`CREATE TABLE IF NOT EXISTS snapshots(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      payload TEXT NOT NULL
    );`);
    this.insertStmt = this.db.prepare('INSERT INTO snapshots(device_id, ts, payload) VALUES (?, ?, ?)');
  }

  persistSnapshot(deviceId, data) {
    try {
      this.insertStmt.run(String(deviceId), Date.now(), JSON.stringify(data));
    } catch (err) {
      console.error('Failed to persist snapshot', err);
    }
  }

  close() {
    this.db?.close();
  }
}

module.exports = { ModbusStorage };

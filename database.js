const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Make sure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Connect to SQLite database
const dbPath = path.join(dataDir, 'userStats.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize the database
function initDatabase() {
  try {
    // Create daily stats table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        connections INTEGER DEFAULT 0
      )
    `).run();
    
    console.log("Database initialized successfully");
    return Promise.resolve();
  } catch (err) {
    console.error("Error creating tables:", err);
    return Promise.reject(err);
  }
}

// Get today's date in YYYY-MM-DD format
function getToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Track a new connection
function trackConnection() {
  const today = getToday();
  
  try {
    // Using better-sqlite3's transaction
    const stmt = db.prepare(`
      INSERT INTO daily_stats (date, connections) 
      VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET connections = connections + 1
    `);
    stmt.run(today);
  } catch (err) {
    console.error("Error updating daily stats:", err);
  }
}

// Get daily stats for a date range
function getDailyStats(startDate, endDate) {
  try {
    // First get existing data from database
    const stmt = db.prepare(`
      SELECT date, connections 
      FROM daily_stats 
      WHERE date BETWEEN ? AND ?
      ORDER BY date ASC
    `);
    const existingRows = stmt.all(startDate, endDate);
    
    // Create a map for quick lookup of existing data
    const dataMap = new Map();
    existingRows.forEach(row => {
      dataMap.set(row.date, row.connections);
    });
    
    // Generate all dates in the range
    const result = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const connections = dataMap.get(dateStr) || 0; // Use existing data or 0
      result.push({
        date: dateStr,
        connections: connections
      });
    }
    
    console.log(`Generated ${result.length} records for range ${startDate} to ${endDate} (${existingRows.length} from database)`);
    return Promise.resolve(result);
  } catch (err) {
    console.error("Error getting daily stats:", err);
    return Promise.reject(err);
  }
}

// Get total connections by summing daily stats
function getTotalConnections() {
  try {
    const stmt = db.prepare(`
      SELECT SUM(connections) as total_connections
      FROM daily_stats
    `);
    const result = stmt.get();
    return Promise.resolve(result || { total_connections: 0 });
  } catch (err) {
    console.error("Error getting total connections:", err);
    return Promise.reject(err);
  }
}

// Close database connection
function closeDatabase() {
  try {
    db.close();
  } catch (err) {
    console.error("Error closing database:", err);
  }
}

module.exports = {
  initDatabase,
  trackConnection,
  getDailyStats,
  getTotalConnections,
  closeDatabase
};

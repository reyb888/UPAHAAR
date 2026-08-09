import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'src', 'db', 'upahaar.db');

console.log("Connecting to:", dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Connection error:", err);
        process.exit(1);
    }
    console.log("Connected to database successfully.");
});

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error("Error reading tables:", err);
        db.close();
        return;
    }
    console.log("Tables in database:", tables.map(t => t.name).join(', '));
    
    // Dump users
    db.all("SELECT id, upahaar_id, role, full_name, email FROM users", [], (err, users) => {
        if (err) {
            console.error("Error reading users:", err);
        } else {
            console.log("\n--- Users ---");
            console.table(users);
        }
        
        // Dump access logs
        db.all("SELECT * FROM access_logs", [], (err, logs) => {
            if (err) {
                console.error("Error reading access_logs:", err);
            } else {
                console.log("\n--- Access Logs ---");
                console.table(logs);
            }
            db.close();
        });
    });
});

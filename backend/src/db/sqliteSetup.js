import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let db;

// Query converter for PostgreSQL: replaces '?' with '$1', '$2', etc.
const convertQuery = (sql) => {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
};

import fs from 'fs';

const logDbError = (context, sql, params, err) => {
    try {
        const logPath = path.resolve(__dirname, '..', '..', 'db_errors.log');
        const logMessage = `[${new Date().toISOString()}] ${context} ERROR:\nSQL: ${sql}\nParams: ${JSON.stringify(params)}\nError: ${err.message || err}\n${err.stack || ''}\n\n`;
        fs.appendFileSync(logPath, logMessage);
    } catch (e) {
        console.error("Failed to write to db_errors.log:", e);
    }
    console.error(context, err);
};

if (process.env.DATABASE_URL) {
    console.log('Connecting to Supabase PostgreSQL...');
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    db = {
        run: function(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            pool.query(convertQuery(sql), params || [])
                .then(res => { if (callback) callback.call({ lastID: null, changes: res?.rowCount || 0 }, null); })
                .catch(err => {
                    logDbError("PostgreSQL RUN", sql, params, err);
                    if (callback) callback(err);
                });
        },
        get: function(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            pool.query(convertQuery(sql), params || [])
                .then(res => { if (callback) callback(null, res.rows[0]); })
                .catch(err => {
                    logDbError("PostgreSQL GET", sql, params, err);
                    if (callback) callback(err);
                });
        },
        all: function(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            pool.query(convertQuery(sql), params || [])
                .then(res => { if (callback) callback(null, res.rows); })
                .catch(err => {
                    logDbError("PostgreSQL ALL", sql, params, err);
                    if (callback) callback(err);
                });
        }
    };
} else {
    const dbPath = path.resolve(__dirname, 'upahaar.db');
    const sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening local SQLite database', err.message);
        } else {
            console.log('Connected to local SQLite database.');
        }
    });

    db = {
        run: function(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            sqliteDb.run(sql, params, function(err) {
                if (err) {
                    logDbError("SQLite RUN", sql, params, err);
                }
                if (callback) callback.call(this, err);
            });
        },
        get: function(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            sqliteDb.get(sql, params, function(err, row) {
                if (err) {
                    logDbError("SQLite GET", sql, params, err);
                }
                if (callback) callback(err, row);
            });
        },
        all: function(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            sqliteDb.all(sql, params, function(err, rows) {
                if (err) {
                    logDbError("SQLite ALL", sql, params, err);
                }
                if (callback) callback(err, rows);
            });
        }
    };
}

export const initializeDB = async () => {
    const runCreate = (sql) => {
        return new Promise((resolve, reject) => {
            // Postgres schema adjustments
            if (process.env.DATABASE_URL) {
                sql = sql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            }
            db.run(sql, [], (err) => {
                if (err) console.error("Table setup error:", err);
                resolve();
            });
        });
    };

    // Users Table
    await runCreate(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        upahaar_id TEXT UNIQUE,
        role TEXT CHECK (role IN ('CITIZEN', 'DOCTOR', 'SUPER_ADMIN')),
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        face_photo_url TEXT,
        totp_secret TEXT,
        is_totp_enabled INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Medical Profiles Table
    await runCreate(`CREATE TABLE IF NOT EXISTS medical_profiles (
        user_id TEXT PRIMARY KEY,
        dob TEXT,
        gender TEXT,
        blood_group TEXT,
        height_cm REAL,
        weight_kg REAL,
        chest_size_cm REAL,
        vision_left TEXT,
        vision_right TEXT,
        hearing_status TEXT,
        allergies TEXT, 
        family_history TEXT,
        mental_health TEXT,
        respiratory_disorders TEXT,
        heart_problems TEXT,
        nervous_disorders TEXT,
        identifying_features TEXT,
        emergency_contacts TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Doctor Profiles Table
    await runCreate(`CREATE TABLE IF NOT EXISTS doctor_profiles (
        user_id TEXT PRIMARY KEY,
        job_profile TEXT,
        education TEXT,
        work_experience TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Prescriptions Table
    await runCreate(`CREATE TABLE IF NOT EXISTS prescriptions (
        id TEXT PRIMARY KEY,
        citizen_id TEXT,
        doctor_id TEXT,
        file_url TEXT NOT NULL,
        ai_extracted_data TEXT, 
        medicines TEXT,
        raw_ocr_text TEXT,
        is_fraudulent INTEGER DEFAULT 0,
        fraud_confidence_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (citizen_id) REFERENCES users(id),
        FOREIGN KEY (doctor_id) REFERENCES users(id)
    )`);
    
    // Security Access Logs Table
    await runCreate(`CREATE TABLE IF NOT EXISTS access_logs (
        id TEXT PRIMARY KEY,
        citizen_id TEXT NOT NULL,
        doctor_id TEXT NOT NULL,
        method TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        logged_out_at DATETIME,
        deleted_by_citizen INTEGER DEFAULT 0,
        FOREIGN KEY (citizen_id) REFERENCES users(id),
        FOREIGN KEY (doctor_id) REFERENCES users(id)
    )`);

    // Run migrations to add missing columns to access_logs if table already existed
    if (process.env.DATABASE_URL) {
        await runCreate(`ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS logged_out_at TIMESTAMP`);
        await runCreate(`ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS deleted_by_citizen INTEGER DEFAULT 0`);
    } else {
        await new Promise((resolve) => {
            db.all(`PRAGMA table_info(access_logs)`, (err, rows) => {
                const columns = rows ? rows.map(r => r.name) : [];
                const promises = [];
                if (!columns.includes('logged_out_at')) {
                    promises.push(new Promise((res) => db.run(`ALTER TABLE access_logs ADD COLUMN logged_out_at DATETIME`, () => res())));
                }
                if (!columns.includes('deleted_by_citizen')) {
                    promises.push(new Promise((res) => db.run(`ALTER TABLE access_logs ADD COLUMN deleted_by_citizen INTEGER DEFAULT 0`, () => res())));
                }
                Promise.all(promises).then(() => resolve());
            });
        });
    }

    // Revoked Access (Blocklist) Table
    await runCreate(`CREATE TABLE IF NOT EXISTS revoked_access (
        citizen_id TEXT NOT NULL,
        doctor_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (citizen_id, doctor_id),
        FOREIGN KEY (citizen_id) REFERENCES users(id),
        FOREIGN KEY (doctor_id) REFERENCES users(id)
    )`);
    
    // Vitals Tracker Table
    await runCreate(`CREATE TABLE IF NOT EXISTS vitals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        heart_rate REAL,
        sugar_level REAL,
        bp_systolic REAL,
        bp_diastolic REAL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    
    // Password Reset Tokens Table
    await runCreate(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    console.log('Database tables verified/created.');
};

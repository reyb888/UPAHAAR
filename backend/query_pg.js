import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log("Connecting to PG...");
        
        console.log("\n--- Medical Profiles Table Schema ---");
        const schema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'medical_profiles'");
        console.table(schema.rows);

        console.log("\n--- Revoked Access (Blocks) ---");
        const revoked = await pool.query("SELECT * FROM revoked_access");
        console.table(revoked.rows);

        console.log("\n--- Access Logs ---");
        const logs = await pool.query("SELECT id, citizen_id, doctor_id, method, status, created_at, logged_out_at, deleted_by_citizen FROM access_logs ORDER BY created_at DESC LIMIT 15");
        console.table(logs.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

main();

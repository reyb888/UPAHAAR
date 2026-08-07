import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function clearData() {
    const client = await pool.connect();
    try {
        // Delete in order respecting foreign key constraints
        console.log('Clearing vitals...');
        await client.query('DELETE FROM vitals');
        
        console.log('Clearing prescriptions...');
        await client.query('DELETE FROM prescriptions');
        
        console.log('Clearing access_logs...');
        await client.query('DELETE FROM access_logs');
        
        console.log('Clearing revoked_access...');
        await client.query('DELETE FROM revoked_access');
        
        console.log('Clearing medical_profiles...');
        await client.query('DELETE FROM medical_profiles');
        
        console.log('Clearing users...');
        await client.query('DELETE FROM users');
        
        console.log('\n✅ All user data cleared from public tables. Fresh start ready!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

clearData();

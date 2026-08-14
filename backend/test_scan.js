import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const payload = {
    user: {
        id: '424eed12-0fb6-4e6d-a855-452312b6e8f3',
        role: 'DOCTOR',
        upahaar_id: 'UPHR-7527080293'
    }
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' });
console.log("Generated JWT Token:", token);

async function testScan() {
    const url = 'http://localhost:5000/api/doctors/scan/UPHR-1115860301?source=manual';
    try {
        console.log(`Sending GET request to ${url}...`);
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const status = response.status;
        const text = await response.text();
        console.log("Response Status:", status);
        console.log("Response Body:", text);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testScan();

import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Simulating Login for johndon@gmail.com...");
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                upahaar_id: 'johndon@gmail.com',
                password: 'password123'
            })
        });

        console.log("Login Status:", loginRes.status);
        const loginData = await loginRes.json();
        console.log("Login Response:", loginData);

        if (!loginRes.ok) {
            console.error("Login failed!");
            return;
        }

        const token = loginData.token;
        console.log("\nSimulating Scan Request for UPHR-1115860301...");
        const scanRes = await fetch('http://localhost:5000/api/doctors/scan/UPHR-1115860301?source=manual', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Scan Status:", scanRes.status);
        const scanData = await scanRes.json();
        console.log("Scan Response:", scanData);

    } catch (e) {
        console.error("Error:", e);
    }
}

main();

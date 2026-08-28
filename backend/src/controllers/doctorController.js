import { db } from '../db/sqliteSetup.js';
import { generateGeminiContent } from '../utils/gemini.js';
import { v4 as uuidv4 } from 'uuid';

export const scanPatientQr = (req, res) => {
    const doctorId = req.user.id;
    const { upahaar_id } = req.params;
    const { source } = req.query;

    if (!upahaar_id) {
        return res.status(400).json({ message: 'UPAHAAR ID is required' });
    }

    const targetId = upahaar_id.trim().toUpperCase();

    // 1. Check if Doctor is blocked by this citizen
    db.get(`SELECT * FROM revoked_access r 
            JOIN users u ON u.id = r.citizen_id
            WHERE u.upahaar_id = ? AND r.doctor_id = ?`, [targetId, doctorId], (err, revoked) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (revoked) {
            // Revocation is not permanent: a QR scan is fresh consent, and manual/face
            // lookups fall through to a new PENDING request the patient can re-approve.
            console.log(`[ACCESS] Doctor ${doctorId} had access revoked by patient ${targetId}. Continuing with ${source || 'manual'} flow (revocation is not permanent).`);
        }

        // 2. Find the citizen's profile
        db.get(`SELECT u.id AS citizen_user_id, u.full_name, u.email, u.phone, u.upahaar_id, u.face_photo_url, m.* 
                FROM users u 
                LEFT JOIN medical_profiles m ON u.id = m.user_id 
                WHERE u.upahaar_id = ? AND u.role = 'CITIZEN'`, 
        [targetId], (err, patient) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (!patient) return res.status(404).json({ message: 'Patient not found or invalid QR' });

            const citizenId = patient.citizen_user_id;

            if (source === 'qr') {
                // 3. QR Scan: Bypass approval, auto-approved, return full data
                db.all(`SELECT * FROM prescriptions WHERE citizen_id = ? ORDER BY created_at DESC`, [citizenId], (err, prescriptions) => {
                    if (err) return res.status(500).json({ message: 'Error fetching patient timeline' });

                    db.all(`SELECT * FROM vitals WHERE user_id = ? ORDER BY recorded_at ASC`, [citizenId], (err, vitals) => {
                        if (err) return res.status(500).json({ message: 'Error fetching patient vitals' });

                        const logId = uuidv4();
                        console.log(`[ACCESS_LOG] QR SCAN auto-approved. Inserting logId=${logId}, citizenId=${citizenId}, doctorId=${doctorId}`);
                        db.run(`INSERT INTO access_logs (id, citizen_id, doctor_id, method, status) VALUES (?, ?, ?, ?, ?)`,
                            [logId, citizenId, doctorId, 'QR_SCAN', 'APPROVED'], (logErr) => {
                                if (logErr) console.error("[ACCESS_LOG] Failed to log access event:", logErr);
                            }
                        );

                        res.json({
                            status: 'APPROVED',
                            method: 'QR_SCAN',
                            log_id: logId,
                            patient,
                            timeline: prescriptions,
                            vitals: vitals || []
                        });
                    });
                });
            } else {
                // 4. Manual search or face recognition: check active approved session first (expires in 30 minutes)
                db.get(`
                    SELECT * FROM access_logs 
                    WHERE doctor_id = ? AND citizen_id = ? AND logged_out_at IS NULL AND status IN ('APPROVED', 'ACKNOWLEDGED', 'QR_SCAN')
                    ORDER BY created_at DESC LIMIT 1
                `, [doctorId, citizenId], (err, activeLog) => {
                    if (err) return res.status(500).json({ message: 'Database error' });

                    const now = new Date();
                    const isSessionValid = activeLog && (now - new Date(activeLog.created_at) < 30 * 60 * 1000);

                    if (isSessionValid) {
                        // Return the active session immediately!
                        db.all(`SELECT * FROM prescriptions WHERE citizen_id = ? ORDER BY created_at DESC`, [citizenId], (err, prescriptions) => {
                            if (err) return res.status(500).json({ message: 'Error fetching patient timeline' });

                            db.all(`SELECT * FROM vitals WHERE user_id = ? ORDER BY recorded_at ASC`, [citizenId], (err, vitals) => {
                                if (err) return res.status(500).json({ message: 'Error fetching patient vitals' });

                                res.json({
                                    status: 'APPROVED',
                                    method: activeLog.method,
                                    log_id: activeLog.id,
                                    patient,
                                    timeline: prescriptions,
                                    vitals: vitals || []
                                });
                            });
                        });
                    } else {
                        // If there is an expired activeLog, close it at its expiry time (30 minutes after created_at)
                        if (activeLog) {
                            const expiryTime = new Date(new Date(activeLog.created_at).getTime() + 30 * 60 * 1000).toISOString();
                            db.run(`UPDATE access_logs SET logged_out_at = ? WHERE id = ?`, [expiryTime, activeLog.id], (updErr) => {
                                if (updErr) console.error("[ACCESS_LOG] Failed to close expired log:", updErr);
                            });
                        }

                        // Create a new PENDING request
                        const logId = uuidv4();
                        const method = source === 'face' ? 'FACE_SCAN' : 'MANUAL_LOOKUP';
                        console.log(`[ACCESS_LOG] ${method} pending. Inserting logId=${logId}, citizenId=${citizenId}, doctorId=${doctorId}`);
                        
                        db.run(`INSERT INTO access_logs (id, citizen_id, doctor_id, method, status) VALUES (?, ?, ?, ?, ?)`,
                            [logId, citizenId, doctorId, method, 'PENDING'], (logErr) => {
                                if (logErr) {
                                    console.error("[ACCESS_LOG] Failed to log access event:", logErr);
                                    return res.status(500).json({ message: 'Database error logging access request' });
                                }
                                
                                res.json({
                                    status: 'PENDING',
                                    message: 'Access request sent. Awaiting patient approval.',
                                    request_id: logId,
                                    patient: {
                                        full_name: patient.full_name,
                                        upahaar_id: patient.upahaar_id
                                    }
                                });
                            }
                        );
                    }
                });
            }
        });
    });
};

export const searchPatientHistoryAI = async (req, res) => {
    const { upahaar_id } = req.params;
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_BACKUP_API_KEY) {
        return res.status(500).json({ message: 'AI processing is disabled (No API Key)' });
    }

    const doctorId = req.user.id;
    const targetId = upahaar_id.trim().toUpperCase();

    db.get(`SELECT * FROM revoked_access r JOIN users u ON u.id = r.citizen_id WHERE u.upahaar_id = ? AND r.doctor_id = ?`, [targetId, doctorId], (err, revoked) => {
        if (err || revoked) return res.status(403).json({ message: 'Consent Revoked by Patient. Access Denied.' });

        db.get(`SELECT id, full_name FROM users WHERE upahaar_id = ? AND role = 'CITIZEN'`, [targetId], (err, patient) => {
        if (err || !patient) return res.status(404).json({ message: 'Patient not found' });

        db.all(`SELECT created_at, ai_extracted_data, medicines, raw_ocr_text FROM prescriptions WHERE citizen_id = ? ORDER BY created_at ASC`, [patient.id], async (err, prescriptions) => {
            if (err) return res.status(500).json({ message: 'Error fetching history' });
            
            if (prescriptions.length === 0) {
                return res.json({ summary: "This patient has no uploaded medical records to search through." });
            }

            // Compile history into a prompt string
            let historyText = `Patient Name: ${patient.full_name}\n\n`;
            prescriptions.forEach((p, index) => {
                historyText += `--- Record ${index + 1} (Date: ${new Date(p.created_at).toLocaleDateString()}) ---\n`;
                historyText += `AI Summary: ${p.ai_extracted_data || 'N/A'}\n`;
                historyText += `Medicines: ${p.medicines || 'N/A'}\n`;
                historyText += `Original Text: ${p.raw_ocr_text || 'N/A'}\n\n`;
            });

            try {
                const prompt = `You are an expert medical AI assistant.
A doctor is searching this patient's medical history for the following condition/disease: "${query}"

Here is the patient's entire documented medical history (chronological order):
${historyText}

Based ONLY on the provided history:
1. Has the patient ever had anything related to the disease "${query}"?
2. If so, provide a concise summary of when it happened, what the diagnosis was, and what specific medications were given for it.
3. If there is NO mention or relation to "${query}" in the history, clearly state that there is no record of it.

Do not invent any information. Be direct and professional.`;

                const result = await generateGeminiContent(prompt, { model: "gemini-2.5-flash" });
                const response = await result.response;
                
                res.json({ summary: response.text().trim() });

            } catch (error) {
                console.error("Gemini AI Search Error:", error);
                res.status(500).json({ message: 'Failed to process AI search' });
            }
        });
    });
    });
};

export const scanPatientFace = async (req, res) => {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
        return res.status(400).json({ message: 'Face image is required' });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_BACKUP_API_KEY) {
        return res.status(500).json({ message: 'AI processing is disabled (No API Key)' });
    }

    // Strip "data:image/...;base64," if present
    const targetBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const doctorId = req.user.id;

    db.all(`SELECT id, upahaar_id, full_name, face_photo_url FROM users WHERE role = 'CITIZEN' AND face_photo_url IS NOT NULL`, async (err, citizens) => {
        if (err) return res.status(500).json({ message: 'Database error fetching citizens' });
        
        if (citizens.length === 0) {
            return res.status(404).json({ message: 'No citizens registered with face photos.' });
        }

        try {
            let prompt = `You are a highly secure forensic facial recognition system.
I am providing you with one TARGET face image (the first image), followed by a database of ${citizens.length} KNOWN faces.

Your job is to identify which KNOWN face matches the TARGET face.
Respond ONLY with the exact UPAHAAR ID of the matched citizen in raw JSON format like this: {"match": "UPHR-XXXXXXXXXX"}
If there is no match or you are unsure, respond with {"match": null}
`;

            const contents = [
                prompt,
                {
                    inlineData: { data: targetBase64, mimeType: 'image/jpeg' }
                }
            ];

            for (const citizen of citizens) {
                const base64Data = citizen.face_photo_url.replace(/^data:image\/\w+;base64,/, "");
                contents.push(`\n\n--- KNOWN CITIZEN ID: ${citizen.upahaar_id} ---\n`);
                contents.push({
                    inlineData: { data: base64Data, mimeType: 'image/jpeg' }
                });
            }

            const result = await generateGeminiContent(contents, { model: "gemini-2.5-flash" });
            const responseText = await result.response.text();
            
            try {
                // Strip markdown backticks if Gemini added them
                const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonResponse = JSON.parse(cleanJson);
                
                if (jsonResponse.match) {
                    const matchedCitizen = citizens.find(c => c.upahaar_id === jsonResponse.match);
                    if (matchedCitizen) {
                        const logId = uuidv4();
                        const citizenId = matchedCitizen.id || matchedCitizen.user_id;
                        console.log(`[ACCESS_LOG] Face Scan - Inserting logId=${logId}, citizenId=${citizenId}, doctorId=${doctorId}`);
                        db.run(`INSERT INTO access_logs (id, citizen_id, doctor_id, method, status) VALUES (?, ?, ?, ?, ?)`,
                            [logId, citizenId, doctorId, 'FACE_SCAN', 'PENDING'], (err) => {
                                if (err) console.error("[ACCESS_LOG] Face Scan - Failed to log access event:", err);
                                else console.log(`[ACCESS_LOG] Face Scan - Successfully logged access event: ${logId}`);
                            }
                        );
                        return res.json({ upahaar_id: jsonResponse.match, full_name: matchedCitizen.full_name, request_id: logId, status: 'PENDING' });
                    }
                    return res.status(404).json({ message: 'No matching face found in the database.' });
                } else {
                    return res.status(404).json({ message: 'No matching face found in the database.' });
                }
            } catch (parseError) {
                console.error("Failed to parse Gemini response:", responseText);
                return res.status(500).json({ message: 'AI returned invalid response format.' });
            }

        } catch (error) {
            console.error("Gemini AI Face Scan Error:", error);
            res.status(500).json({ message: 'Failed to process AI face scan' });
        }
    });
};

export const checkAccessStatus = (req, res) => {
    const doctorId = req.user.id;
    const { request_id } = req.params;

    db.get(`SELECT * FROM access_logs WHERE id = ? AND doctor_id = ?`, [request_id, doctorId], (err, log) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!log) return res.status(404).json({ message: 'Access request not found' });

        if (log.status === 'APPROVED' || log.status === 'ACKNOWLEDGED') {
            // Fetch and return the full patient data
            db.get(`SELECT u.id AS citizen_user_id, u.full_name, u.email, u.phone, u.upahaar_id, u.face_photo_url, m.* 
                    FROM users u 
                    LEFT JOIN medical_profiles m ON u.id = m.user_id 
                    WHERE u.id = ? AND u.role = 'CITIZEN'`, 
            [log.citizen_id], (err, patient) => {
                if (err || !patient) return res.status(500).json({ message: 'Error fetching patient profile' });

                const citizenId = patient.citizen_user_id;

                db.all(`SELECT * FROM prescriptions WHERE citizen_id = ? ORDER BY created_at DESC`, [citizenId], (err, prescriptions) => {
                    if (err) return res.status(500).json({ message: 'Error fetching patient timeline' });

                    db.all(`SELECT * FROM vitals WHERE user_id = ? ORDER BY recorded_at ASC`, [citizenId], (err, vitals) => {
                        if (err) return res.status(500).json({ message: 'Error fetching patient vitals' });

                        res.json({
                            status: 'APPROVED',
                            method: log.method,
                            log_id: log.id,
                            patient,
                            timeline: prescriptions,
                            vitals: vitals || []
                        });
                    });
                });
            });
        } else if (log.status === 'REVOKED') {
            res.json({ status: 'REVOKED', message: 'Access request was revoked/denied by the patient.' });
        } else {
            res.json({ status: 'PENDING', message: 'Awaiting patient approval.' });
        }
    });
};

export const closeAccess = (req, res) => {
    const doctorId = req.user.id;
    const { log_id } = req.body;

    if (!log_id) {
        return res.status(400).json({ message: 'Log ID is required' });
    }

    db.run(`
        UPDATE access_logs 
        SET logged_out_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND doctor_id = ? AND logged_out_at IS NULL
    `, [log_id, doctorId], function(err) {
        if (err) {
            console.error("[CLOSE_ACCESS] Error closing access:", err);
            return res.status(500).json({ message: 'Error closing access session' });
        }
        res.json({ message: 'Access session closed successfully' });
    });
};

export const getDoctorProfile = (req, res) => {
    const doctorId = req.user.id;
    db.get(`
        SELECT u.full_name, u.email, u.phone, u.upahaar_id, u.face_photo_url, d.job_profile, d.education, d.work_experience
        FROM users u
        LEFT JOIN doctor_profiles d ON u.id = d.user_id
        WHERE u.id = ? AND u.role = 'DOCTOR'
    `, [doctorId], (err, profile) => {
        if (err || !profile) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }
        res.json(profile);
    });
};

export const updateDoctorProfile = (req, res) => {
    const doctorId = req.user.id;
    const { full_name, face_photo_url, job_profile, education, work_experience } = req.body;

    if (full_name) {
        db.run(`UPDATE users SET full_name = ? WHERE id = ?`, [full_name, doctorId], (err) => {
            if (err) console.error("Error updating doctor name:", err.message);
        });
    }

    if (face_photo_url) {
        db.run(`UPDATE users SET face_photo_url = ? WHERE id = ?`, [face_photo_url, doctorId], (err) => {
            if (err) console.error("Error updating doctor photo:", err.message);
        });
    }

    const workExpStr = typeof work_experience === 'string' ? work_experience : JSON.stringify(work_experience || []);

    db.run(`
        INSERT INTO doctor_profiles (user_id, job_profile, education, work_experience)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE SET
            job_profile = COALESCE(EXCLUDED.job_profile, doctor_profiles.job_profile),
            education = COALESCE(EXCLUDED.education, doctor_profiles.education),
            work_experience = COALESCE(EXCLUDED.work_experience, doctor_profiles.work_experience)
    `, [doctorId, job_profile || null, education || null, workExpStr], function(err) {
        if (err) {
            console.error("Error updating doctor profile:", err);
            return res.status(500).json({ message: 'Error updating profile', error: err.message });
        }
        res.json({ message: 'Profile updated successfully' });
    });
};

export const getDoctorAccessedHistory = (req, res) => {
    const doctorId = req.user.id;
    db.all(`
        SELECT a.id, a.method, a.status, a.created_at, a.logged_out_at,
               u.full_name as patient_name, u.upahaar_id as patient_upahaar_id, u.face_photo_url as patient_face_photo
        FROM access_logs a
        JOIN users u ON a.citizen_id = u.id
        WHERE a.doctor_id = ?
        ORDER BY a.created_at DESC
    `, [doctorId], (err, logs) => {
        if (err) {
            console.error('[DOCTOR_ACCESSED_HISTORY] Error fetching history:', err);
            return res.status(500).json({ message: 'Error fetching accessed history' });
        }
        res.json({ history: logs || [] });
    });
};

export const getAccessiblePatients = (req, res) => {
    const doctorId = req.user.id;
    db.all(`
        SELECT 
            u.id as citizen_user_id,
            u.full_name,
            u.upahaar_id,
            u.email,
            u.phone,
            u.face_photo_url,
            m.blood_group,
            m.dob,
            m.gender,
            m.allergies,
            MAX(a.created_at) as last_accessed_at,
            a.method,
            a.status as access_status,
            a.logged_out_at
        FROM access_logs a
        JOIN users u ON a.citizen_id = u.id
        LEFT JOIN medical_profiles m ON u.id = m.user_id
        WHERE a.doctor_id = ? AND a.status IN ('APPROVED', 'ACKNOWLEDGED', 'QR_SCAN')
        GROUP BY u.id
        ORDER BY last_accessed_at DESC
    `, [doctorId], (err, patients) => {
        if (err) {
            console.error('[ACCESSIBLE_PATIENTS] Error fetching patients:', err);
            return res.status(500).json({ message: 'Error fetching accessible patients' });
        }
        res.json({ patients: patients || [] });
    });
};

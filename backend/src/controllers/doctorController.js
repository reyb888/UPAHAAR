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

    // Fetch all access logs for this doctor first
    const sqlLogs = `
        SELECT 
            u.id as citizen_user_id,
            COALESCE(NULLIF(u.full_name, ''), 'Patient ' || u.upahaar_id) as full_name,
            u.upahaar_id,
            u.email,
            u.phone,
            u.face_photo_url,
            m.blood_group,
            m.dob,
            m.gender,
            m.allergies,
            a.id as access_log_id,
            a.method,
            a.status as access_status,
            a.created_at as last_accessed_at,
            a.logged_out_at
        FROM access_logs a
        JOIN users u ON a.citizen_id = u.id
        LEFT JOIN medical_profiles m ON u.id = m.user_id
        WHERE a.doctor_id = ?
        ORDER BY a.created_at DESC
    `;

    db.all(sqlLogs, [doctorId], (err, logRows) => {
        if (err) {
            console.error('[ACCESSIBLE_PATIENTS] Error fetching access logs:', err);
            logRows = [];
        }

        // Deduplicate logs by citizen_user_id (getting most recent log per citizen)
        const logMap = new Map();
        (logRows || []).forEach(row => {
            if (!logMap.has(row.citizen_user_id)) {
                logMap.set(row.citizen_user_id, row);
            }
        });

        // Also fetch all registered citizens as fallbacks if not in logs
        db.all(`
            SELECT 
                u.id as citizen_user_id,
                COALESCE(NULLIF(u.full_name, ''), 'Patient ' || u.upahaar_id) as full_name,
                u.upahaar_id,
                u.email,
                u.phone,
                u.face_photo_url,
                m.blood_group,
                m.dob,
                m.gender,
                m.allergies
            FROM users u
            LEFT JOIN medical_profiles m ON u.id = m.user_id
            WHERE u.role = 'CITIZEN'
            ORDER BY u.full_name ASC
        `, [], (err, allCitizens) => {
            if (err) {
                allCitizens = [];
            }

            // Combine logMap citizens first, then remaining citizens with NO_ACCESS status
            const finalPatients = Array.from(logMap.values());
            const accessedIds = new Set(finalPatients.map(p => p.citizen_user_id));

            (allCitizens || []).forEach(citizen => {
                if (!accessedIds.has(citizen.citizen_user_id)) {
                    finalPatients.push({
                        ...citizen,
                        access_status: 'NO_ACCESS',
                        last_accessed_at: null,
                        logged_out_at: null
                    });
                }
            });

            res.json({ patients: finalPatients });
        });
    });
};

export const getPatientDetailsForDoctor = (req, res) => {
    const { upahaar_id } = req.params;
    const doctorId = req.user.id;

    if (!upahaar_id) {
        return res.status(400).json({ message: 'UPAHAAR ID is required' });
    }

    const targetId = upahaar_id.trim().toUpperCase();

    db.get(`
        SELECT u.id AS citizen_user_id, COALESCE(NULLIF(u.full_name, ''), 'Patient ' || u.upahaar_id) as full_name, u.email, u.phone, u.upahaar_id, u.face_photo_url, m.* 
        FROM users u 
        LEFT JOIN medical_profiles m ON u.id = m.user_id 
        WHERE u.upahaar_id = ? AND u.role = 'CITIZEN'
    `, [targetId], (err, patient) => {
        if (err || !patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const citizenId = patient.citizen_user_id;

        // Verify doctor has active access log for this citizen
        db.get(`
            SELECT * FROM access_logs 
            WHERE doctor_id = ? AND citizen_id = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [doctorId, citizenId], (err, log) => {
            if (log) {
                const isRevoked = log.status === 'REVOKED' || log.status === 'LOGGED_OUT' || log.logged_out_at !== null;
                if (isRevoked) {
                    return res.status(403).json({ 
                        message: 'Access to this patient profile has been revoked by the patient or emergency access session has ended.' 
                    });
                }
            }

            db.all(`SELECT * FROM prescriptions WHERE citizen_id = ? ORDER BY created_at DESC`, [citizenId], (err, prescriptions) => {
                db.all(`SELECT * FROM vitals WHERE user_id = ? ORDER BY recorded_at ASC`, [citizenId], (err, vitals) => {
                    db.all(`
                        SELECT a.id, a.method, a.status, a.created_at, a.logged_out_at, u.full_name as doctor_name, u.upahaar_id as doctor_upahaar_id
                        FROM access_logs a
                        JOIN users u ON a.doctor_id = u.id
                        WHERE a.citizen_id = ?
                        ORDER BY a.created_at DESC
                    `, [citizenId], (err, notifications) => {
                        res.json({
                            status: 'APPROVED',
                            patient,
                            timeline: prescriptions || [],
                            vitals: vitals || [],
                            notifications: notifications || []
                        });
                    });
                });
            });
        });
    });
};

// ==========================================
// APPOINTMENT SCHEDULER CONTROLLERS
// ==========================================

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const cleanStr = timeStr.trim();
    const parts = cleanStr.split(' ');
    const time = parts[0];
    const modifier = parts[1];
    let [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours)) hours = 0;
    if (isNaN(minutes)) minutes = 0;
    if (modifier) {
        const modUpper = modifier.toUpperCase();
        if (modUpper === 'PM' && hours < 12) hours += 12;
        if (modUpper === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
};

export const getRegisteredCitizensList = (req, res) => {
    db.all(`
        SELECT u.id, u.full_name, u.upahaar_id, u.phone, u.email, u.face_photo_url
        FROM users u
        WHERE u.role = 'CITIZEN'
        ORDER BY u.full_name ASC
    `, [], (err, citizens) => {
        if (err) {
            console.error('[CITIZENS_LIST] Error fetching citizens:', err);
            return res.status(500).json({ message: 'Error fetching patients list' });
        }
        res.json({ citizens: citizens || [] });
    });
};

export const getDoctorAppointments = (req, res) => {
    const doctorId = req.user.id;
    const { month, year } = req.query;

    let query = `
        SELECT a.*, 
               u.full_name as patient_name, 
               u.upahaar_id as patient_upahaar_id, 
               u.phone as patient_phone,
               u.email as patient_email
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = ?
    `;
    const params = [doctorId];

    if (month && year) {
        const monthFormatted = String(month).padStart(2, '0');
        query += ` AND a.date LIKE ?`;
        params.push(`${year}-${monthFormatted}-%`);
    }

    query += ` ORDER BY a.date ASC, a.time ASC`;

    db.all(query, params, (err, appointments) => {
        if (err) {
            console.error('[GET_APPOINTMENTS] Error:', err);
            return res.status(500).json({ message: 'Error fetching appointments' });
        }
        res.json({ appointments: appointments || [] });
    });
};

export const createAppointment = (req, res) => {
    const doctorId = req.user.id;
    const { patient_id, title, date, time, duration_minutes, notes, reminder_offset } = req.body;

    if (!patient_id || !title || !date || !time) {
        return res.status(400).json({ message: 'Patient, title, date, and time are required fields.' });
    }

    const duration = parseInt(duration_minutes) || 30;
    const newStart = parseTimeToMinutes(time);
    const newEnd = newStart + duration;

    // Check for overlapping appointments for this doctor on the same date
    db.all(`
        SELECT id, time, duration_minutes, title, status 
        FROM appointments 
        WHERE doctor_id = ? AND date = ? AND status IN ('Scheduled', 'Rescheduled')
    `, [doctorId, date], (err, existing) => {
        if (err) {
            console.error('[CREATE_APPOINTMENT] Overlap check error:', err);
            return res.status(500).json({ message: 'Database error checking conflicts' });
        }

        const overlap = (existing || []).find(appt => {
            const apptStart = parseTimeToMinutes(appt.time);
            const apptEnd = apptStart + (appt.duration_minutes || 30);
            return newStart < apptEnd && newEnd > apptStart;
        });

        if (overlap) {
            return res.status(400).json({ 
                message: `Time slot conflict: Doctor already has "${overlap.title}" scheduled at ${overlap.time}.` 
            });
        }

        const appointmentId = uuidv4();
        db.run(`
            INSERT INTO appointments (id, doctor_id, patient_id, title, date, time, duration_minutes, notes, reminder_offset, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [appointmentId, doctorId, patient_id, title.trim(), date, time, duration, notes || '', reminder_offset || '30m', 'Scheduled'], (err2) => {
            if (err2) {
                console.error('[CREATE_APPOINTMENT] Insert error:', err2);
                return res.status(500).json({ message: 'Failed to create appointment' });
            }

            // Fetch patient name for notification message
            db.get(`SELECT full_name FROM users WHERE id = ?`, [patient_id], (err3, patient) => {
                const patientName = patient ? patient.full_name : 'Patient';
                const notifId = uuidv4();
                const notifTitle = "Appointment Scheduled";
                const notifMessage = `Appointment scheduled with ${patientName} for ${date} at ${time}.`;

                db.run(`
                    INSERT INTO doctor_notifications (id, doctor_id, appointment_id, title, message, type, is_read)
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                `, [notifId, doctorId, appointmentId, notifTitle, notifMessage, 'SCHEDULED'], (notifErr) => {
                    if (notifErr) console.error('[CREATE_APPOINTMENT_NOTIF] Failed:', notifErr);
                });

                res.status(201).json({
                    message: 'Appointment scheduled successfully',
                    appointment_id: appointmentId
                });
            });
        });
    });
};

export const updateAppointment = (req, res) => {
    const doctorId = req.user.id;
    const { id } = req.params;
    const { patient_id, title, date, time, duration_minutes, notes, reminder_offset, status } = req.body;

    if (!patient_id || !title || !date || !time) {
        return res.status(400).json({ message: 'Patient, title, date, and time are required.' });
    }

    const duration = parseInt(duration_minutes) || 30;
    const newStart = parseTimeToMinutes(time);
    const newEnd = newStart + duration;

    // Check for overlap with OTHER appointments
    db.all(`
        SELECT id, time, duration_minutes, title 
        FROM appointments 
        WHERE doctor_id = ? AND date = ? AND id != ? AND status IN ('Scheduled', 'Rescheduled')
    `, [doctorId, date, id], (err, existing) => {
        if (err) return res.status(500).json({ message: 'Database error checking conflicts' });

        const overlap = (existing || []).find(appt => {
            const apptStart = parseTimeToMinutes(appt.time);
            const apptEnd = apptStart + (appt.duration_minutes || 30);
            return newStart < apptEnd && newEnd > apptStart;
        });

        if (overlap) {
            return res.status(400).json({ 
                message: `Time slot conflict: Doctor already has "${overlap.title}" scheduled at ${overlap.time}.` 
            });
        }

        db.get(`SELECT * FROM appointments WHERE id = ? AND doctor_id = ?`, [id, doctorId], (err2, oldAppt) => {
            if (err2 || !oldAppt) return res.status(404).json({ message: 'Appointment not found' });

            const dateOrTimeChanged = oldAppt.date !== date || oldAppt.time !== time;
            const updatedStatus = status || (dateOrTimeChanged ? 'Rescheduled' : oldAppt.status);

            db.run(`
                UPDATE appointments 
                SET patient_id = ?, title = ?, date = ?, time = ?, duration_minutes = ?, notes = ?, reminder_offset = ?, status = ?
                WHERE id = ? AND doctor_id = ?
            `, [patient_id, title.trim(), date, time, duration, notes || '', reminder_offset || '30m', updatedStatus, id, doctorId], (err3) => {
                if (err3) {
                    console.error('[UPDATE_APPOINTMENT] Error:', err3);
                    return res.status(500).json({ message: 'Failed to update appointment' });
                }

                db.get(`SELECT full_name FROM users WHERE id = ?`, [patient_id], (err4, patient) => {
                    const patientName = patient ? patient.full_name : 'Patient';
                    const notifId = uuidv4();
                    const notifTitle = dateOrTimeChanged ? "Appointment Rescheduled" : "Appointment Updated";
                    const notifMessage = dateOrTimeChanged 
                        ? `Your appointment with ${patientName} has been rescheduled to ${date} at ${time}.`
                        : `Details for appointment with ${patientName} on ${date} at ${time} have been updated.`;
                    const notifType = dateOrTimeChanged ? "RESCHEDULED" : "SCHEDULED";

                    db.run(`
                        INSERT INTO doctor_notifications (id, doctor_id, appointment_id, title, message, type, is_read)
                        VALUES (?, ?, ?, ?, ?, ?, 0)
                    `, [notifId, doctorId, id, notifTitle, notifMessage, notifType], (notifErr) => {
                        if (notifErr) console.error('[UPDATE_APPOINTMENT_NOTIF] Failed:', notifErr);
                    });

                    res.json({ message: 'Appointment updated successfully' });
                });
            });
        });
    });
};

export const cancelAppointment = (req, res) => {
    const doctorId = req.user.id;
    const { id } = req.params;

    db.get(`
        SELECT a.*, u.full_name as patient_name 
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.id = ? AND a.doctor_id = ?
    `, [id, doctorId], (err, appt) => {
        if (err || !appt) return res.status(404).json({ message: 'Appointment not found' });

        db.run(`UPDATE appointments SET status = 'Cancelled' WHERE id = ? AND doctor_id = ?`, [id, doctorId], (err2) => {
            if (err2) return res.status(500).json({ message: 'Failed to cancel appointment' });

            const notifId = uuidv4();
            const notifTitle = "Appointment Cancelled";
            const notifMessage = `The appointment with ${appt.patient_name} scheduled for ${appt.date} at ${appt.time} has been cancelled.`;

            db.run(`
                INSERT INTO doctor_notifications (id, doctor_id, appointment_id, title, message, type, is_read)
                VALUES (?, ?, ?, ?, ?, 'CANCELLED', 0)
            `, [notifId, doctorId, id, notifTitle, notifMessage], (notifErr) => {
                if (notifErr) console.error('[CANCEL_NOTIF] Error:', notifErr);
            });

            res.json({ message: 'Appointment cancelled successfully' });
        });
    });
};

// ==========================================
// DOCTOR NOTIFICATIONS CONTROLLERS
// ==========================================

export const getDoctorNotifications = (req, res) => {
    const doctorId = req.user.id;

    // Helper: auto-generate reminder notifications for upcoming appointments if reminder window is reached
    const checkReminders = () => {
        return new Promise((resolve) => {
            db.all(`
                SELECT a.*, u.full_name as patient_name
                FROM appointments a
                JOIN users u ON a.patient_id = u.id
                WHERE a.doctor_id = ? 
                  AND a.status IN ('Scheduled', 'Rescheduled')
                  AND a.reminder_offset IS NOT NULL 
                  AND a.reminder_offset != 'NONE'
            `, [doctorId], (err, appts) => {
                if (err || !appts || appts.length === 0) return resolve();

                const now = new Date();
                const offsetMinutesMap = {
                    '10m': 10,
                    '30m': 30,
                    '1h': 60,
                    '1d': 1440
                };

                const offsetLabelMap = {
                    '10m': '10 minutes',
                    '30m': '30 minutes',
                    '1h': '1 hour',
                    '1d': '1 day'
                };

                const promises = appts.map(appt => {
                    return new Promise((resAppt) => {
                        const offsetMins = offsetMinutesMap[appt.reminder_offset] || 30;
                        const [year, month, day] = appt.date.split('-').map(Number);
                        const startMins = parseTimeToMinutes(appt.time);
                        const hour = Math.floor(startMins / 60);
                        const minute = startMins % 60;

                        const apptDate = new Date(year, month - 1, day, hour, minute);
                        const reminderTime = new Date(apptDate.getTime() - offsetMins * 60 * 1000);

                        // Trigger reminder if current time is past reminder time AND appointment hasn't ended yet (+60m margin)
                        if (now >= reminderTime && now <= new Date(apptDate.getTime() + 60 * 60 * 1000)) {
                            // Check if REMINDER notification already exists for this appointment
                            db.get(`
                                SELECT id FROM doctor_notifications 
                                WHERE doctor_id = ? AND appointment_id = ? AND type = 'REMINDER'
                            `, [doctorId, appt.id], (errNotif, existingNotif) => {
                                if (!errNotif && !existingNotif) {
                                    const notifId = uuidv4();
                                    const notifTitle = "Appointment Reminder";
                                    const labelText = offsetLabelMap[appt.reminder_offset] || '30 minutes';
                                    const notifMessage = `Your appointment with ${appt.patient_name} is in ${labelText} (${appt.time}).`;

                                    db.run(`
                                        INSERT INTO doctor_notifications (id, doctor_id, appointment_id, title, message, type, is_read)
                                        VALUES (?, ?, ?, ?, ?, 'REMINDER', 0)
                                    `, [notifId, doctorId, appt.id, notifTitle, notifMessage], () => resAppt());
                                } else {
                                    resAppt();
                                }
                            });
                        } else {
                            resAppt();
                        }
                    });
                });

                Promise.all(promises).then(() => resolve());
            });
        });
    };

    checkReminders().then(() => {
        db.all(`
            SELECT * FROM doctor_notifications
            WHERE doctor_id = ?
            ORDER BY created_at DESC
        `, [doctorId], (err, notifications) => {
            if (err) {
                console.error('[GET_DOCTOR_NOTIFS] Error:', err);
                return res.status(500).json({ message: 'Error fetching notifications' });
            }
            const unreadCount = (notifications || []).filter(n => n.is_read === 0).length;
            res.json({ notifications: notifications || [], unreadCount });
        });
    });
};

export const markDoctorNotificationRead = (req, res) => {
    const doctorId = req.user.id;
    const { id } = req.params;

    db.run(`
        UPDATE doctor_notifications SET is_read = 1 WHERE id = ? AND doctor_id = ?
    `, [id, doctorId], function(err) {
        if (err) return res.status(500).json({ message: 'Error updating notification status' });
        res.json({ message: 'Notification marked as read' });
    });
};

export const markAllDoctorNotificationsRead = (req, res) => {
    const doctorId = req.user.id;

    db.run(`
        UPDATE doctor_notifications SET is_read = 1 WHERE doctor_id = ?
    `, [doctorId], function(err) {
        if (err) return res.status(500).json({ message: 'Error marking all notifications as read' });
        res.json({ message: 'All notifications marked as read' });
    });
};

export const deleteDoctorNotification = (req, res) => {
    const doctorId = req.user.id;
    const { id } = req.params;

    db.run(`
        DELETE FROM doctor_notifications WHERE id = ? AND doctor_id = ?
    `, [id, doctorId], function(err) {
        if (err) return res.status(500).json({ message: 'Error deleting notification' });
        res.json({ message: 'Notification deleted successfully' });
    });
};


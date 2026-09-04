import { db } from '../db/sqliteSetup.js';
import { v4 as uuidv4 } from 'uuid';
import { generateGeminiContent } from '../utils/gemini.js';
import { parsePrescriptionText } from '../utils/ocrParser.js';
import fs from 'fs';
import path from 'path';

export const getProfile = (req, res) => {
    const userId = req.user.id;
    
    db.get(`SELECT u.full_name, u.email, u.phone, u.upahaar_id, u.face_photo_url, m.* 
            FROM users u 
            LEFT JOIN medical_profiles m ON u.id = m.user_id 
            WHERE u.id = ?`, [userId], (err, profile) => {
        if (err || !profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json(profile);
    });
};

export const updateProfile = (req, res) => {
    const userId = req.user.id;
    const { 
        dob, gender, blood_group, height_cm, weight_kg, chest_size_cm, 
        vision_left, vision_right, hearing_status, allergies, 
        family_history, mental_health, respiratory_disorders, 
        heart_problems, nervous_disorders, identifying_features,
        emergency_contacts,
        face_photo_url
    } = req.body;

    const fields = [
        dob || null, gender || null, blood_group || null, 
        height_cm != null ? height_cm : null, weight_kg != null ? weight_kg : null, chest_size_cm != null ? chest_size_cm : null,
        vision_left || null, vision_right || null, 
        hearing_status ? (typeof hearing_status === 'string' ? hearing_status : JSON.stringify(hearing_status)) : null, 
        allergies ? (typeof allergies === 'string' ? allergies : JSON.stringify(allergies)) : null,
        family_history ? (typeof family_history === 'string' ? family_history : JSON.stringify(family_history)) : null,
        mental_health ? (typeof mental_health === 'string' ? mental_health : JSON.stringify(mental_health)) : null,
        respiratory_disorders ? (typeof respiratory_disorders === 'string' ? respiratory_disorders : JSON.stringify(respiratory_disorders)) : null,
        heart_problems ? (typeof heart_problems === 'string' ? heart_problems : JSON.stringify(heart_problems)) : null,
        nervous_disorders ? (typeof nervous_disorders === 'string' ? nervous_disorders : JSON.stringify(nervous_disorders)) : null,
        identifying_features || null,
        emergency_contacts ? (typeof emergency_contacts === 'string' ? emergency_contacts : JSON.stringify(emergency_contacts)) : null,
        userId
    ];

    if (face_photo_url) {
        db.run(`UPDATE users SET face_photo_url = ? WHERE id = ?`, [face_photo_url, userId], (err) => {
            if (err) console.error("Error updating user face photo:", err.message);
        });
    }

    db.run(
        `INSERT INTO medical_profiles (dob, gender, blood_group, height_cm, weight_kg, chest_size_cm,
            vision_left, vision_right, hearing_status, allergies, family_history, mental_health,
            respiratory_disorders, heart_problems, nervous_disorders, identifying_features,
            emergency_contacts, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
            dob = COALESCE(EXCLUDED.dob, medical_profiles.dob),
            gender = COALESCE(EXCLUDED.gender, medical_profiles.gender),
            blood_group = COALESCE(EXCLUDED.blood_group, medical_profiles.blood_group),
            height_cm = COALESCE(EXCLUDED.height_cm, medical_profiles.height_cm),
            weight_kg = COALESCE(EXCLUDED.weight_kg, medical_profiles.weight_kg),
            chest_size_cm = COALESCE(EXCLUDED.chest_size_cm, medical_profiles.chest_size_cm),
            vision_left = COALESCE(EXCLUDED.vision_left, medical_profiles.vision_left),
            vision_right = COALESCE(EXCLUDED.vision_right, medical_profiles.vision_right),
            hearing_status = COALESCE(EXCLUDED.hearing_status, medical_profiles.hearing_status),
            allergies = COALESCE(EXCLUDED.allergies, medical_profiles.allergies),
            family_history = COALESCE(EXCLUDED.family_history, medical_profiles.family_history),
            mental_health = COALESCE(EXCLUDED.mental_health, medical_profiles.mental_health),
            respiratory_disorders = COALESCE(EXCLUDED.respiratory_disorders, medical_profiles.respiratory_disorders),
            heart_problems = COALESCE(EXCLUDED.heart_problems, medical_profiles.heart_problems),
            nervous_disorders = COALESCE(EXCLUDED.nervous_disorders, medical_profiles.nervous_disorders),
            identifying_features = COALESCE(EXCLUDED.identifying_features, medical_profiles.identifying_features),
            emergency_contacts = COALESCE(EXCLUDED.emergency_contacts, medical_profiles.emergency_contacts)`,
        fields,
        function (err) {
            if (err) {
                return res.status(500).json({ message: 'Error updating profile', error: err.message });
            }
            res.json({ message: 'Profile updated successfully' });
        }
    );
};

export const uploadPrescription = async (req, res) => {
    const citizenId = req.user.id;
    const doctorId = req.user.role === 'DOCTOR' ? req.user.id : null; 
    
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Convert memory buffer to Base64 data URI
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const base64Image = req.file.buffer.toString('base64');
    const fileUrl = `data:${mimeType};base64,${base64Image}`;
    
    const id = uuidv4();
    let aiSummary = "Processing...";
    let medicinesJson = "[]";
    let rawOcrText = "";

    // 1. Run TrOCR via HTTP microservice OR local Python script
    let trocrSuccess = false;
    try {
        if (mimeType.startsWith('image/')) {
            console.log("Attempting TrOCR extraction...");

            // Method A: If AI_SERVICE_URL is defined (FastAPI Python microservice)
            if (process.env.AI_SERVICE_URL) {
                try {
                    console.log(`Calling FastAPI TrOCR microservice at ${process.env.AI_SERVICE_URL}...`);
                    const formData = new FormData();
                    const blob = new Blob([req.file.buffer], { type: mimeType });
                    formData.append('file', blob, req.file.originalname);

                    const response = await fetch(`${process.env.AI_SERVICE_URL}/extract-prescription`, {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        const resData = await response.json();
                        if (resData.data) {
                            aiSummary = resData.data.summary || aiSummary;
                            medicinesJson = JSON.stringify(resData.data.medicines || []);
                            rawOcrText = resData.data.raw_text || "";
                            trocrSuccess = true;
                            console.log("TrOCR HTTP microservice extraction succeeded.");
                        }
                    }
                } catch (httpErr) {
                    console.warn("FastAPI TrOCR microservice unavailable, trying local script:", httpErr.message);
                }
            }

            // Method B: Local script execution via child_process
            if (!trocrSuccess) {
                const tmpDir = path.resolve('uploads');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                const tmpFile = path.join(tmpDir, `ocr_tmp_${id}.${ext}`);
                fs.writeFileSync(tmpFile, req.file.buffer);

                const ocrScriptPath = path.resolve('..', 'ai-service', 'ocr_extract.py');
                const { execFile } = await import('child_process');

                const candidateCmds = Array.from(new Set([
                    process.env.PYTHON_CMD,
                    'python3',
                    'python',
                    'py'
                ].filter(Boolean)));

                const runOcrCommand = (cmd) => new Promise((resolve, reject) => {
                    execFile(cmd, [ocrScriptPath, tmpFile], { 
                        timeout: 90000,
                        maxBuffer: 10 * 1024 * 1024,
                        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
                    }, (error, stdout, stderr) => {
                        if (stderr) console.log(`[TrOCR output (${cmd})]:`, stderr);
                        if (error) {
                            const errDetail = stderr ? stderr.trim() : error.message;
                            return reject(new Error(`[${cmd}] ${errDetail}`));
                        }
                        try {
                            const trimmed = stdout.trim();
                            // If output has extra lines before JSON, find the last JSON object
                            const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
                            if (jsonMatch) {
                                resolve(JSON.parse(jsonMatch[0]));
                            } else {
                                resolve(JSON.parse(trimmed));
                            }
                        } catch (e) {
                            reject(new Error(`[${cmd}] Failed to parse stdout: ${stdout}`));
                        }
                    });
                });

                let ocrResult = null;
                const errorLog = [];

                for (const cmd of candidateCmds) {
                    try {
                        console.log(`Trying TrOCR execution using '${cmd}'...`);
                        ocrResult = await runOcrCommand(cmd);
                        if (ocrResult) break;
                    } catch (err) {
                        console.warn(`Command '${cmd}' failed:`, err.message);
                        errorLog.push(err.message);
                    }
                }

                try { fs.unlinkSync(tmpFile); } catch (_) {}

                if (ocrResult && !ocrResult.error) {
                    aiSummary = ocrResult.summary || aiSummary;
                    medicinesJson = JSON.stringify(ocrResult.medicines || []);
                    rawOcrText = ocrResult.raw_text || "";
                    trocrSuccess = true;
                    console.log("Local TrOCR script extraction completed successfully.");
                } else if (ocrResult && ocrResult.error) {
                    throw new Error("TrOCR error: " + ocrResult.error);
                } else {
                    // Surface non-ENOENT error if present, or all errors
                    const meaningfulError = errorLog.find(e => !e.includes("ENOENT")) || errorLog.join(" | ");
                    throw new Error(meaningfulError || "All Python execution candidates failed.");
                }
            }
        } else if (mimeType === 'application/pdf') {
            rawOcrText = "PDF format uploaded.";
        }
    } catch (ocrError) {
        console.warn("Local TrOCR execution unavailable or failed:", ocrError.message);
        aiSummary = "Prescription uploaded. Processing with Gemini Vision...";
    }

// 2. Gemini Vision fallback / structuring enhancement - DISABLED for TrOCR testing
//    if (process.env.GEMINI_API_KEY || process.env.GEMINI_BACKUP_API_KEY) {
//        try {
//            console.log("Processing extraction with Gemini...");
//            let prompt = "";
//            let apiInputs = [];

//            if (mimeType === 'application/pdf') {
//                // PDF: send entire PDF to Gemini Vision
//                prompt = `You are a medical AI assistant. Extract the patient diagnosis, doctor's name, and prescribed medicines from this prescription. 
//You MUST return your answer as a raw, valid JSON object (without markdown wrappers like \`\`\`json) with exactly three fields:
//1. "summary": A short, professional text string summarizing the diagnosis and doctor name.
//2. "medicines": An array of objects, where each object has "name" (e.g. Paracetamol 500mg), "frequency" (e.g. Morning & Night), and "duration" (e.g. 5 Days).
//3. "raw_text": A complete, verbatim OCR transcription of ALL text on the prescription exactly as written. Preserve line breaks with \\n.`; 
//                
//                const filePart = {
//                    inlineData: {
//                        data: base64Image,
//                        mimeType
//                    }
//                };
//                apiInputs = [prompt, filePart];
//            } else if (trocrSuccess && rawOcrText && rawOcrText.trim().length > 10) {
//                // TrOCR succeeded: send extracted text to Gemini for structuring (fast + cheap)
//                prompt = `You are a medical AI assistant. Extract structured data from this prescription text:
//---
//${rawOcrText}
//---
//You MUST return your answer as a raw, valid JSON object (without markdown wrappers like \`\`\`json) with exactly three fields:
//1. "summary": A short, professional text string summarizing the diagnosis and doctor name.
//2. "medicines": An array of objects, where each object has "name" (e.g. Paracetamol 500mg), "frequency" (e.g. Morning & Night), and "duration" (e.g. 5 Days).
//3. "raw_text": A cleaned up, verbatim transcription of the text. Preserve line breaks with \\n.`;
//                apiInputs = [prompt];
//            } else {
//                // TrOCR failed or was unavailable (e.g. Render server): send image directly to Gemini Vision!
//                console.log("Using Gemini Vision direct image OCR fallback...");
//                prompt = `You are a medical AI assistant. Extract the patient diagnosis, doctor's name, and prescribed medicines from this prescription image. 
//You MUST return your answer as a raw, valid JSON object (without markdown wrappers like \`\`\`json) with exactly three fields:
//1. "summary": A short, professional text string summarizing the diagnosis and doctor name.
//2. "medicines": An array of objects, where each object has "name" (e.g. Paracetamol 500mg), "frequency" (e.g. Morning & Night), and "duration" (e.g. 5 Days).
//3. "raw_text": A complete, verbatim OCR transcription of ALL text visible on the prescription image. Preserve line breaks with \\n.`; 
//                
//                const filePart = {
//                    inlineData: {
//                        data: base64Image,
//                        mimeType
//                    }
//                };
//                apiInputs = [prompt, filePart];
//            }

//            if (apiInputs.length > 0) {
//                const result = await generateGeminiContent(apiInputs, { model: "gemini-2.5-flash" });
//                const response = await result.response;
//                let text = response.text().trim();
                
//                if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
//                if (text.startsWith('```')) text = text.replace(/```/g, '').trim();

//                try {
//                    const parsed = JSON.parse(text);
//                    aiSummary = parsed.summary || aiSummary;
//                    medicinesJson = JSON.stringify(parsed.medicines || JSON.parse(medicinesJson));
//                    if (parsed.raw_text) {
//                        rawOcrText = parsed.raw_text;
//                    }
//                    console.log("Gemini extraction completed successfully.");
//                } catch (jsonErr) {
//                    console.error("Failed to parse Gemini JSON:", jsonErr, "Response text was:", text);
//                }
//            }
//        } catch (geminiError) {
//            console.error("Gemini processing failed:", geminiError.message);
//            if (!trocrSuccess) {
//                aiSummary = "Prescription uploaded successfully. Automatic OCR parsing is currently unavailable.";
//            }
//        }
//    } else if (!trocrSuccess) {
        aiSummary = "Prescription uploaded. Local Python OCR failed and GEMINI_API_KEY is not configured on server.";
    }

    db.run(
        `INSERT INTO prescriptions (id, citizen_id, doctor_id, file_url, ai_extracted_data, medicines, raw_ocr_text) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, citizenId, doctorId, fileUrl, aiSummary, medicinesJson, rawOcrText],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error while saving prescription' });
            }
            res.status(201).json({ 
                message: 'Prescription uploaded successfully', 
                prescription_id: id,
                file_url: fileUrl,
                ai_summary: aiSummary,
                medicines: medicinesJson,
                raw_ocr_text: rawOcrText
            });
        }
    );
};

export const getTimeline = (req, res) => {
    const citizenId = req.user.id; // Could also check params if Doctor accesses patient

    db.all(`SELECT * FROM prescriptions WHERE citizen_id = ? ORDER BY created_at DESC`, [citizenId], (err, prescriptions) => {
        if (err) return res.status(500).json({ message: 'Error fetching timeline' });
        res.json({ timeline: prescriptions });
    });
};

export const deletePrescription = (req, res) => {
    const citizenId = req.user.id;
    const { id } = req.params;

    db.get(`SELECT file_url FROM prescriptions WHERE id = ? AND citizen_id = ?`, [id, citizenId], (err, row) => {
        if (err || !row) return res.status(404).json({ message: 'Prescription not found' });

        // Optionally delete the physical file here if needed:
        // const filePath = path.join(__dirname, '..', '..', '..', row.file_url);
        // if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        db.run(`DELETE FROM prescriptions WHERE id = ? AND citizen_id = ?`, [id, citizenId], function(err) {
            if (err) return res.status(500).json({ message: 'Failed to delete record' });
            res.json({ message: 'Prescription deleted successfully' });
        });
    });
};

export const removeMedicineFromPrescription = (req, res) => {
    const citizenId = req.user.id;
    const { id } = req.params; // prescriptionId
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Medicine name is required' });
    }

    db.get(`SELECT medicines FROM prescriptions WHERE id = ? AND citizen_id = ?`, [id, citizenId], (err, row) => {
        if (err || !row) return res.status(404).json({ message: 'Prescription not found' });

        try {
            let medicines = JSON.parse(row.medicines || '[]');
            if (!Array.isArray(medicines)) medicines = [];

            // Filter out the medicine with the matching name
            const updatedMedicines = medicines.filter(m => m.name.trim().toLowerCase() !== name.trim().toLowerCase());

            db.run(`UPDATE prescriptions SET medicines = ? WHERE id = ? AND citizen_id = ?`,
                [JSON.stringify(updatedMedicines), id, citizenId],
                function(err) {
                    if (err) return res.status(500).json({ message: 'Failed to remove medicine' });
                    res.json({ message: 'Medicine removed successfully', medicines: updatedMedicines });
                }
            );
        } catch (e) {
            return res.status(500).json({ message: 'Failed to parse medicines database field' });
        }
    });
};



export const getNotifications = (req, res) => {
    const citizenId = req.user.id;
    db.all(`
        SELECT a.id, a.method, a.status, a.created_at, a.logged_out_at, u.full_name as doctor_name, u.upahaar_id as doctor_upahaar_id
        FROM access_logs a
        JOIN users u ON a.doctor_id = u.id
        WHERE a.citizen_id = ? AND (a.deleted_by_citizen = 0 OR a.deleted_by_citizen IS NULL)
        ORDER BY a.created_at DESC
    `, [citizenId], (err, logs) => {
        if (err) {
            console.error('[NOTIFICATIONS] Error fetching notifications:', err);
            return res.status(500).json({ message: 'Error fetching notifications' });
        }
        res.json({ notifications: logs || [] });
    });
};

export const acknowledgeNotification = (req, res) => {
    const citizenId = req.user.id;
    const logId = req.params.id;
    db.get(`SELECT doctor_id FROM access_logs WHERE id = ? AND citizen_id = ?`, [logId, citizenId], (err, log) => {
        if (err || !log) return res.status(404).json({ message: 'Notification not found' });

        // Approving a request re-grants access: clear any previous revocation for this doctor
        db.run(`DELETE FROM revoked_access WHERE citizen_id = ? AND doctor_id = ?`, [citizenId, log.doctor_id], (delErr) => {
            if (delErr) return res.status(500).json({ message: 'Error updating notification' });

            db.run(`UPDATE access_logs SET status = 'APPROVED' WHERE id = ? AND citizen_id = ?`, [logId, citizenId], function(err2) {
                if (err2) return res.status(500).json({ message: 'Error updating notification' });
                res.json({ message: 'Notification approved' });
            });
        });
    });
};

export const revokeNotificationAccess = (req, res) => {
    const citizenId = req.user.id;
    const logId = req.params.id;
    
    db.get(`SELECT doctor_id FROM access_logs WHERE id = ? AND citizen_id = ?`, [logId, citizenId], (err, log) => {
        if (err || !log) return res.status(404).json({ message: 'Notification not found' });
        
        db.run(`INSERT INTO revoked_access (citizen_id, doctor_id) VALUES (?, ?) ON CONFLICT (citizen_id, doctor_id) DO NOTHING`, [citizenId, log.doctor_id], (err2) => {
            if (err2) return res.status(500).json({ message: 'Error revoking access' });
            
            db.run(`UPDATE access_logs SET status = 'REVOKED', logged_out_at = COALESCE(logged_out_at, CURRENT_TIMESTAMP) WHERE id = ?`, [logId], (err3) => {
                if (err3) console.error("Error updating log status", err3);
                res.json({ message: 'Access revoked successfully' });
            });
        });
    });
};

export const deleteNotification = (req, res) => {
    const citizenId = req.user.id;
    const logId = req.params.id;

    db.run(`
        UPDATE access_logs 
        SET deleted_by_citizen = 1 
        WHERE id = ? AND citizen_id = ?
    `, [logId, citizenId], function(err) {
        if (err) {
            console.error("[DELETE_NOTIFICATION] Error:", err);
            return res.status(500).json({ message: 'Error deleting notification' });
        }
        res.json({ message: 'Notification deleted successfully' });
    });
};

export const addVitals = (req, res) => {
    const userId = req.user.id;
    const { heart_rate, sugar_level, bp_systolic, bp_diastolic } = req.body;
    const id = uuidv4();

    db.run(
        `INSERT INTO vitals (id, user_id, heart_rate, sugar_level, bp_systolic, bp_diastolic) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, userId, heart_rate || null, sugar_level || null, bp_systolic || null, bp_diastolic || null],
        (err) => {
            if (err) {
                console.error("Error adding vitals:", err);
                return res.status(500).json({ message: 'Failed to record vitals' });
            }
            res.status(201).json({ message: 'Vitals recorded successfully' });
        }
    );
};

export const getVitals = (req, res) => {
    const userId = req.user.id;

    db.all(`SELECT * FROM vitals WHERE user_id = ? ORDER BY recorded_at ASC`, [userId], (err, vitals) => {
        if (err) {
            console.error("Error fetching vitals:", err);
            return res.status(500).json({ message: 'Error fetching vitals' });
        }
        res.json({ vitals });
    });
};

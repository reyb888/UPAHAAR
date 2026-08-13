import { db } from '../db/sqliteSetup.js';
import { v4 as uuidv4 } from 'uuid';
import { generateGeminiContent } from '../utils/gemini.js';
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
    let aiSummary = "AI Processing skipped (No API Key)";
    let medicinesJson = null;
    let rawOcrText = null;

    try {
        if (process.env.GEMINI_API_KEY || process.env.GEMINI_BACKUP_API_KEY) {
            if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
                const prompt = `You are a medical AI assistant. Extract the patient diagnosis, doctor's name, and prescribed medicines from this prescription. 
You MUST return your answer as a raw, valid JSON object (without markdown wrappers like \`\`\`json) with exactly three fields:
1. "summary": A short, professional text string summarizing the diagnosis and doctor name.
2. "medicines": An array of objects, where each object has "name" (e.g. Paracetamol 500mg), "frequency" (e.g. Morning & Night), and "duration" (e.g. 5 Days).
3. "raw_text": A complete, verbatim OCR transcription of ALL text on the prescription exactly as written. Preserve line breaks with \\n.`;
                
                const filePart = {
                    inlineData: {
                        data: base64Image,
                        mimeType
                    }
                };
                
                const result = await generateGeminiContent([prompt, filePart], { model: "gemini-2.5-flash" });
                const response = await result.response;
                let text = response.text().trim();
                
                // Attempt to parse JSON safely (in case it added markdown block)
                if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                
                try {
                    const parsed = JSON.parse(text);
                    aiSummary = parsed.summary || "Summary extracted but missing from JSON.";
                    medicinesJson = JSON.stringify(parsed.medicines || []);
                    rawOcrText = parsed.raw_text || text;
                } catch (e) {
                    // Fallback if AI fails to return JSON
                    aiSummary = text;
                    medicinesJson = "[]";
                    rawOcrText = text;
                }
            } else {
                aiSummary = "Document uploaded. (File type not supported by Gemini Vision)";
            }
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        aiSummary = "AI Processing failed: " + error.message;
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

export const getNearbyPharmacies = async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: 'Google Maps API key is missing' });
    }

    try {
        const url = 'https://places.googleapis.com/v1/places:searchNearby';
        
        const requestBody = {
            includedTypes: ["pharmacy"],
            maxResultCount: 20,
            locationRestriction: {
                circle: {
                    center: {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lng)
                    },
                    radius: 5000.0
                }
            }
        };

        let response;
        let data;
        let fetchSuccessful = false;
        let mappedPharmacies = [];

        try {
            console.log('Attempting to fetch pharmacies via Places API (New)...');
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.regularOpeningHours.openNow'
                },
                body: JSON.stringify(requestBody)
            });

            data = await response.json();

            if (response.ok) {
                mappedPharmacies = (data.places || []).map(place => ({
                    place_id: place.id,
                    name: place.displayName?.text || 'Unknown Pharmacy',
                    vicinity: place.formattedAddress || '',
                    rating: place.rating || null,
                    user_ratings_total: place.userRatingCount || 0,
                    opening_hours: place.regularOpeningHours ? { open_now: place.regularOpeningHours.openNow } : undefined
                }));
                fetchSuccessful = true;
            } else {
                console.warn('Places API (New) returned error status:', response.status, data);
            }
        } catch (newApiError) {
            console.warn('Places API (New) fetch threw error:', newApiError.message || newApiError);
        }

        // Fallback to Classic Places API if New API failed
        if (!fetchSuccessful) {
            console.log('Falling back to Classic Places API (nearbysearch)...');
            const classicUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=pharmacy&key=${apiKey}`;
            
            try {
                const classicResponse = await fetch(classicUrl);
                const classicData = await classicResponse.json();

                if (classicResponse.ok && (classicData.status === 'OK' || classicData.status === 'ZERO_RESULTS')) {
                    mappedPharmacies = (classicData.results || []).map(place => ({
                        place_id: place.place_id,
                        name: place.name || 'Unknown Pharmacy',
                        vicinity: place.vicinity || '',
                        rating: place.rating || null,
                        user_ratings_total: place.user_ratings_total || 0,
                        opening_hours: place.opening_hours ? { open_now: place.opening_hours.open_now } : undefined
                    }));
                    fetchSuccessful = true;
                } else {
                    console.error('Classic Places API returned error status or invalid state. Status:', classicData.status, 'Error Message:', classicData.error_message);
                }
            } catch (classicApiError) {
                console.error('Classic Places API fetch threw error:', classicApiError.message || classicApiError);
            }
        }

        if (fetchSuccessful) {
            return res.json({ pharmacies: mappedPharmacies });
        }

        return res.status(500).json({ message: 'Failed to fetch from Google Maps (both Places API New and Classic failed)' });

    } catch (error) {
        console.error('Error fetching pharmacies:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
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

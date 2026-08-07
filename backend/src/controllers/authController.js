import { db } from '../db/sqliteSetup.js';
import { supabase } from '../utils/supabaseClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';


const generateUpahaarID = () => {
    return 'UPHR-' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

export const registerUser = async (req, res) => {
    try {
        const { role, full_name, email, phone, password, face_photo_url, dob, family_history } = req.body;

        // Basic validation
        if (!role || !full_name || !email || !phone || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const upahaar_id = generateUpahaarID();

        // --- Supabase Auth Path ---
        if (supabase) {
            console.log(`[Register] Attempting Supabase Auth sign-up for email: ${email}`);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name,
                        phone,
                        role,
                        upahaar_id,
                        face_photo_url: face_photo_url || null,
                        dob: dob || null
                    }
                }
            });

            if (error) {
                console.error("[Register] Supabase Auth Error:", error);
                return res.status(400).json({ message: error.message });
            }

            console.log(`[Register] Supabase Auth sign-up successful for email: ${email}, user ID: ${data.user?.id}`);

            // Supabase Auth created the user. The DB trigger will sync to public.users.
            // Check if email confirmation is required (user exists but not confirmed)
            const needsEmailConfirmation = data.user && !data.user.email_confirmed_at;

            return res.status(201).json({ 
                message: needsEmailConfirmation 
                    ? 'Registration successful! Please check your email to verify your account before logging in.' 
                    : 'User registered successfully', 
                upahaar_id, 
                id: data.user?.id,
                email_confirmation_required: needsEmailConfirmation
            });
        }

        // --- SQLite Fallback Path ---
        console.log(`[Register] Supabase client is not active/initialized. Falling back to local SQLite DB for email: ${email}`);
        const id = uuidv4();
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        db.run(
            `INSERT INTO users (id, upahaar_id, role, full_name, email, phone, password_hash, face_photo_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, upahaar_id, role, full_name, email, phone, password_hash, face_photo_url],
            function (err) {
                if (err) {
                    console.error("DB Error in citizen register:", err);
                    return res.status(500).json({ message: 'DB Error: ' + err.message });
                }
                
                // Initialize medical profile for CITIZEN with DOB and optional family_history
                if (role === 'CITIZEN') {
                    const famHistStr = family_history ? (typeof family_history === 'string' ? family_history : JSON.stringify(family_history)) : null;
                    db.run(`INSERT INTO medical_profiles (user_id, dob, family_history) VALUES (?, ?, ?)`, [id, dob || null, famHistStr], (err2) => {
                        if (err2) console.error('Error creating medical profile:', err2.message);
                    });
                }
                
                res.status(201).json({ message: 'User registered successfully', upahaar_id, id });
            }
        );
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const loginUser = async (req, res) => {
    const { upahaar_id, password, totp_code } = req.body;
    
    if (!upahaar_id || !password) {
        return res.status(400).json({ message: 'UPAHAAR ID / Email and password are required' });
    }

    // Determine if the user is logging in with email or UPAHAAR ID
    const isEmail = upahaar_id.includes('@');

    // --- Supabase Auth Path ---
    if (supabase && isEmail) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: upahaar_id,
                password
            });

            if (error) {
                // Provide a user-friendly message for unconfirmed emails
                if (error.message.toLowerCase().includes('email not confirmed')) {
                    return res.status(400).json({ message: 'Please verify your email address before logging in. Check your inbox for the confirmation link.' });
                }
                return res.status(400).json({ message: error.message });
            }

            // Supabase auth succeeded — now look up the user in public.users for app-level data
            const supabaseUserId = data.user.id;

            db.get(`SELECT u.*, m.blood_group FROM users u LEFT JOIN medical_profiles m ON u.id = m.user_id WHERE u.id = ?`, [supabaseUserId], async (err, user) => {
                if (err || !user) {
                    return res.status(400).json({ message: 'User authenticated but profile not found. Please contact support.' });
                }

                // 2FA Check (app-level)
                if (user.is_totp_enabled) {
                    if (!totp_code) {
                        return res.status(400).json({ message: '2FA code is required' });
                    }
                    const verified = speakeasy.totp.verify({
                        secret: user.totp_secret,
                        encoding: 'base32',
                        token: totp_code
                    });
                    if (!verified) {
                        return res.status(400).json({ message: 'Invalid 2FA code' });
                    }
                }

                const payload = {
                    user: {
                        id: user.id,
                        role: user.role,
                        upahaar_id: user.upahaar_id
                    }
                };

                jwt.sign(
                    payload,
                    process.env.JWT_SECRET || 'secret',
                    { expiresIn: '5h' },
                    (err, token) => {
                        if (err) throw err;
                        const is_setup_complete = user.blood_group ? true : false;
                        res.json({ token, role: user.role, upahaar_id: user.upahaar_id, is_setup_complete });
                    }
                );
            });
        } catch (error) {
            console.error("Supabase login error:", error);
            return res.status(500).json({ message: 'Server error during authentication' });
        }
        return; // Prevent falling through to UPAHAAR ID path
    }

    // --- UPAHAAR ID Login Path (works for both SQLite and Supabase PostgreSQL via public.users) ---
    const lookupField = isEmail ? 'u.email' : 'u.upahaar_id';

    db.get(`SELECT u.*, m.blood_group FROM users u LEFT JOIN medical_profiles m ON u.id = m.user_id WHERE ${lookupField} = ?`, [upahaar_id], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 2FA Check
        if (user.is_totp_enabled) {
            if (!totp_code) {
                return res.status(400).json({ message: '2FA code is required' });
            }
            const verified = speakeasy.totp.verify({
                secret: user.totp_secret,
                encoding: 'base32',
                token: totp_code
            });
            if (!verified) {
                return res.status(400).json({ message: 'Invalid 2FA code' });
            }
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                upahaar_id: user.upahaar_id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                const is_setup_complete = user.blood_group ? true : false;
                res.json({ token, role: user.role, upahaar_id: user.upahaar_id, is_setup_complete });
            }
        );
    });
};

export const generate2FA = async (req, res) => {
    const userId = req.user.id;
    const secret = speakeasy.generateSecret({ name: `UPAHAAR (${req.user.upahaar_id})` });
    
    db.run(`UPDATE users SET totp_secret = ? WHERE id = ?`, [secret.base32, userId], async (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        
        try {
            const dataUrl = await qrcode.toDataURL(secret.otpauth_url);
            res.json({ qrCode: dataUrl });
        } catch (qrErr) {
            res.status(500).json({ message: 'Error generating QR code' });
        }
    });
};

export const verifyAndEnable2FA = (req, res) => {
    const userId = req.user.id;
    const { totp_code } = req.body;
    
    if (!totp_code) return res.status(400).json({ message: 'Code is required' });
    
    db.get(`SELECT totp_secret FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err || !user || !user.totp_secret) return res.status(400).json({ message: 'Setup not initiated' });
        
        const verified = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: 'base32',
            token: totp_code
        });
        
        if (verified) {
            db.run(`UPDATE users SET is_totp_enabled = 1 WHERE id = ?`, [userId], (updateErr) => {
                if (updateErr) return res.status(500).json({ message: 'Database error' });
                res.json({ message: '2FA successfully enabled!' });
            });
        } else {
            res.status(400).json({ message: 'Invalid code, please try again.' });
        }
    });
};

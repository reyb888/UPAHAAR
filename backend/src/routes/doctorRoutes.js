import express from 'express';
import { 
    scanPatientQr, 
    searchPatientHistoryAI, 
    scanPatientFace, 
    checkAccessStatus, 
    closeAccess,
    getDoctorProfile,
    updateDoctorProfile,
    getDoctorAccessedHistory,
    getAccessiblePatients,
    getPatientDetailsForDoctor
} from '../controllers/doctorController.js';
import { auth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/profile', auth, requireRole(['DOCTOR']), getDoctorProfile);
router.put('/profile', auth, requireRole(['DOCTOR']), updateDoctorProfile);
router.get('/accessed-history', auth, requireRole(['DOCTOR']), getDoctorAccessedHistory);
router.get('/accessible-patients', auth, requireRole(['DOCTOR']), getAccessiblePatients);
router.get('/patient-details/:upahaar_id', auth, requireRole(['DOCTOR']), getPatientDetailsForDoctor);

router.get('/scan/:upahaar_id', auth, requireRole(['DOCTOR']), scanPatientQr);
router.post('/scan/:upahaar_id/ai-search', auth, requireRole(['DOCTOR']), searchPatientHistoryAI);
router.post('/scan-face', auth, requireRole(['DOCTOR']), scanPatientFace);
router.get('/access-status/:request_id', auth, requireRole(['DOCTOR']), checkAccessStatus);
router.post('/close-access', auth, requireRole(['DOCTOR']), closeAccess);

export default router;

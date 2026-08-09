import express from 'express';
import { scanPatientQr, searchPatientHistoryAI, scanPatientFace, checkAccessStatus } from '../controllers/doctorController.js';
import { auth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/scan/:upahaar_id', auth, requireRole(['DOCTOR']), scanPatientQr);
router.post('/scan/:upahaar_id/ai-search', auth, requireRole(['DOCTOR']), searchPatientHistoryAI);
router.post('/scan-face', auth, requireRole(['DOCTOR']), scanPatientFace);
router.get('/access-status/:request_id', auth, requireRole(['DOCTOR']), checkAccessStatus);

export default router;

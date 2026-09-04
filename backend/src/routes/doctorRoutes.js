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
    getPatientDetailsForDoctor,
    getRegisteredCitizensList,
    getDoctorAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    getDoctorNotifications,
    markDoctorNotificationRead,
    markAllDoctorNotificationsRead,
    deleteDoctorNotification
} from '../controllers/doctorController.js';
import { auth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/profile', auth, requireRole(['DOCTOR']), getDoctorProfile);
router.put('/profile', auth, requireRole(['DOCTOR']), updateDoctorProfile);
router.get('/accessed-history', auth, requireRole(['DOCTOR']), getDoctorAccessedHistory);
router.get('/accessible-patients', auth, requireRole(['DOCTOR']), getAccessiblePatients);
router.get('/patient-details/:upahaar_id', auth, requireRole(['DOCTOR']), getPatientDetailsForDoctor);

// Appointment Scheduler Routes
router.get('/registered-citizens', auth, requireRole(['DOCTOR']), getRegisteredCitizensList);
router.get('/appointments', auth, requireRole(['DOCTOR']), getDoctorAppointments);
router.post('/appointments', auth, requireRole(['DOCTOR']), createAppointment);
router.put('/appointments/:id', auth, requireRole(['DOCTOR']), updateAppointment);
router.patch('/appointments/:id/cancel', auth, requireRole(['DOCTOR']), cancelAppointment);

// Doctor Notifications Routes
router.get('/notifications', auth, requireRole(['DOCTOR']), getDoctorNotifications);
router.patch('/notifications/read-all', auth, requireRole(['DOCTOR']), markAllDoctorNotificationsRead);
router.patch('/notifications/:id/read', auth, requireRole(['DOCTOR']), markDoctorNotificationRead);
router.delete('/notifications/:id', auth, requireRole(['DOCTOR']), deleteDoctorNotification);

router.get('/scan/:upahaar_id', auth, requireRole(['DOCTOR']), scanPatientQr);
router.post('/scan/:upahaar_id/ai-search', auth, requireRole(['DOCTOR']), searchPatientHistoryAI);
router.post('/scan-face', auth, requireRole(['DOCTOR']), scanPatientFace);
router.get('/access-status/:request_id', auth, requireRole(['DOCTOR']), checkAccessStatus);
router.post('/close-access', auth, requireRole(['DOCTOR']), closeAccess);

export default router;

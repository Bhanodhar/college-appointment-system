const express = require('express');
const {
  bookAppointment,
  cancelAppointment,
  getStudentAppointments,
  getProfessorAppointments
} = require('../controllers/appointmentController');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/book', auth, requireRole('student'), bookAppointment);
router.put('/:id/cancel', auth, requireRole('professor'), cancelAppointment);
router.get('/my-appointments', auth, requireRole('student'), getStudentAppointments);
router.get('/professor-appointments', auth, requireRole('professor'), getProfessorAppointments);

module.exports = router;
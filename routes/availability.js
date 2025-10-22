const express = require('express');
const {
  createAvailability,
  getProfessorAvailability,
  getMyAvailability,
  deleteAvailability
} = require('../controllers/availabilityController');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, requireRole('professor'), createAvailability);
router.get('/professor/:professorId', auth, getProfessorAvailability);
router.get('/my-availability', auth, requireRole('professor'), getMyAvailability);
router.delete('/:id', auth, requireRole('professor'), deleteAvailability);

module.exports = router;
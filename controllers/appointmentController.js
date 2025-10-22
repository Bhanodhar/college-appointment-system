const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Book appointment
 * @route   POST /api/appointments/book
 * @access  Private/Student
 */
exports.bookAppointment = async (req, res, next) => {
  try {
    const { availabilityId } = req.body;

    if (!availabilityId) {
      return next(new ErrorResponse('Please provide availability ID', 400));
    }

    const availability = await Availability.findById(availabilityId);
    
    if (!availability) {
      return next(new ErrorResponse('Availability slot not found', 404));
    }

    if (availability.isBooked) {
      return next(new ErrorResponse('This time slot is already booked', 400));
    }

    if (availability.startTime <= new Date()) {
      return next(new ErrorResponse('Cannot book past time slots', 400));
    }

    // Create appointment
    const appointment = await Appointment.create({
      student: req.user._id,
      professor: availability.professor,
      availabilitySlot: availabilityId,
      appointmentTime: availability.startTime
    });

    // Mark availability as booked
    availability.isBooked = true;
    availability.bookedBy = req.user._id;
    await availability.save();

    await appointment.populate([
      { path: 'student', select: 'name email studentId' },
      { path: 'professor', select: 'name email department' },
      { path: 'availabilitySlot' }
    ]);

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel appointment (Professor only)
 * @route   PUT /api/appointments/:id/cancel
 * @access  Private/Professor
 */
exports.cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findOne({
      _id: id,
      professor: req.user._id,
      status: 'scheduled'
    });

    if (!appointment) {
      return next(new ErrorResponse('Appointment not found or already cancelled', 404));
    }

    // Update appointment status
    appointment.status = 'cancelled';
    appointment.cancelledBy = req.user._id;
    appointment.cancellationReason = reason || 'Cancelled by professor';
    await appointment.save();

    // Free up the availability slot
    await Availability.findByIdAndUpdate(
      appointment.availabilitySlot,
      { 
        isBooked: false,
        bookedBy: null
      }
    );

    await appointment.populate([
      { path: 'student', select: 'name email studentId' },
      { path: 'professor', select: 'name email department' }
    ]);

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's appointments
 * @route   GET /api/appointments/my-appointments
 * @access  Private/Student
 */
exports.getStudentAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({
      student: req.user._id
    })
      .populate([
        { path: 'professor', select: 'name email department' },
        { path: 'availabilitySlot' }
      ])
      .sort({ appointmentTime: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get professor's appointments
 * @route   GET /api/appointments/professor-appointments
 * @access  Private/Professor
 */
exports.getProfessorAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({
      professor: req.user._id
    })
      .populate([
        { path: 'student', select: 'name email studentId' },
        { path: 'availabilitySlot' }
      ])
      .sort({ appointmentTime: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};
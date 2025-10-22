const Availability = require('../models/Availability');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create availability slot
 * @route   POST /api/availability
 * @access  Private/Professor
 */
exports.createAvailability = async (req, res, next) => {
  try {
    const { startTime, endTime } = req.body;

    // Validate time range
    if (!startTime || !endTime) {
      return next(new ErrorResponse('Please provide start time and end time', 400));
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return next(new ErrorResponse('End time must be after start time', 400));
    }

    // Check for overlapping slots
    const overlappingSlot = await Availability.findOne({
      professor: req.user._id,
      $or: [
        {
          startTime: { $lt: new Date(endTime) },
          endTime: { $gt: new Date(startTime) }
        }
      ]
    });

    if (overlappingSlot) {
      return next(new ErrorResponse('Time slot overlaps with existing availability', 400));
    }

    const availability = await Availability.create({
      professor: req.user._id,
      startTime,
      endTime
    });

    await availability.populate('professor', 'name email department');

    res.status(201).json({
      success: true,
      data: availability
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available slots for a professor
 * @route   GET /api/availability/professor/:professorId
 * @access  Private
 */
exports.getProfessorAvailability = async (req, res, next) => {
  try {
    const { professorId } = req.params;

    const availabilities = await Availability.find({
      professor: professorId,
      isBooked: false,
      startTime: { $gt: new Date() }
    })
      .populate('professor', 'name email department')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: availabilities.length,
      data: availabilities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get professor's own availability slots
 * @route   GET /api/availability/my-availability
 * @access  Private/Professor
 */
exports.getMyAvailability = async (req, res, next) => {
  try {
    const availabilities = await Availability.find({
      professor: req.user._id
    })
      .populate('bookedBy', 'name email')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: availabilities.length,
      data: availabilities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete availability slot
 * @route   DELETE /api/availability/:id
 * @access  Private/Professor
 */
exports.deleteAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    const availability = await Availability.findOne({
      _id: id,
      professor: req.user._id
    });

    if (!availability) {
      return next(new ErrorResponse('Availability slot not found', 404));
    }

    if (availability.isBooked) {
      return next(new ErrorResponse('Cannot delete booked availability slot', 400));
    }

    await Availability.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
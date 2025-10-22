const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment');

describe('College Appointment System E2E Test', () => {
  let studentToken1;
  let studentToken2;
  let professorToken;
  let student1Id;
  let student2Id;
  let professorId;
  let availabilitySlotId;

  beforeAll(async () => {
    // Clear database before tests
    await User.deleteMany({});
    await Availability.deleteMany({});
    await Appointment.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('Complete user flow', async () => {
    console.log('\n=== Starting E2E Test ===\n');

    // 1. Student A1 authenticates to access the system
    console.log('1. Registering Student A1...');
    const student1Response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Student A1',
        email: 'studenta1@gmail.com',
        password: 'studenta1',
        role: 'student',
        studentId: 'S001'
      });
    
    expect(student1Response.status).toBe(201);
    expect(student1Response.body.success).toBe(true); // Check success flag
    expect(student1Response.body.token).toBeDefined();
    expect(student1Response.body.data).toBeDefined(); // Check data exists
    
    studentToken1 = student1Response.body.token;
    student1Id = student1Response.body.data.id; 
    console.log('✓ Student A1 registered successfully');

    // 2. Professor P1 authenticates to access the system
    console.log('2. Registering Professor P1...');
    const professorResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Professor P1',
        email: 'professorp1@gmail.com',
        password: 'professorp1',
        role: 'professor',
        department: 'Computer Science'
      });
    
    expect(professorResponse.status).toBe(201);
    expect(professorResponse.body.success).toBe(true);
    expect(professorResponse.body.token).toBeDefined();
    expect(professorResponse.body.data).toBeDefined();
    
    professorToken = professorResponse.body.token;
    professorId = professorResponse.body.data.id; 
    console.log('✓ Professor P1 registered successfully');

    // 3. Professor P1 specifies which time slots he is free for appointments
    console.log('3. Professor P1 adding availability slots...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const slot1End = new Date(tomorrow);
    slot1End.setHours(11, 0, 0, 0);

    const slot2End = new Date(tomorrow);
    slot2End.setHours(12, 0, 0, 0);
    slot2End.setHours(slot2End.getHours() + 1);

    const availabilityResponse = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({
        startTime: tomorrow.toISOString(),
        endTime: slot1End.toISOString()
      });
    
    expect(availabilityResponse.status).toBe(201);
    expect(availabilityResponse.body.success).toBe(true); // Check success flag
    availabilitySlotId = availabilityResponse.body.data?._id || availabilityResponse.body._id;
    console.log('✓ Professor P1 availability added successfully');

    // Add second slot for Student A2
    const availabilityResponse2 = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({
        startTime: slot1End.toISOString(),
        endTime: slot2End.toISOString()
      });
    
    expect(availabilityResponse2.status).toBe(201);
    console.log('✓ Second availability slot added');

    // 4. Student A1 views available time slots for Professor P1
    console.log('4. Student A1 viewing available slots...');
    const availabilitySlotsResponse = await request(app)
      .get(`/api/availability/professor/${professorId}`)
      .set('Authorization', `Bearer ${studentToken1}`);
    
    expect(availabilitySlotsResponse.status).toBe(200);
    expect(availabilitySlotsResponse.body.success).toBe(true); // Check success flag
    expect(availabilitySlotsResponse.body.data?.length).toBeGreaterThan(0);
    console.log('✓ Student A1 viewed available slots successfully');

    // 5. Student A1 books an appointment with Professor P1 for time T1
    console.log('5. Student A1 booking appointment...');
    const bookAppointmentResponse = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        availabilityId: availabilitySlotId
      });
    
    expect(bookAppointmentResponse.status).toBe(201);
    expect(bookAppointmentResponse.body.success).toBe(true);
    expect(bookAppointmentResponse.body.data?.status).toBe('scheduled');
    console.log('✓ Student A1 booked appointment successfully');

    // 6. Student A2 authenticates to access the system
    console.log('6. Registering Student A2...');
    const student2Response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Student A2',
        email: 'studenta2@gmail.com',
        password: 'studenta2',
        role: 'student',
        studentId: 'S002'
      });
    
    expect(student2Response.status).toBe(201);
    expect(student2Response.body.success).toBe(true);
    studentToken2 = student2Response.body.token;
    student2Id = student2Response.body.data.id; 
    console.log('✓ Student A2 registered successfully');

    // 7. Student A2 books an appointment with Professor P1 for time T2
    console.log('7. Student A2 booking appointment...');
    const bookAppointmentResponse2 = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({
        availabilityId: availabilityResponse2.body.data?._id || availabilityResponse2.body._id
      });
    
    expect(bookAppointmentResponse2.status).toBe(201);
    expect(bookAppointmentResponse2.body.success).toBe(true);
    expect(bookAppointmentResponse2.body.data?.status).toBe('scheduled');
    console.log('✓ Student A2 booked appointment successfully');

    // 8. Professor P1 cancels the appointment with Student A1
    console.log('8. Professor P1 cancelling appointment with Student A1...');
    const appointmentId = bookAppointmentResponse.body.data?._id || bookAppointmentResponse.body._id;
    
    const cancelAppointmentResponse = await request(app)
      .put(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({
        reason: 'Emergency meeting'
      });
    
    expect(cancelAppointmentResponse.status).toBe(200);
    expect(cancelAppointmentResponse.body.success).toBe(true);
    expect(cancelAppointmentResponse.body.data?.status).toBe('cancelled');
    console.log('✓ Professor P1 cancelled appointment successfully');

    // 9. Student A1 checks their appointments and realizes they do not have any pending appointments
    console.log('9. Student A1 checking appointments...');
    const studentAppointmentsResponse = await request(app)
      .get('/api/appointments/my-appointments')
      .set('Authorization', `Bearer ${studentToken1}`);
    
    expect(studentAppointmentsResponse.status).toBe(200);
    expect(studentAppointmentsResponse.body.success).toBe(true);
    
    // Check that Student A1 has no scheduled appointments
    const appointments = studentAppointmentsResponse.body.data || studentAppointmentsResponse.body;
    const scheduledAppointments = appointments.filter(
      appointment => appointment.status === 'scheduled'
    );
    
    expect(scheduledAppointments.length).toBe(0);
    console.log('✓ Student A1 has no pending appointments - verified');

    console.log('\n=== E2E Test Completed Successfully ===\n');
  });
});
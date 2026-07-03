import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Reset data (order matters for foreign keys)
  await prisma.systemSettings.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.entryLog.deleteMany();
  await prisma.visitRequest.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.gate.deleteMany();
  await prisma.user.deleteMany();

  // Create default settings
  await prisma.systemSettings.create({
    data: {
      id: 1,
      dataRetentionDays: 90,
      maxInsideDurationMinutes: 720, // 12 hours
    },
  });

  // Create Gates
  const gates = [
    { name: 'Main Gate', location: 'Campus Main Entrance' },
    { name: 'Gate No. 2', location: 'Near Academic Block A' },
    { name: 'Boys Hostel Gate', location: 'Hostel Gate' },
    { name: 'Girls Hostel Gate', location: 'Hostel Gate' },
  ];

  const dbGates = [];
  for (const gate of gates) {
    const dbGate = await prisma.gate.create({ data: gate });
    dbGates.push(dbGate);
  }
  console.log(`Seeded ${dbGates.length} gates.`);

  // Passwords hashing
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const guardPassword = await bcrypt.hash('guard123', salt);
  const facultyPassword = await bcrypt.hash('faculty123', salt);
  const studentPassword = await bcrypt.hash('student123', salt);

  // Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@abes.edu.in',
      passwordHash: adminPassword,
      name: 'Dr. Alok Singh (Security Head)',
      role: 'SECURITY_ADMIN',
      department: 'Admin',
      phone: '+919876543210',
      employeeCode: 'CSO1001',
      extensionNumber: '4001',
      post: 'Chief Security Officer',
    },
  });

  const guard1 = await prisma.user.create({
    data: {
      email: 'guard1@abes.edu.in',
      passwordHash: guardPassword,
      name: 'Ramesh Kumar',
      role: 'SECURITY_GUARD',
      idCardNumber: 'GRD001',
      status: 'ACTIVE',
      department: 'Staff',
      employeeCode: 'GRD2001',
      extensionNumber: '5001',
      post: 'Main Gate Guard',
    },
  });

  const guard2 = await prisma.user.create({
    data: {
      email: 'guard2@abes.edu.in',
      passwordHash: guardPassword,
      name: 'Suresh Pal',
      role: 'SECURITY_GUARD',
      idCardNumber: 'GRD002',
      status: 'ACTIVE',
      department: 'Staff',
      employeeCode: 'GRD2002',
      extensionNumber: '5002',
      post: 'Gate 2 Guard',
    },
  });

  const hodCS = await prisma.user.create({
    data: {
      email: 'hod.cs@abes.edu.in',
      passwordHash: facultyPassword,
      name: 'Dr. Sunita Sharma',
      role: 'DEPT_HEAD',
      department: 'Faculty',
      status: 'ACTIVE',
      phone: '+919988776655',
      employeeCode: 'FAC3001',
      extensionNumber: '2011',
      post: 'HOD Computer Science',
    },
  });

  const profVerma = await prisma.user.create({
    data: {
      email: 'prof.verma@abes.edu.in',
      passwordHash: facultyPassword,
      name: 'Prof. Rajesh Verma',
      role: 'FACULTY',
      department: 'Faculty',
      status: 'ACTIVE',
      phone: '+919988776656',
      employeeCode: 'FAC3002',
      extensionNumber: '2012',
      post: 'Assistant Professor',
    },
  });

  const admissionsHead = await prisma.user.create({
    data: {
      email: 'admissions@abes.edu.in',
      passwordHash: facultyPassword,
      name: 'Mr. Sanjay Gupta',
      role: 'DEPT_HEAD',
      department: 'Admin',
      status: 'ACTIVE',
      phone: '+919988776657',
      employeeCode: 'ADM4001',
      extensionNumber: '1002',
      post: 'Admissions Lead',
    },
  });

  const accountsHead = await prisma.user.create({
    data: {
      email: 'accounts@abes.edu.in',
      passwordHash: facultyPassword,
      name: 'Mrs. Neha Bajaj',
      role: 'FACULTY',
      department: 'Accounts',
      status: 'ACTIVE',
      phone: '+919988776658',
      employeeCode: 'ACC5001',
      extensionNumber: '1020',
      post: 'Senior Accountant',
    },
  });

  console.log('Seeded operational accounts.');

  // Create Mock Cardholders (Students & Staff)
  const students = [
    {
      email: 'student1@abes.edu.in',
      passwordHash: studentPassword,
      name: 'Aarav Mehta',
      role: 'FACULTY', // Using FACULTY role as student placeholder due to DB Role constraints
      idCardNumber: 'ABES2026CS101',
      department: 'Faculty',
      status: 'ACTIVE',
      phone: '+919812345670',
      employeeCode: 'STU9001',
      extensionNumber: '9001',
      post: 'Student (CS)',
    },
    {
      email: 'student2@abes.edu.in',
      passwordHash: studentPassword,
      name: 'Isha Patel',
      role: 'FACULTY',
      idCardNumber: 'ABES2026IT205',
      department: 'Faculty',
      status: 'ACTIVE',
      phone: '+919812345671',
      employeeCode: 'STU9002',
      extensionNumber: '9002',
      post: 'Student (IT)',
    },
    {
      email: 'student3@abes.edu.in',
      passwordHash: studentPassword,
      name: 'Rohan Sharma',
      role: 'FACULTY',
      idCardNumber: 'ABES2026EC032',
      department: 'Faculty',
      status: 'SUSPENDED',
      phone: '+919812345672',
      employeeCode: 'STU9003',
      extensionNumber: '9003',
      post: 'Student (ECE)',
    },
    {
      email: 'employee1@abes.edu.in',
      passwordHash: studentPassword,
      name: 'Verghese Kurien',
      role: 'FACULTY',
      idCardNumber: 'ABESEMP204',
      department: 'HR',
      status: 'ACTIVE',
      phone: '+919812345673',
      employeeCode: 'HR6001',
      extensionNumber: '3004',
      post: 'HR Manager',
    },
  ];

  const dbStudents = [];
  for (const stu of students) {
    const s = await prisma.user.create({ data: stu });
    dbStudents.push(s);
  }
  console.log(`Seeded ${dbStudents.length} students/staff.`);

  // Create Vehicles
  const vehicles = [
    {
      stickerNumber: 'STK2026A99',
      ownerId: dbStudents[0].id,
      vehicleType: 'TWO_WHEELER',
      plateNumber: 'UP-16-AB-1234',
      status: 'ACTIVE',
    },
    {
      stickerNumber: 'STK2026B88',
      ownerId: dbStudents[1].id,
      vehicleType: 'FOUR_WHEELER',
      plateNumber: 'DL-3C-CD-5678',
      status: 'ACTIVE',
    },
    {
      stickerNumber: 'STK2026C77',
      ownerId: dbStudents[2].id, // Rohan, who is suspended
      vehicleType: 'TWO_WHEELER',
      plateNumber: 'UP-14-XY-9999',
      status: 'INACTIVE',
    },
    {
      stickerNumber: 'STK2026DELIVERY',
      ownerId: null,
      vehicleType: 'DELIVERY',
      plateNumber: 'MH-12-PQ-8888',
      status: 'ACTIVE',
    },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.create({ data: v });
  }
  console.log('Seeded vehicles.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

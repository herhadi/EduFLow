import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  const permissions = await Promise.all(
    [
      'auth.session.manage',
      'academic.read',
      'academic.manage',
      'schedule.read',
      'schedule.manage',
      'agenda.read',
      'agenda.generate',
      'attendance.read',
      'attendance.manage',
      'class-status.read',
      'class-status.manage',
      'notification.read',
      'notification.manage',
      'reporting.read',
      'reporting.manage',
      'audit.read',
      'user.manage',
    ].map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eduflow.local' },
    update: {},
    create: {
      email: 'admin@eduflow.local',
      name: 'Admin EduFlow',
      password: await hash('password123', 12),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: '2026/2027' },
    update: {},
    create: {
      name: '2026/2027',
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      endsAt: new Date('2027-06-30T00:00:00.000Z'),
    },
  });

  const semester = await prisma.semester.upsert({
    where: {
      schoolYearId_type: {
        schoolYearId: schoolYear.id,
        type: 'ODD',
      },
    },
    update: {},
    create: {
      schoolYearId: schoolYear.id,
      type: 'ODD',
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-20T00:00:00.000Z'),
    },
  });

  const schoolClass = await prisma.class.upsert({
    where: {
      schoolYearId_name: {
        schoolYearId: schoolYear.id,
        name: 'VII-A',
      },
    },
    update: {},
    create: {
      schoolYearId: schoolYear.id,
      name: 'VII-A',
      grade: 'VII',
    },
  });

  const subject = await prisma.subject.upsert({
    where: { code: 'MAT' },
    update: {},
    create: {
      code: 'MAT',
      name: 'Matematika',
    },
  });

  const teacher = await prisma.teacher.create({
    data: { name: 'Guru Demo' },
  });

  const student = await prisma.student.create({
    data: { name: 'Siswa Demo' },
  });

  await prisma.studentEnrollment.upsert({
    where: {
      studentId_classId_schoolYearId: {
        studentId: student.id,
        classId: schoolClass.id,
        schoolYearId: schoolYear.id,
      },
    },
    update: { isActive: true, endedAt: null },
    create: {
      studentId: student.id,
      classId: schoolClass.id,
      schoolYearId: schoolYear.id,
      isActive: true,
    },
  });

  const guardian = await prisma.guardian.create({
    data: {
      name: 'Wali Murid Demo',
      phone: '09561186917',
      telegramId: '648351920',
    },
  });

  await prisma.studentGuardian.upsert({
    where: {
      studentId_guardianId: {
        studentId: student.id,
        guardianId: guardian.id,
      },
    },
    update: { isPrimary: true },
    create: {
      studentId: student.id,
      guardianId: guardian.id,
      relation: 'GUARDIAN',
      isPrimary: true,
    },
  });

  await prisma.schedule.create({
    data: {
      schoolYearId: schoolYear.id,
      semesterId: semester.id,
      classId: schoolClass.id,
      subjectId: subject.id,
      teacherId: teacher.id,
      dayOfWeek: 1,
      startsAt: '07:00',
      endsAt: '08:30',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });


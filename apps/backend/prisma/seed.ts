import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const rolePermissions: Record<string, string[]> = {
    root: [
      'auth.session.manage',
      'academic.read',
      'academic.manage',
      'academic-calendar.read',
      'academic-calendar.manage',
      'schedule.read',
      'schedule.manage',
      'teaching-plan.read',
      'teaching-plan.manage',
      'teaching-plan.review',
      'student-grade.read',
      'student-grade.manage',
      'student-grade.approve',
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
    ],
    operator_sekolah: [
      'auth.session.manage',
      'academic.read',
      'academic.manage',
      'academic-calendar.read',
      'academic-calendar.manage',
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
    ],
    guru: [
      'auth.session.manage',
      'academic.read',
      'academic-calendar.read',
      'schedule.read',
      'teaching-plan.read',
      'teaching-plan.manage',
      'student-grade.read',
      'student-grade.manage',
      'agenda.read',
      'attendance.read',
      'attendance.manage',
      'class-status.read',
    ],
    wali_kelas: [
      'auth.session.manage',
      'academic.read',
      'academic-calendar.read',
      'schedule.read',
      'teaching-plan.read',
      'student-grade.read',
      'agenda.read',
      'attendance.read',
      'class-status.read',
      'notification.read',
      'reporting.read',
    ],
    kepala_sekolah: [
      'auth.session.manage',
      'academic.read',
      'academic-calendar.read',
      'schedule.read',
      'teaching-plan.read',
      'teaching-plan.review',
      'student-grade.read',
      'student-grade.approve',
      'agenda.read',
      'attendance.read',
      'class-status.read',
      'notification.read',
      'reporting.read',
      'audit.read',
    ],
    tu: [
      'auth.session.manage',
      'academic.read',
      'academic.manage',
      'academic-calendar.read',
      'academic-calendar.manage',
      'schedule.read',
      'notification.read',
      'reporting.read',
    ],
    bk: [
      'auth.session.manage',
      'academic.read',
      'academic-calendar.read',
      'student-grade.read',
      'attendance.read',
      'class-status.read',
      'reporting.read',
    ],
    orang_tua: [
      'auth.session.manage',
      'student-grade.read',
      'attendance.read',
    ],
  };

  const permissions = await Promise.all(
    [...new Set(Object.values(rolePermissions).flat())].map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );
  const permissionsByKey = new Map(
    permissions.map((permission) => [permission.key, permission]),
  );

  const roles = await Promise.all(
    Object.keys(rolePermissions).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  const rolesByName = new Map(roles.map((role) => [role.name, role]));

  for (const [roleName, permissionKeys] of Object.entries(rolePermissions)) {
    const role = rolesByName.get(roleName);
    if (!role) {
      continue;
    }

    await Promise.all(
      permissionKeys.map((permissionKey) => {
        const permission = permissionsByKey.get(permissionKey);
        if (!permission) {
          throw new Error(`Permission ${permissionKey} tidak ditemukan`);
        }

        return prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }),
    );
  }

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
        roleId: rolesByName.get('root')!.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: rolesByName.get('root')!.id,
    },
  });

  await migrateLegacyRole('admin', 'root', rolesByName);
  await migrateLegacyRole('operator', 'operator_sekolah', rolesByName);

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

  const existingActiveTeacher = await prisma.teacher.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const teacher =
    existingActiveTeacher ??
    (await prisma.teacher.create({
      data: { name: 'Guru Demo' },
    }));
  const shouldCreateDemoSchedule = teacher.name === 'Guru Demo';

  const student =
    (await prisma.student.findFirst({
      where: { name: 'Siswa Demo', deletedAt: null },
    })) ??
    (await prisma.student.create({
      data: { name: 'Siswa Demo' },
    }));

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

  const guardian =
    (await prisma.guardian.findFirst({
      where: { phone: '08561186917', deletedAt: null },
    })) ??
    (await prisma.guardian.create({
      data: {
        name: 'Wali Murid Demo',
        phone: '08561186917',
        telegramId: '648351920',
      },
    }));

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

  if (shouldCreateDemoSchedule) {
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        schoolYearId: schoolYear.id,
        semesterId: semester.id,
        classId: schoolClass.id,
        subjectId: subject.id,
        teacherId: teacher.id,
        dayOfWeek: 1,
        startsAt: '07:00',
        endsAt: '08:30',
        deletedAt: null,
      },
    });

    if (!existingSchedule) {
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
  }
}

async function migrateLegacyRole(
  legacyRoleName: string,
  targetRoleName: string,
  rolesByName: Map<string, { id: string; name: string }>,
) {
  const legacyRole = await prisma.role.findUnique({
    where: { name: legacyRoleName },
    include: { users: true },
  });
  const targetRole = rolesByName.get(targetRoleName);

  if (!legacyRole || !targetRole) {
    return;
  }

  await Promise.all(
    legacyRole.users.map((userRole) =>
      prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: userRole.userId,
            roleId: targetRole.id,
          },
        },
        update: {},
        create: {
          userId: userRole.userId,
          roleId: targetRole.id,
        },
      }),
    ),
  );

  await prisma.userRole.deleteMany({ where: { roleId: legacyRole.id } });
  await prisma.rolePermission.deleteMany({ where: { roleId: legacyRole.id } });
  await prisma.role.delete({ where: { id: legacyRole.id } });
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

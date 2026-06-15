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

  const rootUser = await prisma.user.upsert({
    where: { email: 'herhadi@eduflow.local' },
    update: {
      username: 'herhadi',
      name: 'Herhadi',
      password: await hash('xSalakRt02', 12),
      deletedAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: 'herhadi@eduflow.local',
      username: 'herhadi',
      name: 'Herhadi',
      password: await hash('xSalakRt02', 12),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: rootUser.id,
        roleId: rolesByName.get('root')!.id,
      },
    },
    update: {},
    create: {
      userId: rootUser.id,
      roleId: rolesByName.get('root')!.id,
    },
  });

  await migrateLegacyRole('admin', 'root', rolesByName);
  await migrateLegacyRole('operator', 'operator_sekolah', rolesByName);

  const subjects = [
    { code: 'PPKN', name: 'PPKn' },
    { code: 'PJOK', name: 'PJOK' },
    { code: 'PKY', name: 'Prakarya' },
    { code: 'IPA', name: 'IPA' },
    { code: 'IPS', name: 'IPS' },
    { code: 'TIK', name: 'TIK' },
    { code: 'SBD', name: 'Seni Budaya' },
    { code: 'BJW', name: 'Bahasa Jawa' },
    { code: 'BIN', name: 'Bahasa Indonesia' },
    { code: 'BIG', name: 'Bahasa Inggris' },
    { code: 'PAI', name: 'Pendidikan Agama Islam' },
    { code: 'MAT', name: 'Matematika' },
  ];

  await Promise.all(
    subjects.map((subject) =>
      prisma.subject.upsert({
        where: { code: subject.code },
        update: {
          name: subject.name,
          isActive: true,
          deletedAt: null,
        },
        create: {
          code: subject.code,
          name: subject.name,
          isActive: true,
        },
      }),
    ),
  );

  const schoolYears = await prisma.schoolYear.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  const regularWeekdaySlots = [
    [1, 'Jam ke-1', 'LESSON', '07:00', '07:50', true],
    [2, 'Jam ke-2', 'LESSON', '07:50', '08:30', true],
    [3, 'Jam ke-3', 'LESSON', '08:30', '09:10', true],
    [null, 'Istirahat', 'BREAK', '09:10', '09:30', false],
    [4, 'Jam ke-4', 'LESSON', '09:30', '10:10', true],
    [5, 'Jam ke-5', 'LESSON', '10:10', '10:50', true],
    [6, 'Jam ke-6', 'LESSON', '10:50', '11:30', true],
    [null, "Istirahat / Sholat Berjamaah", 'RELIGIOUS', '11:30', '12:10', false],
    [7, 'Jam ke-7', 'LESSON', '12:10', '12:50', true],
    [8, 'Jam ke-8', 'LESSON', '12:50', '13:30', true],
  ] as const;
  const fridaySlots = [
    [1, 'Kokurikuler ke-1', 'CO_CURRICULAR', '07:00', '07:50', true],
    [2, 'Kokurikuler ke-2', 'CO_CURRICULAR', '07:50', '08:30', true],
    [3, 'Kokurikuler ke-3', 'CO_CURRICULAR', '08:30', '09:10', true],
    [null, 'Istirahat', 'BREAK', '09:10', '09:40', false],
    [4, 'Kokurikuler ke-4', 'CO_CURRICULAR', '09:40', '10:20', true],
    [5, 'Kokurikuler ke-5', 'CO_CURRICULAR', '10:20', '11:00', true],
  ] as const;
  const saturdaySlots = [
    [1, 'Jam ke-1', 'LESSON', '07:00', '07:50', true],
    [2, 'Jam ke-2', 'LESSON', '07:50', '08:30', true],
    [null, 'Istirahat', 'BREAK', '08:30', '08:50', false],
    [3, 'Jam ke-3', 'LESSON', '08:50', '09:30', true],
    [4, 'Jam ke-4', 'LESSON', '09:30', '10:10', true],
    [null, 'Istirahat', 'BREAK', '10:10', '10:50', false],
    [5, 'Jam ke-5', 'LESSON', '10:50', '11:30', true],
    [6, 'Jam ke-6', 'LESSON', '11:30', '12:10', true],
  ] as const;

  for (const schoolYear of schoolYears) {
    for (const dayOfWeek of [1, 2, 3, 4]) {
      for (const slot of regularWeekdaySlots) {
        const [periodNumber, defaultName, defaultType, startsAt, endsAt, isAssignable] = slot;
        const isMondayCeremony = dayOfWeek === 1 && periodNumber === 1;
        const isTuesdayExercise = dayOfWeek === 2 && periodNumber === 1;
        const name = isMondayCeremony
          ? 'Upacara'
          : isTuesdayExercise
            ? 'Senam Bersama'
            : defaultName;
        const type = isMondayCeremony
          ? 'CEREMONY'
          : isTuesdayExercise
            ? 'EXERCISE'
            : defaultType;

        await prisma.academicTimeSlot.upsert({
          where: {
            schoolYearId_dayOfWeek_startsAt_endsAt: {
              schoolYearId: schoolYear.id,
              dayOfWeek,
              startsAt,
              endsAt,
            },
          },
          update: {
            periodNumber,
            name,
            type,
            isAssignable: isMondayCeremony || isTuesdayExercise ? false : isAssignable,
            isActive: true,
            deletedAt: null,
          },
          create: {
            schoolYearId: schoolYear.id,
            dayOfWeek,
            periodNumber,
            name,
            type,
            startsAt,
            endsAt,
            isAssignable: isMondayCeremony || isTuesdayExercise ? false : isAssignable,
          },
        });
      }
    }

    for (const [dayOfWeek, slots] of [[5, fridaySlots], [6, saturdaySlots]] as const) {
      for (const [periodNumber, name, type, startsAt, endsAt, isAssignable] of slots) {
        await prisma.academicTimeSlot.upsert({
          where: {
            schoolYearId_dayOfWeek_startsAt_endsAt: {
              schoolYearId: schoolYear.id,
              dayOfWeek,
              startsAt,
              endsAt,
            },
          },
          update: { periodNumber, name, type, isAssignable, isActive: true, deletedAt: null },
          create: {
            schoolYearId: schoolYear.id,
            dayOfWeek,
            periodNumber,
            name,
            type,
            startsAt,
            endsAt,
            isAssignable,
          },
        });
      }
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

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

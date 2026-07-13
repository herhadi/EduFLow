import {
  AgendaStatus,
  AssessmentStatus,
  AttendanceState,
  AttendanceStatus,
  Gender,
  GuardianRelation,
  PrismaClient,
  SemesterType,
  TeachingPlanStatus,
  TeachingPlanType,
} from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const defaultPassword = process.env.DEFAULT_USER_PASSWORD ?? '123456';
const schoolYearName = process.env.UAT_SCHOOL_YEAR ?? '2026/2027';
const className = 'VII UAT';
const timezoneOffsetMinutes = Number(process.env.SCHOOL_TIMEZONE_OFFSET_MINUTES ?? 420);
const today = toSchoolDateOnly(new Date());
const dayOfWeek = getDayOfWeek(today);

async function main() {
  const roles = await ensureRoles(['kepala_sekolah', 'guru', 'wali_kelas', 'orang_tua']);
  const password = await hash(defaultPassword, 12);
  const schoolYear = await ensureSchoolYear(schoolYearName);
  const semester = await ensureSemester(schoolYear.id, today);
  const subjects = await ensureSubjects();
  const timeSlots = await ensureTimeSlots(schoolYear.id);
  const principalUser = await ensureUser({
    email: 'uat.ks@eduflow.local',
    name: 'UAT Kepala Sekolah',
    password,
    roleIds: [roles.kepala_sekolah.id],
    username: 'uat.ks',
  });
  const teacherUser = await ensureUser({
    email: 'uat.guru1@eduflow.local',
    name: 'UAT Guru Matematika',
    password,
    roleIds: [roles.guru.id, roles.wali_kelas.id],
    username: 'uat.guru1',
  });
  const teacherTwoUser = await ensureUser({
    email: 'uat.guru2@eduflow.local',
    name: 'UAT Guru IPA',
    password,
    roleIds: [roles.guru.id],
    username: 'uat.guru2',
  });
  const substituteUser = await ensureUser({
    email: 'uat.guru3@eduflow.local',
    name: 'UAT Guru Pengganti',
    password,
    roleIds: [roles.guru.id],
    username: 'uat.guru3',
  });
  const parentUser = await ensureUser({
    email: 'uat.wali01@eduflow.local',
    name: 'UAT Wali 01',
    password,
    roleIds: [roles.orang_tua.id],
    username: 'uat.parent1',
  });

  const teacher = await ensureTeacher({
    email: teacherUser.email,
    name: teacherUser.name,
    nip: 'UAT-GURU-001',
    phone: '0800000001',
    userId: teacherUser.id,
  });
  const teacherTwo = await ensureTeacher({
    email: teacherTwoUser.email,
    name: teacherTwoUser.name,
    nip: 'UAT-GURU-002',
    phone: '0800000002',
    userId: teacherTwoUser.id,
  });
  const substituteTeacher = await ensureTeacher({
    email: substituteUser.email,
    name: substituteUser.name,
    nip: 'UAT-GURU-003',
    phone: '0800000003',
    userId: substituteUser.id,
  });

  await ensureTeacherAssignment(teacher.id, schoolYear.id, [subjects.math.id]);
  await ensureTeacherAssignment(teacherTwo.id, schoolYear.id, [subjects.science.id]);
  await ensureTeacherAssignment(substituteTeacher.id, schoolYear.id, [subjects.math.id, subjects.science.id]);

  const schoolClass = await prisma.class.upsert({
    where: { schoolYearId_name: { schoolYearId: schoolYear.id, name: className } },
    update: {
      code: 'VII-UAT',
      grade: 'VII',
      homeroomTeacherId: teacher.id,
      deletedAt: null,
    },
    create: {
      schoolYearId: schoolYear.id,
      code: 'VII-UAT',
      grade: 'VII',
      name: className,
      homeroomTeacherId: teacher.id,
    },
  });

  const enrollments = await ensureStudents(schoolYear.id, schoolClass.id);

  const schedules = await Promise.all([
    ensureSchedule({
      classId: schoolClass.id,
      dayOfWeek,
      semesterId: semester.id,
      schoolYearId: schoolYear.id,
      subjectId: subjects.math.id,
      teacherId: teacher.id,
      timeSlotId: timeSlots[0].id,
    }),
    ensureSchedule({
      classId: schoolClass.id,
      dayOfWeek,
      semesterId: semester.id,
      schoolYearId: schoolYear.id,
      subjectId: subjects.science.id,
      teacherId: teacherTwo.id,
      timeSlotId: timeSlots[1].id,
    }),
    ensureSchedule({
      classId: schoolClass.id,
      dayOfWeek,
      semesterId: semester.id,
      schoolYearId: schoolYear.id,
      subjectId: subjects.science.id,
      teacherId: teacherTwo.id,
      timeSlotId: timeSlots[2].id,
    }),
    ensureSchedule({
      classId: schoolClass.id,
      dayOfWeek,
      semesterId: semester.id,
      schoolYearId: schoolYear.id,
      subjectId: subjects.math.id,
      teacherId: teacher.id,
      timeSlotId: timeSlots[3].id,
    }),
  ]);

  const completedAgenda = await ensureAgenda({
    classId: schoolClass.id,
    schoolYearId: schoolYear.id,
    semesterId: semester.id,
    status: AgendaStatus.COMPLETED,
    substituteTeacherId: null,
    scheduleId: schedules[0].id,
    subjectId: subjects.math.id,
    teacherId: teacher.id,
  });
  await ensureAttendance({
    agendaId: completedAgenda.id,
    classId: schoolClass.id,
    enrollments,
    issueNotes: null,
    state: AttendanceState.SUBMITTED,
    submittedById: teacherUser.id,
    teacherPresent: true,
    studentAttendanceDone: true,
    materialFilled: true,
    classPhotoDone: true,
  });

  const issueAgenda = await ensureAgenda({
    classId: schoolClass.id,
    schoolYearId: schoolYear.id,
    semesterId: semester.id,
    status: AgendaStatus.IN_PROGRESS,
    substituteTeacherId: null,
    scheduleId: schedules[1].id,
    subjectId: subjects.science.id,
    teacherId: teacherTwo.id,
  });
  await ensureAttendance({
    agendaId: issueAgenda.id,
    classId: schoolClass.id,
    enrollments,
    issueNotes: 'UAT: LCD kelas tidak menyala, materi tetap berjalan dengan papan tulis.',
    state: AttendanceState.SUBMITTED,
    submittedById: teacherTwoUser.id,
    teacherPresent: true,
    studentAttendanceDone: true,
    materialFilled: true,
    classPhotoDone: false,
  });

  await ensureAgenda({
    classId: schoolClass.id,
    schoolYearId: schoolYear.id,
    semesterId: semester.id,
    status: AgendaStatus.EMPTY,
    substituteTeacherId: null,
    scheduleId: schedules[2].id,
    subjectId: subjects.science.id,
    teacherId: teacherTwo.id,
  });

  await ensureAgenda({
    classId: schoolClass.id,
    schoolYearId: schoolYear.id,
    semesterId: semester.id,
    status: AgendaStatus.SCHEDULED,
    substituteTeacherId: substituteTeacher.id,
    scheduleId: schedules[3].id,
    subjectId: subjects.math.id,
    teacherId: teacher.id,
  });

  await ensureTeachingPlan({
    schoolYearId: schoolYear.id,
    semesterId: semester.id,
    subjectId: subjects.math.id,
    teacherId: teacher.id,
  });
  await ensureAssessment({
    classId: schoolClass.id,
    enrollments,
    schoolYearId: schoolYear.id,
    semesterId: semester.id,
    subjectId: subjects.math.id,
    submittedById: teacherUser.id,
    teacherId: teacher.id,
  });

  console.log(JSON.stringify({
    message: 'Data UAT EduFlow siap.',
    login: [
      { username: principalUser.username, role: 'kepala_sekolah', password: defaultPassword },
      { username: teacherUser.username, role: 'guru + wali_kelas', password: defaultPassword },
      { username: teacherTwoUser.username, role: 'guru', password: defaultPassword },
      { username: substituteUser.username, role: 'guru pengganti', password: defaultPassword },
      { username: parentUser.username, role: 'orang_tua', password: defaultPassword },
    ],
    date: today.toISOString().slice(0, 10),
    className,
    scenario: {
      emptyClass: 1,
      notSubmittedAgenda: 2,
      issueNotes: 1,
      substituteTeacher: 1,
      teachingPlanReviewQueue: 1,
      assessmentSubmitted: 1,
      students: enrollments.length,
      parentChildren: 2,
    },
  }, null, 2));
}

async function ensureRoles(roleNames: string[]) {
  const entries = await Promise.all(roleNames.map((name) =>
    prisma.role.upsert({ where: { name }, update: {}, create: { name } }),
  ));

  return Object.fromEntries(entries.map((role) => [role.name, role])) as Record<string, { id: string; name: string }>;
}

async function ensureUser(input: {
  email: string;
  name: string;
  password: string;
  roleIds: string[];
  username: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      username: input.username,
      name: input.name,
      password: input.password,
      deletedAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: input.email,
      username: input.username,
      name: input.name,
      password: input.password,
    },
  });

  await Promise.all(input.roleIds.map((roleId) =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    }),
  ));

  return user;
}

async function ensureSchoolYear(name: string) {
  const [startYearText, endYearText] = name.split('/');
  const startYear = Number(startYearText);
  const endYear = Number(endYearText);

  return prisma.schoolYear.upsert({
    where: { name },
    update: {
      startsAt: new Date(startYear, 6, 1),
      endsAt: new Date(endYear, 5, 30, 23, 59, 59, 999),
      deletedAt: null,
    },
    create: {
      name,
      startsAt: new Date(startYear, 6, 1),
      endsAt: new Date(endYear, 5, 30, 23, 59, 59, 999),
    },
  });
}

async function ensureSemester(schoolYearId: string, date: Date) {
  const schoolYear = await prisma.schoolYear.findUniqueOrThrow({ where: { id: schoolYearId } });
  const startYear = schoolYear.startsAt.getFullYear();
  const endYear = schoolYear.endsAt.getFullYear();

  await prisma.semester.upsert({
    where: { schoolYearId_type: { schoolYearId, type: SemesterType.ODD } },
    update: {
      startsAt: new Date(startYear, 6, 1),
      endsAt: new Date(startYear, 11, 31, 23, 59, 59, 999),
      deletedAt: null,
    },
    create: {
      schoolYearId,
      type: SemesterType.ODD,
      startsAt: new Date(startYear, 6, 1),
      endsAt: new Date(startYear, 11, 31, 23, 59, 59, 999),
    },
  });
  await prisma.semester.upsert({
    where: { schoolYearId_type: { schoolYearId, type: SemesterType.EVEN } },
    update: {
      startsAt: new Date(endYear, 0, 1),
      endsAt: new Date(endYear, 5, 30, 23, 59, 59, 999),
      deletedAt: null,
    },
    create: {
      schoolYearId,
      type: SemesterType.EVEN,
      startsAt: new Date(endYear, 0, 1),
      endsAt: new Date(endYear, 5, 30, 23, 59, 59, 999),
    },
  });

  return prisma.semester.findFirstOrThrow({
    where: {
      schoolYearId,
      startsAt: { lte: date },
      endsAt: { gte: date },
      deletedAt: null,
    },
  });
}

async function ensureSubjects() {
  const [math, science] = await Promise.all([
    prisma.subject.upsert({
      where: { code: 'UAT-MAT' },
      update: { name: 'UAT Matematika', isActive: true, deletedAt: null },
      create: { code: 'UAT-MAT', name: 'UAT Matematika', isActive: true },
    }),
    prisma.subject.upsert({
      where: { code: 'UAT-IPA' },
      update: { name: 'UAT IPA', isActive: true, deletedAt: null },
      create: { code: 'UAT-IPA', name: 'UAT IPA', isActive: true },
    }),
  ]);

  return { math, science };
}

async function ensureTimeSlots(schoolYearId: string) {
  const slots = [
    [1, 'UAT Jam ke-1', '07:00', '07:40'],
    [2, 'UAT Jam ke-2', '07:45', '08:25'],
    [3, 'UAT Jam ke-3', '08:30', '09:10'],
    [4, 'UAT Jam ke-4', '09:15', '09:55'],
  ] as const;

  return Promise.all(slots.map(([periodNumber, name, startsAt, endsAt]) =>
    prisma.academicTimeSlot.upsert({
      where: {
        schoolYearId_dayOfWeek_startsAt_endsAt: {
          schoolYearId,
          dayOfWeek,
          startsAt,
          endsAt,
        },
      },
      update: {
        periodNumber,
        name,
        type: 'LESSON',
        isAssignable: true,
        isActive: true,
        deletedAt: null,
      },
      create: {
        schoolYearId,
        dayOfWeek,
        periodNumber,
        name,
        type: 'LESSON',
        startsAt,
        endsAt,
        isAssignable: true,
      },
    }),
  ));
}

async function ensureTeacher(input: {
  email: string;
  name: string;
  nip: string;
  phone: string;
  userId: string;
}) {
  return prisma.teacher.upsert({
    where: { nip: input.nip },
    update: {
      userId: input.userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      isActive: true,
      deletedAt: null,
    },
    create: {
      userId: input.userId,
      name: input.name,
      nip: input.nip,
      email: input.email,
      phone: input.phone,
      isActive: true,
    },
  });
}

async function ensureTeacherAssignment(teacherId: string, schoolYearId: string, subjectIds: string[]) {
  await Promise.all(subjectIds.map((subjectId) =>
    prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId, subjectId } },
      update: {},
      create: { teacherId, subjectId },
    }),
  ));

  const assignment = await prisma.teacherSchoolYearAssignment.upsert({
    where: { teacherId_schoolYearId: { teacherId, schoolYearId } },
    update: { status: 'ACTIVE', notes: 'UAT aktif' },
    create: { teacherId, schoolYearId, status: 'ACTIVE', notes: 'UAT aktif' },
  });

  await Promise.all(subjectIds.map((subjectId) =>
    prisma.teacherSchoolYearSubject.upsert({
      where: { assignmentId_subjectId: { assignmentId: assignment.id, subjectId } },
      update: {},
      create: { assignmentId: assignment.id, subjectId },
    }),
  ));
}

async function ensureStudents(schoolYearId: string, classId: string) {
  const enrollments = [];

  for (let index = 1; index <= 8; index += 1) {
    const number = String(index).padStart(2, '0');
    const student = await prisma.student.upsert({
      where: { nis: `UAT-SISWA-${number}` },
      update: {
        name: `UAT Siswa ${number}`,
        nisn: `UAT-NISN-${number}`,
        gender: index % 2 === 0 ? Gender.FEMALE : Gender.MALE,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: `UAT Siswa ${number}`,
        nis: `UAT-SISWA-${number}`,
        nisn: `UAT-NISN-${number}`,
        gender: index % 2 === 0 ? Gender.FEMALE : Gender.MALE,
        birthDate: new Date(2013, index % 12, index),
      },
    });
    const guardianNumber = index <= 2 ? '01' : number;
    const guardianEmail = `uat.wali${guardianNumber}@eduflow.local`;
    const guardianId = await getGuardianId(guardianEmail);
    const guardian = await prisma.guardian.upsert({
      where: { id: guardianId },
      update: {
        name: `UAT Wali ${guardianNumber}`,
        phone: `08120000${guardianNumber}`,
        email: guardianEmail,
        isActive: true,
        deletedAt: null,
      },
      create: {
        id: guardianId,
        name: `UAT Wali ${guardianNumber}`,
        phone: `08120000${guardianNumber}`,
        email: guardianEmail,
        isActive: true,
      },
    });

    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId: student.id, guardianId: guardian.id } },
      update: { relation: GuardianRelation.GUARDIAN, isPrimary: true, deletedAt: null },
      create: {
        studentId: student.id,
        guardianId: guardian.id,
        relation: GuardianRelation.GUARDIAN,
        isPrimary: true,
      },
    });

    enrollments.push(await prisma.studentEnrollment.upsert({
      where: { studentId_classId_schoolYearId: { studentId: student.id, classId, schoolYearId } },
      update: { isActive: true, endedAt: null, deletedAt: null },
      create: { studentId: student.id, classId, schoolYearId, isActive: true, startedAt: today },
      include: { student: true },
    }));
  }

  return enrollments;
}

async function getGuardianId(email: string) {
  const existing = await prisma.guardian.findFirst({
    where: { email, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return existing?.id ?? randomUUID();
}

async function ensureSchedule(input: {
  classId: string;
  dayOfWeek: number;
  schoolYearId: string;
  semesterId: string;
  subjectId: string;
  teacherId: string;
  timeSlotId: string;
}) {
  const timeSlot = await prisma.academicTimeSlot.findUniqueOrThrow({ where: { id: input.timeSlotId } });
  const existing = await prisma.schedule.findFirst({
    where: {
      classId: input.classId,
      dayOfWeek: input.dayOfWeek,
      startsAt: timeSlot.startsAt,
      endsAt: timeSlot.endsAt,
      deletedAt: null,
    },
  });

  if (existing) {
    return prisma.schedule.update({
      where: { id: existing.id },
      data: {
        schoolYearId: input.schoolYearId,
        semesterId: input.semesterId,
        subjectId: input.subjectId,
        teacherId: input.teacherId,
        timeSlotId: input.timeSlotId,
        isActive: true,
        room: 'UAT',
      },
    });
  }

  return prisma.schedule.create({
    data: {
      schoolYearId: input.schoolYearId,
      semesterId: input.semesterId,
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      timeSlotId: input.timeSlotId,
      dayOfWeek: input.dayOfWeek,
      startsAt: timeSlot.startsAt,
      endsAt: timeSlot.endsAt,
      room: 'UAT',
      isActive: true,
    },
  });
}

async function ensureAgenda(input: {
  classId: string;
  schoolYearId: string;
  semesterId: string;
  status: AgendaStatus;
  substituteTeacherId: string | null;
  scheduleId: string;
  subjectId: string;
  teacherId: string;
}) {
  return prisma.dailyAgenda.upsert({
    where: { scheduleId_date: { scheduleId: input.scheduleId, date: today } },
    update: {
      classId: input.classId,
      schoolYearId: input.schoolYearId,
      semesterId: input.semesterId,
      status: input.status,
      substituteTeacherId: input.substituteTeacherId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
    },
    create: {
      date: today,
      classId: input.classId,
      schoolYearId: input.schoolYearId,
      semesterId: input.semesterId,
      status: input.status,
      substituteTeacherId: input.substituteTeacherId,
      scheduleId: input.scheduleId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
    },
  });
}

async function ensureAttendance(input: {
  agendaId: string;
  classId: string;
  classPhotoDone: boolean;
  enrollments: Array<{ id: string; studentId: string }>;
  issueNotes: string | null;
  materialFilled: boolean;
  state: AttendanceState;
  studentAttendanceDone: boolean;
  submittedById: string;
  teacherPresent: boolean;
}) {
  const attendance = await prisma.attendance.upsert({
    where: { agendaId: input.agendaId },
    update: {
      classId: input.classId,
      state: input.state,
      submittedAt: new Date(),
      submittedById: input.submittedById,
      teacherPresent: input.teacherPresent,
      studentAttendanceDone: input.studentAttendanceDone,
      materialFilled: input.materialFilled,
      classPhotoDone: input.classPhotoDone,
      issueNotes: input.issueNotes,
    },
    create: {
      agendaId: input.agendaId,
      classId: input.classId,
      state: input.state,
      startedAt: new Date(),
      submittedAt: new Date(),
      submittedById: input.submittedById,
      teacherPresent: input.teacherPresent,
      studentAttendanceDone: input.studentAttendanceDone,
      materialFilled: input.materialFilled,
      classPhotoDone: input.classPhotoDone,
      issueNotes: input.issueNotes,
    },
  });

  await Promise.all(input.enrollments.map((enrollment, index) =>
    prisma.attendanceItem.upsert({
      where: { attendanceId_studentId: { attendanceId: attendance.id, studentId: enrollment.studentId } },
      update: {
        enrollmentId: enrollment.id,
        status: index === 6 ? AttendanceStatus.SICK : index === 7 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
      },
      create: {
        attendanceId: attendance.id,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        status: index === 6 ? AttendanceStatus.SICK : index === 7 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
      },
    }),
  ));
}

async function ensureTeachingPlan(input: {
  schoolYearId: string;
  semesterId: string;
  subjectId: string;
  teacherId: string;
}) {
  const existing = await prisma.teachingPlan.findFirst({
    where: { teacherId: input.teacherId, title: 'UAT RPP Matematika', deletedAt: null },
  });

  const data = {
    schoolYearId: input.schoolYearId,
    semesterId: input.semesterId,
    subjectId: input.subjectId,
    type: TeachingPlanType.LESSON_PLAN,
    title: 'UAT RPP Matematika',
    description: 'Dokumen UAT untuk antrean review KS.',
    status: TeachingPlanStatus.SUBMITTED,
    submittedAt: new Date(),
    reviewNote: null,
    reviewSection: null,
    reviewPriority: null,
  };

  return existing
    ? prisma.teachingPlan.update({ where: { id: existing.id }, data })
    : prisma.teachingPlan.create({ data: { ...data, teacherId: input.teacherId } });
}

async function ensureAssessment(input: {
  classId: string;
  enrollments: Array<{ id: string; studentId: string }>;
  schoolYearId: string;
  semesterId: string;
  subjectId: string;
  submittedById: string;
  teacherId: string;
}) {
  const existing = await prisma.assessment.findFirst({
    where: { teacherId: input.teacherId, classId: input.classId, title: 'UAT Nilai Harian 1', deletedAt: null },
  });
  const data = {
    assessmentDate: today,
    classId: input.classId,
    maxScore: 100,
    notes: 'UAT nilai untuk report siswa dan antrean review.',
    schoolYearId: input.schoolYearId,
    semesterId: input.semesterId,
    status: AssessmentStatus.SUBMITTED,
    subjectId: input.subjectId,
    submittedAt: new Date(),
    submittedById: input.submittedById,
    teacherId: input.teacherId,
    title: 'UAT Nilai Harian 1',
    type: 'DAILY_TEST' as const,
    weight: 1,
  };
  const assessment = existing
    ? await prisma.assessment.update({ where: { id: existing.id }, data })
    : await prisma.assessment.create({ data });

  await Promise.all(input.enrollments.map((enrollment, index) =>
    prisma.assessmentScore.upsert({
      where: { assessmentId_enrollmentId: { assessmentId: assessment.id, enrollmentId: enrollment.id } },
      update: { score: 72 + index, notes: 'UAT' },
      create: {
        assessmentId: assessment.id,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        score: 72 + index,
        notes: 'UAT',
      },
    }),
  ));
}

function toSchoolDateOnly(value: Date) {
  const safeOffset = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 420;
  const localDate = new Date(value.getTime() + safeOffset * 60_000);

  return new Date(Date.UTC(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate(),
  ));
}

function getDayOfWeek(value: Date) {
  const day = value.getUTCDay();
  return day === 0 ? 7 : day;
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

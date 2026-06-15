import { TeacherTeachingPlans } from '../../../components/teacher-teaching-plans';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function TeacherTeachingPlansPage() {
  return <main className="py-10"><Container><PageHeader description="Susun Program Tahunan, Program Semester, KKTP, perencanaan pembelajaran, dan referensi buku KBM untuk direview Kepala Sekolah." eyebrow="Guru" title="Perangkat Ajar" /><TeacherTeachingPlans /></Container></main>;
}

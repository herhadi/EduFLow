import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';
import { CorrespondenceWorkspace } from '../../../components/correspondence/correspondence-workspace';
export default function PrincipalCorrespondencePage(){return <main className="py-8 sm:py-12"><Container><PageHeader eyebrow="Kepala Sekolah" title="Persetujuan Surat" description="Periksa surat keluar dari TU, setujui atau kembalikan untuk revisi."/><CorrespondenceWorkspace mode="principal"/></Container></main>;}

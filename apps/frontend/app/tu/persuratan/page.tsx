import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';
import { CorrespondenceWorkspace } from '../../../components/correspondence/correspondence-workspace';
export default function TuCorrespondencePage(){return <main className="py-8 sm:py-12"><Container><PageHeader eyebrow="Tata Usaha" title="Persuratan" description="Kelola surat masuk, siapkan surat keluar, dan pantau persetujuan Kepala Sekolah."/><CorrespondenceWorkspace mode="tu"/></Container></main>;}

import { Container } from '../../../components/ui/container';
import { LetterheadSettings } from '../../../components/correspondence/letterhead-settings';
export default function LetterheadSettingsPage(){return <main className="py-8 sm:py-12"><Container><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan Kop Surat</h1><p className="mt-1 text-sm text-muted">Atur logo, susunan teks, dan tata letak kop yang digunakan pada surat keluar sekolah.</p><LetterheadSettings/></Container></main>;}

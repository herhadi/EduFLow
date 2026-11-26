import { Container } from '../../../components/ui/container';
import { SignatureModeSettings } from '../../../components/correspondence/signature-mode-settings';

export default function CorrespondenceSettingsPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan Tanda Tangan Persuratan</h1>
        <p className="mt-1 text-sm text-muted">Konfigurasi model tanda tangan yang berlaku untuk sekolah.</p>
        <SignatureModeSettings />
      </Container>
    </main>
  );
}

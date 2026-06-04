import { OperationsCenter } from '../../components/operations-center';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function OperationsPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Pantau kesehatan Redis, queue, worker, database, notifikasi, dan failed jobs yang perlu tindakan operator."
          eyebrow="Health & Operations Center"
          title="Operasional Sistem"
        />

        <OperationsCenter />
      </Container>
    </main>
  );
}

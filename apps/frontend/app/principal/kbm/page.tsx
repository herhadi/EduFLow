import { OperationalDashboard } from '../../../components/operational-dashboard';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

type PrincipalKbmFocus = 'all' | 'empty' | 'notSubmitted' | 'issues' | 'missing' | 'substitutes';

const allowedFocus = new Set<PrincipalKbmFocus>([
  'all',
  'empty',
  'notSubmitted',
  'issues',
  'missing',
  'substitutes',
]);

function normalizeFocus(value?: string | string[]) {
  const focus = Array.isArray(value) ? value[0] : value;

  return focus && allowedFocus.has(focus as PrincipalKbmFocus)
    ? focus as PrincipalKbmFocus
    : 'all';
}

export default async function PrincipalKbmPage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string | string[] }>;
}) {
  const params = await searchParams;
  const focus = normalizeFocus(params?.focus);

  return (
    <main className="py-8 sm:py-10">
      <Container>
        <PageHeader
          description="Lembar kerja detail untuk menelusuri agenda hari ini: kelas kosong, belum submit, kendala, checklist guru, dan guru pengganti."
          eyebrow="Kepala Sekolah"
          showBackLink={false}
          title="Detail KBM Harian"
        />

        <OperationalDashboard audience="principal" className="mt-5" initialPrincipalPriority={focus} />
      </Container>
    </main>
  );
}

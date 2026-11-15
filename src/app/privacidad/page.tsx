import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { PRIVACIDAD } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de privacidad — UAGRM',
};

export default function PrivacidadPage() {
  return <LegalPage documento={PRIVACIDAD} />;
}

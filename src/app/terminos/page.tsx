import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { TERMINOS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Términos de uso — UAGRM',
};

export default function TerminosPage() {
  return <LegalPage documento={TERMINOS} />;
}

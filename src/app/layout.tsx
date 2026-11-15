import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

// Una sola familia para toda la interfaz; la variante mono se reserva para
// placas, VIN y códigos de falla (clase `.code`).
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'Diagnóstico vehicular — UAGRM',
  description:
    'Diagnóstico preventivo y mantenimiento del parque automotor de la Universidad Autónoma Gabriel René Moreno.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

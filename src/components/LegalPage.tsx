import Image from 'next/image';
import Link from 'next/link';
import type { DocumentoLegal } from '@/lib/legal';

/**
 * Página de lectura para la política de privacidad y los términos de uso.
 * Es pública: no pide sesión, y comparte la franja y el escudo del login.
 */
export function LegalPage({ documento }: { documento: DocumentoLegal }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex h-1.5 shrink-0" aria-hidden="true">
        <div className="flex-1 bg-navy" />
        <div className="flex-1 bg-crimson" />
      </div>

      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <Link href="/login" className="text-sm font-medium text-navy hover:underline">
          ← Volver
        </Link>

        <div className="mt-6 flex items-center gap-4">
          <Image
            src="/uagrm.jpg"
            alt="Escudo de la Universidad Autónoma Gabriel René Moreno"
            width={56}
            height={55}
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy">
              {documento.titulo}
            </h1>
            <p className="text-sm text-ink-3">Última actualización: {documento.actualizado}</p>
          </div>
        </div>

        <p className="mt-6 text-ink-2">{documento.introduccion}</p>

        {documento.secciones.map((seccion) => (
          <section key={seccion.titulo} className="mt-8 border-t border-line pt-6">
            <h2 className="text-lg font-semibold text-ink">{seccion.titulo}</h2>
            {seccion.parrafos?.map((parrafo) => (
              <p key={parrafo} className="mt-2 text-ink-2">
                {parrafo}
              </p>
            ))}
            {seccion.vinetas && (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2">
                {seccion.vinetas.map((vineta) => (
                  <li key={vineta}>{vineta}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="mt-10 border-t border-line pt-6 text-sm text-ink-3">
          Ver también:{' '}
          {documento.titulo === 'Política de privacidad' ? (
            <Link href="/terminos" className="font-medium text-navy hover:underline">
              Términos de uso
            </Link>
          ) : (
            <Link href="/privacidad" className="font-medium text-navy hover:underline">
              Política de privacidad
            </Link>
          )}
        </p>
      </main>
    </div>
  );
}

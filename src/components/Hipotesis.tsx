import type { Diagnosis, ScanSeverity } from '@/lib/types';
import { ConfidenceBadge, SEVERIDAD } from '@/components/Badges';
import { Notice } from '@/components/ui/Notice';

interface HipotesisProps {
  diagnosis: Diagnosis;
  /** Severidad de la evaluación automática, para avisar si la IA discrepa. */
  severidadEscaneo?: ScanSeverity;
}

/**
 * Contenido de una hipótesis generada por la IA. Se usa igual en el detalle
 * del escaneo y en la orden de trabajo, para que diga lo mismo en ambos.
 */
export function Hipotesis({ diagnosis: d, severidadEscaneo }: HipotesisProps) {
  const r = d.recommendations;
  const discrepa = severidadEscaneo !== undefined && d.severity !== severidadEscaneo;

  const origen = [
    d.provider,
    d.latencyMs ? `${(d.latencyMs / 1000).toFixed(1)} s` : null,
    d.tokensUsed ? `${d.tokensUsed} tokens` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      {/* La validación humana es el eje del sistema: va antes del contenido. */}
      <Notice tone="warning" className="mb-4">
        <strong className="font-semibold">Requiere validación de un profesional.</strong> Lo
        que sigue son hipótesis por verificar, no un diagnóstico confirmado. La decisión de
        autorizar la operación del vehículo es siempre de una persona.
      </Notice>

      <p className="max-w-[75ch] text-sm leading-relaxed text-ink">{d.summary}</p>

      {discrepa && (
        <p className="mt-3 max-w-[75ch] rounded-control border border-line bg-app px-3 py-2 text-sm text-ink-2">
          La IA sugiere una severidad{' '}
          <strong className="font-semibold text-ink">
            {SEVERIDAD[d.severity].label.toLowerCase()}
          </strong>
          , distinta de la evaluación automática (
          <strong className="font-semibold text-ink">
            {SEVERIDAD[severidadEscaneo].label.toLowerCase()}
          </strong>
          ). La severidad registrada del escaneo sigue siendo la automática.
        </p>
      )}

      {r?.probableCauses?.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-ink">Causas probables</h3>
          <ul className="divide-y divide-line rounded-control border border-line">
            {r.probableCauses.map((c, i) => (
              <li
                key={i}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 px-3 py-2.5 text-sm text-ink"
              >
                <span className="min-w-0 flex-1 basis-64">{c.cause}</span>
                <ConfidenceBadge confidence={c.confidence} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {r?.verificationSteps?.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-ink">Pasos de verificación</h3>
          <ol className="max-w-[75ch] space-y-1.5">
            {r.verificationSteps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink">
                <span className="nums w-5 shrink-0 text-right font-semibold text-navy">
                  {i + 1}.
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-ink-3">
            Van del más barato y menos invasivo al más costoso.
          </p>
        </div>
      )}

      {r?.correlations && (
        <div className="mt-5">
          <h3 className="mb-1 text-sm font-semibold text-ink">Relación entre los códigos</h3>
          <p className="max-w-[75ch] text-sm text-ink">{r.correlations}</p>
        </div>
      )}

      {origen && <p className="mt-5 text-xs text-ink-3">Generada con {origen}</p>}
    </div>
  );
}

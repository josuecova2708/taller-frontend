'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { authApi } from '@/lib/auth';
import { mensajeDeError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authApi.login(email, password);

      // Volver a donde el middleware interceptó al usuario, si aplica.
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      const target = redirect?.startsWith('/') ? redirect : '/dashboard';

      // Navegación completa (no `router.push`) para que el middleware vuelva a
      // evaluarse con la cookie recién escrita.
      window.location.href = target;
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo iniciar sesión. Intente de nuevo.'));
      setLoading(false);
    }
  };

  return (
    // Fondo blanco puro: el escudo viene sobre blanco y así no se ve su caja.
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex h-1.5 shrink-0" aria-hidden="true">
        <div className="flex-1 bg-navy" />
        <div className="flex-1 bg-crimson" />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Image
            src="/uagrm.jpg"
            alt="Escudo de la Universidad Autónoma Gabriel René Moreno"
            width={112}
            height={109}
            loading="eager"
            className="mx-auto"
          />

          <h1 className="mt-6 text-center text-2xl font-semibold tracking-tight text-navy">
            Diagnóstico vehicular preventivo
          </h1>
          <p className="mt-1 text-center text-sm text-ink-2">
            Parque automotor de la Universidad Autónoma Gabriel René Moreno
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && <Notice tone="error">{error}</Notice>}

            <Field label="Correo electrónico">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Contraseña">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
            </Field>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-3">
            Las cuentas las crea el administrador del sistema.
          </p>
          <p className="mt-2 text-center text-xs text-ink-3">
            Al iniciar sesión acepta los{' '}
            <Link href="/terminos" className="font-medium text-navy hover:underline">
              Términos de uso
            </Link>{' '}
            y la{' '}
            <Link href="/privacidad" className="font-medium text-navy hover:underline">
              Política de privacidad
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

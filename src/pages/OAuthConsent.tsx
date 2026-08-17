import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthorizationDetails {
  client?: { name?: string | null; client_name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
}

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('Falta el parámetro authorization_id.');
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/login?redirect=' + encodeURIComponent(next);
        return;
      }
      const { data, error: detErr } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detErr) {
        setError(detErr.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const clientName = details?.client?.name ?? details?.client?.client_name ?? 'la aplicación';

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error: decErr } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decErr) {
      setBusy(false);
      setError(decErr.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError('El servidor de autorización no devolvió una URL de retorno.');
      return;
    }
    window.location.href = target;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-semibold mb-2">No se pudo cargar la solicitud</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando solicitud…
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Conectar {clientName} a tu cuenta</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {clientName} podrá consultar la información de Plusterra a la que vos tenés acceso, con tus mismos permisos.
              Podés revocar el acceso en cualquier momento.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autorizar'}
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Rechazar
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default OAuthConsent;

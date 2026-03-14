import { useState } from 'react';
import { Bell, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const PushTestSection = () => {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    if (!user) return;
    setTesting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          titulo: '🔔 Notificación de prueba',
          mensaje: 'Si ves esto, las notificaciones push están funcionando correctamente.',
          user_ids: [user.id],
          url: 'https://pluspy.app/configuracion',
        },
      });

      if (error) {
        setResult({ success: false, message: error.message });
      } else {
        setResult({ success: true, message: 'Notificación enviada correctamente' });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Error desconocido' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Notificaciones Push
          </h3>
          <p className="text-sm text-muted-foreground">
            Prueba que las notificaciones push lleguen correctamente
          </p>
        </div>
      </div>

      <button
        onClick={handleTest}
        disabled={testing}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {testing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            Probar notificación push
          </>
        )}
      </button>

      {result && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${result.success ? 'text-success' : 'text-destructive'}`}>
          {result.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {result.success ? 'Enviado ✓' : `Error: ${result.message}`}
        </div>
      )}
    </div>
  );
};

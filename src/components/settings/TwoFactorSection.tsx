import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type MFAStatus = 'loading' | 'not_enrolled' | 'enrolling' | 'enrolled';

export const TwoFactorSection = () => {
  const { role } = useAuth();
  const [status, setStatus] = useState<MFAStatus>('loading');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Solo administración: secretaría y gerencia quedan exentas del 2FA
  const isPrivilegedRole = role === 'superadmin' || role === 'admin';


  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totp = data.totp;
      if (totp && totp.length > 0 && totp[0].status === 'verified') {
        setFactorId(totp[0].id);
        setStatus('enrolled');
      } else {
        setStatus('not_enrolled');
      }
    } catch {
      setStatus('not_enrolled');
    }
  };

  const startEnrollment = async () => {
    try {
      setStatus('enrolling');
      // Remove any existing unverified factors first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        for (const f of factors.totp) {
          if ((f as any).status !== 'verified') {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Plusterra', issuer: 'Plusterra' });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error('Error al iniciar configuración 2FA: ' + err.message);
      setStatus('not_enrolled');
    }
  };

  const verifyEnrollment = async () => {
    if (verifyCode.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      toast.success('2FA activado exitosamente');
      setStatus('enrolled');
      setQrCode('');
      setSecret('');
      setVerifyCode('');
    } catch (err: any) {
      toast.error('Código incorrecto. Intente de nuevo.');
    } finally {
      setVerifying(false);
    }
  };

  const disable2FA = async () => {
    setDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success('2FA desactivado');
      setStatus('not_enrolled');
      setFactorId('');
    } catch (err: any) {
      toast.error('Error al desactivar 2FA: ' + err.message);
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isPrivilegedRole) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-destructive/10">
          <Shield className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Autenticación en Dos Pasos (2FA)
          </h3>
          <p className="text-sm text-muted-foreground">
            Protección adicional para roles administrativos
          </p>
        </div>
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Verificando estado...</span>
        </div>
      )}

      {status === 'enrolled' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
            <ShieldCheck className="w-6 h-6 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">2FA Activado</p>
              <p className="text-xs text-muted-foreground">Su cuenta está protegida con autenticación de dos pasos</p>
            </div>
          </div>
          <button
            onClick={disable2FA}
            disabled={disabling}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm"
          >
            {disabling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
            Desactivar 2FA
          </button>
        </div>
      )}

      {status === 'not_enrolled' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
            <ShieldOff className="w-6 h-6 text-warning" />
            <div>
              <p className="text-sm font-medium text-foreground">2FA No Configurado</p>
              <p className="text-xs text-muted-foreground">Se recomienda activarlo para mayor seguridad</p>
            </div>
          </div>
          <button
            onClick={startEnrollment}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <Shield className="w-4 h-4" />
            Activar 2FA
          </button>
        </div>
      )}

      {status === 'enrolling' && (
        <div className="space-y-5">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Paso 1: Escanee el código QR</p>
            <p>Use una app como Google Authenticator, Authy o Microsoft Authenticator.</p>
          </div>

          {qrCode && (
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl shadow-sm">
                <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
            </div>
          )}

          {secret && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">O ingrese el código manualmente:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-2 rounded-lg font-mono break-all flex-1">
                  {secret}
                </code>
                <button onClick={copySecret} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-foreground mb-3">Paso 2: Ingrese el código de verificación</p>
            <div className="flex flex-col items-center gap-4">
              <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStatus('not_enrolled'); setQrCode(''); setSecret(''); setVerifyCode(''); }}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={verifyEnrollment}
                  disabled={verifyCode.length !== 6 || verifying}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verificar y Activar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

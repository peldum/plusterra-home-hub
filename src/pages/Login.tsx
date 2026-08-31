import { useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { MFAVerifyDialog } from '@/components/auth/MFAVerifyDialog';
import { isDeviceTrusted, markDeviceTrusted } from '@/lib/trustedDevice';
import { PWAInstallBanner } from '@/components/layout/PWAInstallBanner';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const getLoginAttempts = (): { count: number; lockedUntil: number } => {
  try {
    const raw = sessionStorage.getItem('_login_attempts');
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
};

const setLoginAttempts = (data: { count: number; lockedUntil: number }) => {
  sessionStorage.setItem('_login_attempts', JSON.stringify(data));
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsMFA, setNeedsMFA] = useState(false);
  const { signIn } = useAuth();
  const { settings } = useBrandingSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { theme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    // Rate limiting check
    const attempts = getLoginAttempts();
    if (attempts.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      toast.error(`Demasiados intentos. Intentá de nuevo en ${minutesLeft} minuto(s).`);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const newCount = attempts.count + 1;
      if (newCount >= MAX_ATTEMPTS) {
        setLoginAttempts({ count: newCount, lockedUntil: Date.now() + LOCKOUT_MS });
        toast.error(`Cuenta bloqueada por 15 minutos tras ${MAX_ATTEMPTS} intentos fallidos.`);
      } else {
        setLoginAttempts({ count: newCount, lockedUntil: 0 });
        toast.error(`Credenciales inválidas. Intento ${newCount}/${MAX_ATTEMPTS}.`);
      }
      return;
    }
    // Reset attempts on success
    setLoginAttempts({ count: 0, lockedUntil: 0 });

    // Check if user has MFA enrolled
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Roles exentos de 2FA al iniciar sesión (secretaría y gerencia/contabilidad)
      if (currentUser) {
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        if (roleRow?.role === 'secretaria' || roleRow?.role === 'accounting') {
          navigate(redirectTo);
          return;
        }
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTOTP = factors?.totp?.some(f => f.status === 'verified');
      if (hasVerifiedTOTP && currentUser) {
        // Skip MFA if this device was verified recently
        if (isDeviceTrusted(currentUser.id)) {
          navigate(redirectTo);
          return;
        }
        setNeedsMFA(true);
        return;
      }
    } catch {}

    navigate(redirectTo);
  };

  const handleMFAVerified = async () => {
    setNeedsMFA(false);
    // Mark device as trusted for 7 days
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      markDeviceTrusted(currentUser.id);
    }
    navigate(redirectTo);
  };

  if (needsMFA) {
    return <MFAVerifyDialog onVerified={handleMFAVerified} />;
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Theme toggle */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-muted/50 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Cambiar tema"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </motion.button>
      {/* Left panel - branding (desktop only) */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-secondary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-12">
          {settings.logo_light_url ? (
            <img
              src={settings.logo_light_url}
              alt={settings.brand_name}
              className="h-20 w-auto mx-auto mb-8 object-contain brightness-0 invert"
            />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-8">
              <Building2 className="w-10 h-10 text-secondary-foreground" />
            </div>
          )}
          <h1 className="font-display text-4xl font-bold text-primary-foreground mb-4">
            {settings.brand_name}
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            Sistema de Gestión Inmobiliaria — Panel de Control Interno
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-secondary">150+</p>
              <p className="text-sm text-primary-foreground/60">Propiedades</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-secondary">45</p>
              <p className="text-sm text-primary-foreground/60">Contratos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-secondary">12</p>
              <p className="text-sm text-primary-foreground/60">Agentes</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right panel / Mobile full-screen */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex-1 flex flex-col bg-background"
      >
        {/* Mobile branded header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:hidden bg-primary px-6 pt-12 pb-10 relative overflow-hidden flex items-center justify-center"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            {settings.logo_dark_url || settings.logo_light_url ? (
              <img
                src={settings.logo_light_url || settings.logo_dark_url!}
                alt={settings.brand_name}
                className="h-16 w-auto object-contain brightness-0 invert"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <Building2 className="w-8 h-8 text-secondary-foreground" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.25 }}
            className="w-full max-w-md"
          >
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-1">
              Iniciar Sesión
            </h2>
            <p className="text-sm text-muted-foreground mb-6 lg:mb-8">
              Ingrese sus credenciales para acceder al sistema
            </p>

            <motion.form
              onSubmit={handleSubmit}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="usuario@plusterra.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-12"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </motion.button>
            </motion.form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              ¿No tiene cuenta? Contacte al administrador del sistema.
            </p>
          </motion.div>
        </div>

        {/* Mobile footer branding */}
        <div className="lg:hidden pb-safe px-6 pb-4 text-center">
          <p className="text-[11px] text-muted-foreground/50">
            © {new Date().getFullYear()} {settings.brand_name}
          </p>
        </div>
      </motion.div>
      <PWAInstallBanner />
    </div>
  );
};

export default Login;

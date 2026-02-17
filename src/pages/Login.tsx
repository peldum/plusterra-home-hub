import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Por favor complete todos los campos');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error('Credenciales inválidas. Contacte al administrador.');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-secondary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-8">
            <Building2 className="w-10 h-10 text-secondary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-bold text-primary-foreground mb-4">
            Plusterra
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
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center bg-background px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Plusterra</h1>
              <p className="text-xs text-muted-foreground">Gestión Inmobiliaria</p>
            </div>
          </div>

          <h2 className="font-display text-3xl font-bold text-foreground mb-2">
            Iniciar Sesión
          </h2>
          <p className="text-muted-foreground mb-8">
            Ingrese sus credenciales para acceder al sistema
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿No tiene cuenta? Contacte al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

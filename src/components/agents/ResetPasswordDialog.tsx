import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  agentId: string;
}

export const ResetPasswordDialog = ({ open, onOpenChange, agentName, agentId }: Props) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && password === confirmPassword;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { user_id: agentId, new_password: password },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Contraseña de ${agentName} actualizada correctamente`);
      setPassword('');
      setConfirmPassword('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al resetear contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Resetear Contraseña
          </DialogTitle>
          <DialogDescription>
            Nueva contraseña para <strong>{agentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 space-y-1 text-xs">
                <p className={password.length >= 8 ? 'text-success' : 'text-destructive'}>
                  {password.length >= 8 ? '✓' : '✗'} Mínimo 8 caracteres
                </p>
                <p className={/[A-Z]/.test(password) ? 'text-success' : 'text-destructive'}>
                  {/[A-Z]/.test(password) ? '✓' : '✗'} Una mayúscula
                </p>
                <p className={/[a-z]/.test(password) ? 'text-success' : 'text-destructive'}>
                  {/[a-z]/.test(password) ? '✓' : '✗'} Una minúscula
                </p>
                <p className={/[0-9]/.test(password) ? 'text-success' : 'text-destructive'}>
                  {/[0-9]/.test(password) ? '✓' : '✗'} Un número
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Confirmar contraseña</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita la contraseña"
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Actualizando...</>
            ) : (
              'Cambiar Contraseña'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().trim().min(2, 'Nombre requerido').max(100),
  phone: z.string().trim().min(6, 'Teléfono requerido').max(20),
  email: z.string().trim().email('Email inválido').max(255).or(z.literal('')),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brochureUrl: string;
  postId: string;
  postTitle: string;
}

export const BrochureDownloadDialog = ({ open, onOpenChange, brochureUrl, postId, postTitle }: Props) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmit, setLastSubmit] = useState(0);

  const handleSubmit = async () => {
    // Rate limit 30s
    if (Date.now() - lastSubmit < 30_000) {
      toast.info('Esperá unos segundos antes de intentar de nuevo');
      return;
    }

    const parsed = formSchema.safeParse({ name, phone, email: email || '' });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Datos inválidos');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('brochure_downloads').insert({
        blog_post_id: postId,
        visitor_name: parsed.data.name,
        visitor_phone: parsed.data.phone,
        visitor_email: parsed.data.email || null,
      });
      if (error) throw error;

      setLastSubmit(Date.now());
      toast.success('¡Gracias! Tu brochure se está descargando');
      onOpenChange(false);

      // Trigger download
      const a = document.createElement('a');
      a.href = brochureUrl;
      a.target = '_blank';
      a.download = `brochure-${postTitle.slice(0, 30)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Error al registrar. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FC5100]" />
            Descargar Brochure
          </DialogTitle>
          <DialogDescription>
            Dejá tus datos para descargar el brochure de <strong>{postTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Nombre completo *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={100}
            />
          </div>
          <div>
            <Label>Teléfono *</Label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+595 9XX XXX XXX"
              maxLength={20}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com (opcional)"
              maxLength={255}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#FC5100] hover:bg-[#e04800] text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Descargar Brochure
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Tus datos serán tratados de forma confidencial.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from 'react';
import { useWhatsAppTemplate, useSaveWhatsAppTemplate, WHATSAPP_PLACEHOLDERS, fillWhatsAppTemplate } from '@/hooks/useWhatsAppTemplate';
import { MessageCircle, Save, RotateCcw, Eye, EyeOff, Loader2 } from 'lucide-react';

export const WhatsAppTemplateSection = () => {
  const { data: savedTemplate, isLoading } = useWhatsAppTemplate();
  const saveMutation = useSaveWhatsAppTemplate();
  const [template, setTemplate] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (savedTemplate) setTemplate(savedTemplate);
  }, [savedTemplate]);

  const isDirty = template !== savedTemplate;

  const previewMessage = fillWhatsAppTemplate(template, {
    captorName: 'María González',
    title: 'Departamento 2 amb. Villa Morra',
    operation: 'Alquiler',
    price: '4.500.000',
    currency: 'PYG',
    location: 'Villa Morra, Asunción',
  });

  const handleReset = () => {
    if (savedTemplate) setTemplate(savedTemplate);
  };

  const insertPlaceholder = (placeholder: string) => {
    setTemplate(prev => prev + placeholder);
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[hsl(142,70%,45%)]/10">
          <MessageCircle className="w-5 h-5 text-[hsl(142,70%,45%)]" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Mensajes Corporativos – WhatsApp Interno
          </h3>
          <p className="text-sm text-muted-foreground">
            Plantilla para contactar agentes captadores desde el catálogo
          </p>
        </div>
      </div>

      {/* Placeholders */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Variables disponibles (clic para insertar)
        </label>
        <div className="flex flex-wrap gap-2">
          {WHATSAPP_PLACEHOLDERS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => insertPlaceholder(p.key)}
              className="px-2.5 py-1 rounded-md text-xs font-mono bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
              title={p.label}
            >
              {p.key}
            </button>
          ))}
        </div>
      </div>

      {/* Template Editor */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Plantilla del mensaje
        </label>
        <textarea
          value={template}
          onChange={e => setTemplate(e.target.value)}
          className="input-field min-h-[200px] resize-y font-mono text-sm"
          placeholder="Escribí tu plantilla de mensaje..."
        />
      </div>

      {/* Preview Toggle */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? 'Ocultar vista previa' : 'Ver vista previa'}
        </button>
      </div>

      {showPreview && (
        <div className="mb-4 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Vista previa con datos de ejemplo:</p>
          <div className="whitespace-pre-wrap text-sm text-foreground bg-background rounded-lg p-4 border border-border">
            {previewMessage}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => saveMutation.mutate(template)}
          disabled={!isDirty || saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Plantilla
        </button>
        {isDirty && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Descartar
          </button>
        )}
      </div>
    </div>
  );
};

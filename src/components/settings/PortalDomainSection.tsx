import { Globe, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export const PortalDomainSection = () => {
  const [copied, setCopied] = useState(false);
  const currentUrl = `https://plusterra.com.py`;
  const targetDomain = 'plusterra.com.py';
  const lovableIp = '185.158.133.1';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Portal Público — Dominio
          </h3>
          <p className="text-sm text-muted-foreground">
            Configurá tu dominio personalizado para el portal de propiedades
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Current portal URL */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">URL actual del portal</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm text-foreground font-mono truncate">
              {currentUrl}
            </code>
            <button
              onClick={() => handleCopy(currentUrl)}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              title="Copiar"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
            <a
              href="https://plusterra.com.py"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              title="Abrir portal"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>

        {/* Domain setup instructions */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            🌐 Apuntar dominio personalizado
          </h4>
          <p className="text-sm text-muted-foreground">
            Para usar <span className="font-medium text-foreground">{targetDomain}</span>, configurá los siguientes registros DNS en tu proveedor de dominio:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Tipo</th>
                  <th className="pb-2 pr-4 font-medium">Nombre</th>
                  <th className="pb-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">A</td>
                  <td className="py-2 pr-4 font-mono text-xs">@</td>
                  <td className="py-2 font-mono text-xs">{lovableIp}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">A</td>
                  <td className="py-2 pr-4 font-mono text-xs">www</td>
                  <td className="py-2 font-mono text-xs">{lovableIp}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">TXT</td>
                  <td className="py-2 pr-4 font-mono text-xs">_lovable</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground italic">Se genera al conectar</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Después de configurar los DNS, conectá el dominio desde <span className="font-medium">Project Settings → Domains</span> en Lovable. La propagación puede tardar hasta 72 horas.
          </p>
        </div>
      </div>
    </div>
  );
};

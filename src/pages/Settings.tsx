import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Percent,
  Bell,
  Shield,
  Palette,
  Database,
  Save,
  Upload,
  Eye,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Settings = () => {
  // Branding state
  const [brandName, setBrandName] = useState('Plusterra');
  const [primaryColor, setPrimaryColor] = useState('#00447C');
  const [accentColor, setAccentColor] = useState('#FC5100');
  const [showPreview, setShowPreview] = useState(false);

  const handleSaveBranding = () => {
    toast.success('Configuración de branding guardada');
  };

  return (
    <MainLayout
      title="Configuración"
      subtitle="Ajustes del sistema y preferencias"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Información de la Empresa
                </h3>
                <p className="text-sm text-muted-foreground">Datos generales de Plusterra</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre de la Empresa
                </label>
                <input type="text" defaultValue="Plusterra Inmobiliaria" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">CUIT</label>
                <input type="text" defaultValue="30-12345678-9" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email de Contacto</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" defaultValue="contacto@plusterra.com" className="input-field pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="tel" defaultValue="+595 21 456-7890" className="input-field pl-10" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Dirección</label>
                <input type="text" defaultValue="Asunción, Paraguay" className="input-field" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Sitio Web</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="url" defaultValue="https://www.plusterra.com" className="input-field pl-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Branding Section */}
          <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Palette className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Branding</h3>
                <p className="text-sm text-muted-foreground">Personalización visual de la marca</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo uploads */}
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Logo claro (para fondos oscuros)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Arrastrá o hacé clic para subir</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, SVG · Máx 2MB</p>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Logo oscuro (para fondos claros)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Arrastrá o hacé clic para subir</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, SVG · Máx 2MB</p>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Favicon</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">PNG, ICO · 64x64 recomendado</p>
                  </div>
                </div>
              </div>

              {/* Color settings */}
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Nombre de la empresa</Label>
                  <Input value={brandName} onChange={e => setBrandName(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">Color primario</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Color de acento</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      className="w-12 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="flex-1" />
                  </div>
                </div>

                {/* Preview */}
                <div className="pt-2">
                  <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Ocultar' : 'Vista previa'}
                  </Button>
                </div>

                {showPreview && (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Vista previa</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-display text-lg font-bold" style={{ color: primaryColor }}>{brandName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: primaryColor }}>
                        Botón Primario
                      </button>
                      <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: accentColor }}>
                        Botón Acento
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: primaryColor }} title="Primario" />
                      <div className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: accentColor }} title="Acento" />
                      <div className="w-8 h-8 rounded-full border-2 border-border bg-[#F8F9FA]" title="Fondo" />
                      <div className="w-8 h-8 rounded-full border-2 border-border bg-[#2D5A27]" title="Verde" />
                      <div className="w-8 h-8 rounded-full border-2 border-border bg-[#FFB800]" title="Amarillo" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveBranding}>
                <Save className="w-4 h-4 mr-2" />
                Guardar Branding
              </Button>
            </div>
          </div>

          {/* Commission Settings */}
          <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Percent className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Configuración de Comisiones
                </h3>
                <p className="text-sm text-muted-foreground">Porcentajes de comisiones por operación</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Comisión Agencia (Alquiler)</label>
                  <div className="relative">
                    <input type="number" defaultValue="5" className="input-field pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Comisión Agencia (Venta)</label>
                  <div className="relative">
                    <input type="number" defaultValue="3" className="input-field pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Comisión Administración</label>
                  <div className="relative">
                    <input type="number" defaultValue="10" className="input-field pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Comisión Agente Senior</label>
                  <div className="relative">
                    <input type="number" defaultValue="40" className="input-field pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">% de la comisión de la agencia</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Comisión Agente Junior</label>
                  <div className="relative">
                    <input type="number" defaultValue="25" className="input-field pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">% de la comisión de la agencia</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-info/10">
                <Bell className="w-5 h-5 text-info" />
              </div>
              <h3 className="font-semibold text-foreground">Notificaciones</h3>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Recordatorios de pago', enabled: true },
                { label: 'Vencimiento de contratos', enabled: true },
                { label: 'Nuevas propiedades', enabled: false },
                { label: 'Reportes semanales', enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <button
                    className={`w-11 h-6 rounded-full transition-colors ${
                      item.enabled ? 'bg-success' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        item.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Shield className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground">Seguridad</h3>
            </div>

            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors">
                <p className="text-sm font-medium text-foreground">Cambiar contraseña</p>
                <p className="text-xs text-muted-foreground">Última actualización: hace 30 días</p>
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors">
                <p className="text-sm font-medium text-foreground">Autenticación 2FA</p>
                <p className="text-xs text-muted-foreground">No configurado</p>
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors">
                <p className="text-sm font-medium text-foreground">Sesiones activas</p>
                <p className="text-xs text-muted-foreground">2 dispositivos</p>
              </button>
            </div>
          </div>

          {/* Data */}
          <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Datos</h3>
            </div>

            <div className="space-y-3">
              <button className="w-full px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium text-foreground">
                Exportar todos los datos
              </button>
              <button className="w-full px-4 py-3 rounded-lg border border-destructive/20 hover:bg-destructive/10 transition-colors text-sm font-medium text-destructive">
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end mt-6">
        <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <Save className="w-4 h-4" />
          Guardar Cambios
        </button>
      </div>
    </MainLayout>
  );
};

export default Settings;

import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Percent,
  Bell,
  Database,
  Save,
  Crown,
  Settings as SettingsIcon,
} from 'lucide-react';
import { BrandingSection } from '@/components/settings/BrandingSection';
import { WatermarkSection } from '@/components/settings/WatermarkSection';
import { WhatsAppTemplateSection } from '@/components/settings/WhatsAppTemplateSection';
import { CanonSettingsSection } from '@/components/settings/CanonSettingsSection';
import { AgentPlanPricingSection } from '@/components/settings/AgentPlanPricingSection';
import { DatabaseMonitorSection } from '@/components/settings/DatabaseMonitorSection';
import { TwoFactorSection } from '@/components/settings/TwoFactorSection';
import { PortalDomainSection } from '@/components/settings/PortalDomainSection';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { isAdmin, role } = useAuth();

  return (
    <MainLayout
      title="Configuración"
      subtitle="Ajustes del sistema y preferencias"
    >
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-1.5">
            <SettingsIcon className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="planes" className="gap-1.5">
            <Crown className="w-4 h-4" /> Planes y Canon
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: General ── */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Company Info */}
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
                    <label className="block text-sm font-medium text-foreground mb-2">Nombre de la Empresa</label>
                    <input type="text" defaultValue="Plusterra Inmobiliaria" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">RUC</label>
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

              <BrandingSection />

              {(role === 'superadmin' || role === 'admin') && <WatermarkSection />}

              {isAdmin && <WhatsAppTemplateSection />}

              {role === 'superadmin' && <DatabaseMonitorSection />}

              {role === 'superadmin' && <PortalDomainSection />}

              {/* Commission Settings */}
              <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Percent className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">Configuración de Comisiones</h3>
                    <p className="text-sm text-muted-foreground">Estructura de comisiones por tipo de operación</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" /> Alquiler
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Retención Inmobiliaria</label>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-foreground">15</span>
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Comisión Agente</label>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-success">85</span>
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground border-t border-border pt-2">
                        De cada alquiler gestionado, el 15% queda para la inmobiliaria y el 85% para el agente responsable.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary" /> Venta
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Comisión estándar sobre precio de venta</label>
                          <div className="relative">
                            <input type="number" defaultValue="5" step="0.5" className="input-field pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Operación con un solo agente</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Comisión en Co-broker / Agente externo</label>
                          <div className="relative">
                            <input type="number" defaultValue="5.5" step="0.5" className="input-field pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Cuando participan 2 agentes o agentes externos</p>
                        </div>
                      </div>

                      <div className="border-t border-border pt-4">
                        <label className="block text-sm font-medium text-foreground mb-3">Distribución en Co-broker</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Captor</label>
                            <div className="relative">
                              <input type="number" defaultValue="50" className="input-field pr-8" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Cerrador / Externo</label>
                            <div className="relative">
                              <input type="number" defaultValue="50" className="input-field pr-8" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Retención Inmobiliaria</label>
                            <div className="relative">
                              <input type="number" defaultValue="15" className="input-field pr-8" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Se aplica sobre cada parte</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground">
                          <strong>Ejemplo:</strong> Venta de ₲ 500.000.000 al 5.5% con co-broker → Comisión bruta: ₲ 27.500.000 → Cada agente: ₲ 13.750.000 → Retención (15%): ₲ 2.062.500 c/u → Neto agente: ₲ 11.687.500 c/u
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-info" /> Administración de Propiedades
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="max-w-xs">
                        <label className="block text-sm font-medium text-foreground mb-2">Fee de administración por defecto</label>
                        <div className="relative">
                          <input type="number" defaultValue="5" className="input-field pr-8" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Configurable por propiedad individual (5-10%)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar settings */}
            <div className="space-y-6">
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
                      <button className={`w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-success' : 'bg-muted'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${item.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <TwoFactorSection />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </TabsContent>

        {/* ── TAB: Planes y Canon ── */}
        <TabsContent value="planes">
          <div className="max-w-3xl space-y-6">
            <AgentPlanPricingSection />
            <CanonSettingsSection />
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Settings;

import { useState } from 'react';
import { usePortalAnalytics } from '@/hooks/usePortalAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Globe, Monitor, Smartphone, Tablet, Eye, Users, TrendingUp, Loader2 } from 'lucide-react';

const deviceIcons: Record<string, React.ReactNode> = {
  desktop: <Monitor className="w-4 h-4" />,
  mobile: <Smartphone className="w-4 h-4" />,
  tablet: <Tablet className="w-4 h-4" />,
};

const deviceLabels: Record<string, string> = {
  desktop: 'Escritorio',
  mobile: 'Celular',
  tablet: 'Tablet',
  unknown: 'Otro',
};

export const PortalAnalyticsDashboard = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading } = usePortalAnalytics(days);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const totalDevices = Object.values(data.byDevice).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Analíticas del Portal</h3>
        <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Eye className="w-3.5 h-3.5" /> Visitas totales
            </div>
            <p className="text-2xl font-bold text-foreground">{data.totalVisits.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="w-3.5 h-3.5" /> Sesiones únicas
            </div>
            <p className="text-2xl font-bold text-foreground">{data.uniqueSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Prom. diario
            </div>
            <p className="text-2xl font-bold text-foreground">
              {data.dailyVisits.length > 0
                ? Math.round(data.totalVisits / data.dailyVisits.length)
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Globe className="w-3.5 h-3.5" /> Países
            </div>
            <p className="text-2xl font-bold text-foreground">{data.byCountry.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart: daily visits */}
      {data.dailyVisits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visitas por día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyVisits}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={v => {
                      const d = new Date(v + 'T00:00');
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={v => {
                      const d = new Date(v + 'T00:00');
                      return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' });
                    }}
                  />
                  <Bar dataKey="count" name="Visitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3-column: Device / Pages / Geography */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Devices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.byDevice)
              .sort(([, a], [, b]) => b - a)
              .map(([dev, count]) => (
                <div key={dev} className="flex items-center gap-2">
                  {deviceIcons[dev] || <Monitor className="w-4 h-4" />}
                  <span className="text-sm flex-1">{deviceLabels[dev] || dev}</span>
                  <span className="text-sm font-medium">{Math.round((count / totalDevices) * 100)}%</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Páginas más visitadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {data.byPage.slice(0, 10).map(p => (
              <div key={p.page} className="flex items-center gap-2">
                <span className="text-sm flex-1 truncate">{p.page === '/' ? 'Inicio' : p.page}</span>
                <span className="text-sm font-medium tabular-nums">{p.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Geography */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Origen geográfico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {data.byCity.length > 0 ? (
              data.byCity.slice(0, 10).map(c => (
                <div key={c.city} className="flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">{c.city}</span>
                  <span className="text-sm font-medium tabular-nums">{c.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos geográficos aún</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

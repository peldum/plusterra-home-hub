import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cake, MessageCircle } from 'lucide-react';
import { useEffect } from 'react';

interface BirthdayEntry {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  daysUntil: number;
}

const getDaysUntilBirthday = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  const thisYear = today.getFullYear();

  const bdayThisYear = new Date(thisYear, birth.getMonth(), birth.getDate());
  const todayNorm = new Date(thisYear, today.getMonth(), today.getDate());

  let diff = Math.round((bdayThisYear.getTime() - todayNorm.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) diff += 365;
  return diff;
};

export const BirthdayWidget = () => {
  const { user } = useAuth();

  const { data: birthdays = [] } = useQuery({
    queryKey: ['birthdays-widget'],
    queryFn: async () => {
      const entries: BirthdayEntry[] = [];

      const [ownersRes, clientsRes, profilesRes] = await Promise.all([
        supabase.from('owners').select('id, full_name, phone, birth_date'),
        supabase.from('clients').select('id, full_name, phone, birth_date'),
        supabase.from('profiles').select('id, full_name, phone, birth_date'),
      ]);

      const process = (rows: any[] | null, role: string) => {
        (rows || []).forEach((r: any) => {
          if (!r.birth_date) return;
          const days = getDaysUntilBirthday(r.birth_date);
          if (days <= 7) {
            entries.push({
              id: r.id,
              name: r.full_name,
              role,
              phone: r.phone,
              daysUntil: days,
            });
          }
        });
      };

      process(ownersRes.data, 'Propietario');
      process(clientsRes.data, 'Cliente');
      process(profilesRes.data, 'Agente');

      return entries.sort((a, b) => a.daysUntil - b.daysUntil);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Create alerts for today's birthdays
  useEffect(() => {
    if (!user || birthdays.length === 0) return;
    const todayBirthdays = birthdays.filter(b => b.daysUntil === 0);
    if (todayBirthdays.length === 0) return;

    const createAlerts = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      for (const b of todayBirthdays) {
        // Check if alert already exists for today
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('user_id', user.id)
          .eq('alert_type', 'birthday')
          .eq('due_date', todayStr)
          .ilike('title', `%${b.name}%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('alerts').insert({
            user_id: user.id,
            alert_type: 'birthday',
            title: `Cumpleaños de ${b.name}`,
            message: `Hoy es el cumpleaños de ${b.name} (${b.role}). ¡No olvides felicitarlo/a!`,
            due_date: todayStr,
          });
        }
      }
    };
    createAlerts();
  }, [birthdays, user]);

  const todayList = birthdays.filter(b => b.daysUntil === 0);
  const upcomingList = birthdays.filter(b => b.daysUntil > 0);

  const getWhatsAppUrl = (name: string, phone: string | null) => {
    if (!phone) return null;
    const cleaned = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
    const msg = encodeURIComponent(`¡Hola ${name}! El equipo de Plusterra te desea un muy feliz cumpleaños 🎉🏠`);
    return `https://wa.me/${cleaned}?text=${msg}`;
  };

  if (birthdays.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Cake className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">Cumpleaños</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          🎂 No hay cumpleaños próximos en los próximos 7 días
        </p>
      </div>
    );
  }

  const renderEntry = (b: BirthdayEntry) => {
    const waUrl = getWhatsAppUrl(b.name, b.phone);
    return (
      <div key={`${b.role}-${b.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0">
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
          <p className="text-xs text-muted-foreground">{b.role}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {b.daysUntil > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              en {b.daysUntil}d
            </span>
          )}
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Cake className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg font-semibold text-foreground">Cumpleaños</h3>
      </div>

      {todayList.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Hoy 🎂</h4>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            {todayList.map(renderEntry)}
          </div>
        </div>
      )}

      {upcomingList.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Próximos 7 días 🎉</h4>
          <div>{upcomingList.map(renderEntry)}</div>
        </div>
      )}
    </div>
  );
};

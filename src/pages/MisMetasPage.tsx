import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Target, TrendingUp, Edit, History, Trophy, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCurrentMonthGoal, useAgentGoals, useUpsertGoal, useGoalProgress, AgentGoal } from '@/hooks/useAgentGoals';

const MisMetasPage = () => {
  const { data: currentGoal, isLoading: loadingGoal } = useCurrentMonthGoal();
  const { data: allGoals } = useAgentGoals();
  const { data: progress, isLoading: loadingProgress } = useGoalProgress();
  const upsertGoal = useUpsertGoal();
  const currentMonth = format(new Date(), 'yyyy-MM');

  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editGoal, setEditGoal] = useState<Partial<AgentGoal>>({});

  const openEdit = (goal?: AgentGoal | null) => {
    setEditGoal({
      month: goal?.month ?? currentMonth,
      rental_goal: goal?.rental_goal ?? 0,
      sales_goal: goal?.sales_goal ?? 0,
      commission_goal: goal?.commission_goal ?? 0,
      income_goal: goal?.income_goal ?? 0,
      personal_note: goal?.personal_note ?? '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    upsertGoal.mutate(
      { ...editGoal, month: editGoal.month ?? currentMonth } as any,
      { onSuccess: () => setShowForm(false) }
    );
  };

  const pct = (current: number, goal: number) => (goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0);

  const isLoading = loadingGoal || loadingProgress;
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: es });

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Mis Metas
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-1">
            <History className="h-4 w-4" /> Historial
          </Button>
          <Button size="sm" onClick={() => openEdit(currentGoal)} className="gap-1">
            <Edit className="h-4 w-4" /> {currentGoal ? 'Editar metas' : 'Definir metas'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !currentGoal ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No definiste metas para este mes.</p>
            <Button className="mt-4" onClick={() => openEdit()}>Definir metas</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <GoalCard
            title="Alquileres cerrados"
            icon="🔑"
            current={progress?.rentals ?? 0}
            goal={currentGoal.rental_goal}
            unit=""
          />
          <GoalCard
            title="Ventas cerradas"
            icon="🏷️"
            current={progress?.sales ?? 0}
            goal={currentGoal.sales_goal}
            unit=""
          />
          <GoalCard
            title="Comisiones estimadas"
            icon="💰"
            current={progress?.commissions ?? 0}
            goal={currentGoal.commission_goal}
            unit="Gs."
            isCurrency
          />
          {(currentGoal.income_goal ?? 0) > 0 && (
            <GoalCard
              title="Ingresos personales"
              icon="📈"
              current={0}
              goal={currentGoal.income_goal ?? 0}
              unit="Gs."
              isCurrency
            />
          )}
          {currentGoal.personal_note && (
            <Card className="md:col-span-2">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground italic">📝 {currentGoal.personal_note}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Definir metas – {editGoal.month}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Meta de alquileres cerrados</Label>
              <Input type="number" min={0} value={editGoal.rental_goal ?? 0} onChange={e => setEditGoal(g => ({ ...g, rental_goal: +e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Meta de ventas cerradas</Label>
              <Input type="number" min={0} value={editGoal.sales_goal ?? 0} onChange={e => setEditGoal(g => ({ ...g, sales_goal: +e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Meta de comisiones (Gs.)</Label>
              <Input type="number" min={0} value={editGoal.commission_goal ?? 0} onChange={e => setEditGoal(g => ({ ...g, commission_goal: +e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Meta de ingresos personales (Gs.) – opcional</Label>
              <Input type="number" min={0} value={editGoal.income_goal ?? 0} onChange={e => setEditGoal(g => ({ ...g, income_goal: +e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nota personal</Label>
              <Textarea rows={2} value={editGoal.personal_note ?? ''} onChange={e => setEditGoal(g => ({ ...g, personal_note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" disabled={upsertGoal.isPending} onClick={handleSave}>
              {upsertGoal.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de metas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(allGoals ?? []).map(g => (
              <Card key={g.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{g.month}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowHistory(false); openEdit(g); }}>
                    Editar
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>🔑 Alquileres: {g.rental_goal} | 🏷️ Ventas: {g.sales_goal}</p>
                  <p>💰 Comisiones: {g.commission_goal.toLocaleString()} Gs.</p>
                  {g.personal_note && <p className="italic">📝 {g.personal_note}</p>}
                </div>
              </Card>
            ))}
            {(allGoals ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin historial</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const GoalCard = ({ title, icon, current, goal, unit, isCurrency }: {
  title: string; icon: string; current: number; goal: number; unit: string; isCurrency?: boolean;
}) => {
  const percentage = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
  const displayCurrent = isCurrency ? current.toLocaleString() : current;
  const displayGoal = isCurrency ? goal.toLocaleString() : goal;
  const color = percentage >= 100 ? 'text-green-600' : percentage >= 50 ? 'text-primary' : 'text-orange-500';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>{icon}</span> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between">
          <span className={`text-2xl font-bold ${color}`}>
            {displayCurrent} <span className="text-sm font-normal text-muted-foreground">/ {displayGoal} {unit}</span>
          </span>
          <Badge variant={percentage >= 100 ? 'default' : 'secondary'} className="text-xs">
            {percentage}%
          </Badge>
        </div>
        <Progress value={percentage} className="h-2" />
      </CardContent>
    </Card>
  );
};

export default MisMetasPage;

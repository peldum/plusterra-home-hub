import React from 'react';
import { toast } from 'sonner';

interface LoopEventDetail {
  key: string;
  hits: number;
  windowMs: number;
  timestamp: number;
}

interface QueryLoopBoundaryProps {
  children: React.ReactNode;
}

interface QueryLoopBoundaryState {
  resetKey: number;
}

export class QueryLoopBoundary extends React.Component<QueryLoopBoundaryProps, QueryLoopBoundaryState> {
  state: QueryLoopBoundaryState = {
    resetKey: 0,
  };

  // Dedupe: solo mostrar un aviso por sesión de página para no spamear al usuario
  // durante un Ctrl+F5 con muchos widgets cargando en paralelo.
  private notified = false;

  private handleLoopEvent = (event: Event) => {
    const customEvent = event as CustomEvent<LoopEventDetail>;
    if (!customEvent.detail) return;
    if (this.notified) return;
    this.notified = true;
    // Non-blocking notice; app keeps working with cached/empty data.
    try {
      toast.warning('Consultas pausadas temporalmente', {
        description: 'Se detectó actividad repetida. La app sigue funcionando.',
        duration: 2500,
      });
    } catch { /* ignore */ }
  };

  componentDidMount() {
    window.addEventListener('query-loop-detected', this.handleLoopEvent as EventListener);
  }

  componentWillUnmount() {
    window.removeEventListener('query-loop-detected', this.handleLoopEvent as EventListener);
  }

  render() {
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

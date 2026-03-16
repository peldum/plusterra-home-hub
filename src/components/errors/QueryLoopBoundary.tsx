import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  loopDetail: LoopEventDetail | null;
  resetKey: number;
}

export class QueryLoopBoundary extends React.Component<QueryLoopBoundaryProps, QueryLoopBoundaryState> {
  state: QueryLoopBoundaryState = {
    loopDetail: null,
    resetKey: 0,
  };

  private handleLoopEvent = (event: Event) => {
    const customEvent = event as CustomEvent<LoopEventDetail>;
    if (!customEvent.detail) return;

    this.setState({ loopDetail: customEvent.detail });
  };

  componentDidMount() {
    window.addEventListener('query-loop-detected', this.handleLoopEvent as EventListener);
  }

  componentWillUnmount() {
    window.removeEventListener('query-loop-detected', this.handleLoopEvent as EventListener);
  }

  handleReset = () => {
    this.setState((prev) => ({
      loopDetail: null,
      resetKey: prev.resetKey + 1,
    }));
  };

  render() {
    if (!this.state.loopDetail) {
      return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-base font-semibold">Loop de consultas detectado y bloqueado</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            Se detectaron más de {this.state.loopDetail.hits} ejecuciones de la misma consulta en menos de {this.state.loopDetail.windowMs}ms.
            Se cortó la ejecución para proteger el sistema.
          </p>

          <p className="text-xs text-muted-foreground break-all">
            Query: {this.state.loopDetail.key}
          </p>

          <div className="pt-1">
            <Button onClick={this.handleReset}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }
}

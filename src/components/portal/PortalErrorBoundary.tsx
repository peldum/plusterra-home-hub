import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface PortalErrorBoundaryProps {
  children: React.ReactNode;
}

interface PortalErrorBoundaryState {
  hasError: boolean;
  resetKey: number;
}

export class PortalErrorBoundary extends React.Component<PortalErrorBoundaryProps, PortalErrorBoundaryState> {
  constructor(props: PortalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError(): Partial<PortalErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PortalErrorBoundary] Error capturado:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (!this.state.hasError) {
      return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-destructive" />
          <h1 className="text-xl font-bold mb-2">Estamos reestableciendo el portal</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Ocurrió un error inesperado. Presioná “Reintentar” para recuperar la vista sin recargar toda la página.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}

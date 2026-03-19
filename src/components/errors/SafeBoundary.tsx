import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SafeBoundaryProps {
  children: React.ReactNode;
  /** Friendly label shown in the fallback UI */
  label?: string;
  /** If true, shows nothing on error instead of fallback UI */
  silent?: boolean;
}

interface SafeBoundaryState {
  hasError: boolean;
  resetKey: number;
}

/**
 * Generic error boundary that isolates failures per-section.
 * Prevents a single component crash from taking down the whole page.
 */
export class SafeBoundary extends React.Component<SafeBoundaryProps, SafeBoundaryState> {
  state: SafeBoundaryState = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): Partial<SafeBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SafeBoundary${this.props.label ? ` — ${this.props.label}` : ''}] Error:`, error, info);
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (!this.state.hasError) {
      return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    }

    if (this.props.silent) return null;

    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground mb-2">
          {this.props.label ? `Error cargando ${this.props.label}` : 'Error inesperado en esta sección'}
        </p>
        <button
          onClick={this.handleRetry}
          className="text-xs px-3 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }
}

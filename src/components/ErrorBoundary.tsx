import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;
  declare props: Props;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('error-boundary', 'Unhandled error', {
      error: error.message,
      stack: error.stack ?? '',
      componentStack: errorInfo.componentStack ?? '',
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-zinc-400 p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-6xl mb-4 text-red-500">!</div>
            <h1 className="text-2xl font-semibold text-white">Algo deu errado</h1>
            <p className="text-sm text-zinc-500">
              O StudioOS encontrou um erro inesperado. O erro foi registrado.
            </p>
            <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-md p-4 text-left overflow-auto max-h-32 font-mono text-red-400">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors text-sm"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function registerGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    logger.error('global', 'Unhandled error', {
      error: event.error?.message ?? String(event),
      stack: event.error?.stack ?? '',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('global', 'Unhandled promise rejection', {
      error: event.reason?.message ?? String(event.reason),
      stack: event.reason?.stack ?? '',
    });
  });
}

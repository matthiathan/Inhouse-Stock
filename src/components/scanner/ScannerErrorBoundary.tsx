import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ScannerErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ScannerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ScannerErrorBoundary extends Component<ScannerErrorBoundaryProps, ScannerErrorBoundaryState> {
  public state: ScannerErrorBoundaryState = { hasError: false, error: null };
  public props: ScannerErrorBoundaryProps;

  constructor(props: ScannerErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ScannerErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Asset scanner crashed:', error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-bg-elevated p-6 text-center shadow-xl dark:border-red-400/20">
          <AlertTriangle className="mx-auto mb-4 text-red-600 dark:text-red-300" size={32} />
          <h2 className="text-xl font-black text-text-primary">Scanner recovered safely</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            The camera scanner hit a browser error. Resetting will close the camera session and reopen a clean scanner instance.
          </p>
          {this.state.error?.message && (
            <pre className="mt-4 max-h-28 overflow-auto rounded-lg border border-brand-border bg-bg-base p-3 text-left text-[11px] text-red-500">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-dallmayr-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-dallmayr-blue-light"
          >
            <RefreshCw size={16} />
            Reset scanner
          </button>
        </div>
      </div>
    );
  }
}

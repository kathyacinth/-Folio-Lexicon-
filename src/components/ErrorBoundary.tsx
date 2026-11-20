import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Folio Lexicon boundary caught error:', error, info);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('folio_lexicon_wordbook_v1');
      localStorage.removeItem('folio_lexicon_recent_v1');
      localStorage.removeItem('folio_lexicon_draft_v1');
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FFF6F8] px-6 text-[#3B1D2A]">
          <div className="max-w-md rounded-2xl border border-[#F3CBD7] bg-white p-8 text-center shadow-xs">
            <h1 className="font-serif text-2xl font-semibold text-[#3B1D2A]">
              Unable to display page
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#6E4757]">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-6 min-h-[40px] rounded-full bg-[#DB5B8A] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#BE3E6D] cursor-pointer"
            >
              Reset &amp; Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

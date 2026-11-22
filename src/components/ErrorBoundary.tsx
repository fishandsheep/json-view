import React from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

/** Last-resort crash screen: a render error must never leave a blank page. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert">
          <div>
            <h1 style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 13 }}>
              The editor hit an unexpected error. Try reloading the page.
            </p>
            <button
              type="button"
              className="btn"
              style={{ marginTop: 12 }}
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            {import.meta.env.DEV && (
              <pre>{this.state.error.stack || this.state.error.message}</pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

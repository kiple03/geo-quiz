import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches errors thrown while rendering a screen, so a bug shows a message with a way
 * back instead of a blank page. AppShell remounts it on every navigation (keyed by
 * `location.key`), which clears the error.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section role="alert">
        <h1>Something went wrong</h1>
        <p>{this.state.error.message}</p>
        <Link to="/" className="button">
          Back to menu
        </Link>
      </section>
    );
  }
}

export default ErrorBoundary;

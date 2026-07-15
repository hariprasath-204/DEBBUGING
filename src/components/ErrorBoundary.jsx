import React from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Frontend Component Crash Caught by ErrorBoundary:", error, errorInfo);
  }

  handleRecovery = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          background: 'radial-gradient(circle at center, rgba(20, 10, 35, 0.95) 0%, #080b12 100%)',
          color: 'var(--text-primary)',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '650px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '2px solid var(--accent-pink)',
            borderRadius: '20px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(255, 0, 127, 0.3)'
          }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: 'rgba(255, 0, 127, 0.15)',
              border: '1px solid var(--accent-pink)',
              marginBottom: '1.5rem',
              color: 'var(--accent-pink)'
            }}>
              <ShieldAlert size={48} />
            </div>

            <h1 className="glow-text-cyan" style={{ fontSize: '2.2rem', marginBottom: '1rem', letterSpacing: '2px' }}>
              ⚠️ SESSION GLITCH DETECTED
            </h1>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              We prevented an unexpected display freeze or rendering interruption. Your code and session records are securely synced in the cloud. Click below to refresh and instantly restore your workspace.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleRecovery}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '1.05rem', borderRadius: '30px' }}
              >
                <RefreshCw size={18} /> RESTORE WORKSPACE
              </button>

              <button
                onClick={this.handleGoHome}
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '1.05rem', borderRadius: '30px' }}
              >
                <Home size={18} /> RETURN TO HOME
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

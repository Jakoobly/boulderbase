// src/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unbekannter Fehler' };
  }

  componentDidCatch(error, info) {
    console.error('BoulderBase UI Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="screen active">
          <div className="card">
            <div className="card-title">Fehler</div>
            <h2>Die App konnte diesen Bereich nicht laden.</h2>
            <p className="sub mt8">{this.state.message}</p>
            <button className="btn btn-primary mt12" onClick={() => window.location.reload()}>Neu laden</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

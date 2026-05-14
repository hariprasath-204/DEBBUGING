import React from 'react';
import { useNavigate } from 'react-router-dom';

const ThankYouPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px' }}>
        <h2 className="glow-text-cyan" style={{ fontSize: '3rem', marginBottom: '1rem' }}>THANK YOU</h2>
        <h3 style={{ color: 'var(--accent-pink)', marginBottom: '2rem', fontSize: '1.5rem' }}>EVENT CONCLUDED</h3>
        <p style={{ color: 'var(--text-primary)', marginBottom: '2rem' }}>
          Thank you for participating in the Debugging Challenge. The event has officially ended.
        </p>
      </div>
    </div>
  );
};

export default ThankYouPage;

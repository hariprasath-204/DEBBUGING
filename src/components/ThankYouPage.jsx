import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearFullUserSession } from '../utils/drafts';

const ThankYouPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    clearFullUserSession();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px' }}>
        <h2 className="glow-text-cyan" style={{ fontSize: '3rem', marginBottom: '1rem' }}>THANK YOU</h2>
        <h3 style={{ color: 'var(--accent-pink)', marginBottom: '2rem', fontSize: '1.5rem' }}>EVENT CONCLUDED</h3>
        <p style={{ color: 'var(--text-primary)', marginBottom: '2rem' }}>
          Thank you for participating in the Debugging Challenge. The event has officially ended.
        </p>
        <button
          onClick={() => {
            clearFullUserSession();
            navigate('/');
          }}
          className="btn-secondary"
          style={{ padding: '10px 24px', fontSize: '0.9rem', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
        >
          LOGOUT / NEXT PARTICIPANT
        </button>
      </div>
    </div>
  );
};

export default ThankYouPage;

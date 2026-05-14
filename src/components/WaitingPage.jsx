import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const WaitingPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('waiting');
  const userName = localStorage.getItem('debugEventUserName');

  useEffect(() => {
    if (!userName) {
      navigate('/');
      return;
    }

    // Subscribe to global event status
    const unsub = onSnapshot(doc(db, "settings", "event"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setStatus(data.status);
        if (data.status === 'active') {
          navigate('/editor/default_question');
        } else if (data.status === 'ended') {
          navigate('/thank-you');
        }
      }
    });

    return () => unsub();
  }, [navigate, userName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <h2 className="glow-text-cyan" style={{ fontSize: '2rem', marginBottom: '1rem' }}>WELCOME, {userName}</h2>
      
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '500px' }}>
        <h3 style={{ color: 'var(--accent-pink)', marginBottom: '2rem', fontSize: '1.5rem' }}>WAITING FOR ADMIN...</h3>
        <p style={{ color: 'var(--text-primary)', marginBottom: '2rem' }}>
          Please hold on. The debugging event will commence shortly. You will be automatically redirected when the admin starts the timer.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <div className="loader" style={{ 
            width: '20px', height: '20px', borderRadius: '50%', 
            background: 'var(--accent-cyan)', animation: 'pulse 1.5s infinite' 
          }}></div>
          <div className="loader" style={{ 
            width: '20px', height: '20px', borderRadius: '50%', 
            background: 'var(--accent-pink)', animation: 'pulse 1.5s infinite 0.5s' 
          }}></div>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default WaitingPage;

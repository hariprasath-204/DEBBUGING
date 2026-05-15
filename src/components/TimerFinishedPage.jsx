import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, getDoc, getDocs, collection } from 'firebase/firestore';

const TimerFinishedPage = () => {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState("TIME IS UP!");
  const [subText, setSubText] = useState("YOUR CODE HAS BEEN AUTO-SUBMITTED");
  const userId = localStorage.getItem('debugEventUserId');

  useEffect(() => {
    const checkStatus = async () => {
      if (!userId) return;
      const userSnap = await getDoc(doc(db, 'users', userId));
      const qSnap = await getDocs(collection(db, 'questions'));

      if (userSnap.exists()) {
        const completed = userSnap.data().completedQuestions || [];
        const lockedLanguage = localStorage.getItem('debugEventLanguage') || 'cpp';
        let totalQs = 0;
        qSnap.forEach(d => {
          const data = d.data();
          if (data.phase) {
            const variant = data.variants && data.variants[lockedLanguage];
            const hasVariant = variant && (variant.initialCode !== '' || variant.correctCode !== '' || variant.errorLines !== '');
            if (hasVariant) totalQs++;
          }
        });

        if (totalQs > 0 && completed.length >= totalQs) {
          setStatusText("ALL MISSIONS ACCOMPLISHED!");
          setSubText("YOU HAVE SUCCESSFULLY COMPLETED ALL TASKS");
        }
      }
    };
    checkStatus();

    // Listen for admin ending the event -> go to Thank You page
    const unsub = onSnapshot(doc(db, "settings", "event"), (snap) => {
      if (snap.exists() && snap.data().status === 'ended') {
        navigate('/thank-you');
      }
    });

    return () => unsub();
  }, [navigate, userId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px' }}>
        <h2 className="glow-text-cyan" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{statusText}</h2>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '1.2rem' }}>{subText}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Please wait for the admin to officially end the event and announce the final results.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse 1.5s infinite' }}></div>
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: 'var(--accent-pink)', animation: 'pulse 1.5s infinite 0.5s' }}></div>
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

export default TimerFinishedPage;

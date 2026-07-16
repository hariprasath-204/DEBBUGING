import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { clearFullUserSession } from '../utils/drafts';
import { getNow, syncClock } from '../utils/timeSync';

const TimerFinishedPage = () => {
  const navigate = useNavigate();

  const userId = localStorage.getItem('debugEventUserId');

  useEffect(() => {
    syncClock();

    // Listen for event status and user reset
    const unsubEvent = onSnapshot(doc(db, "settings", "event"), async (snap) => {
      if (snap.exists()) {
        const ev = snap.data();
        const status = ev.status;
        if (status === 'ended' || status === 'stopped') {
          clearFullUserSession();
          navigate('/thank-you');
        } else if (status === 'waiting') {
          clearFullUserSession();
          navigate('/waiting');
        } else if (status === 'active') {
          await syncClock();
          const end = ev.endTime ? new Date(ev.endTime).getTime() : 0;
          if (ev.endTime && !isNaN(end) && end > 0 && end - getNow() > 0) {
            const currentUserId = localStorage.getItem('debugEventUserId');
            if (currentUserId) {
              getDoc(doc(db, "users", currentUserId)).then(uSnap => {
                if (uSnap.exists() && !uSnap.data().isFinished) {
                  navigate('/selection');
                }
              }).catch(() => {});
            }
          }
        }
      }
    });

    let unsubUser = () => {};
    const currentUserId = localStorage.getItem('debugEventUserId');
    if (currentUserId) {
      unsubUser = onSnapshot(doc(db, "users", currentUserId), async (userSnap) => {
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData && !userData.isFinished) {
            const eventSnap = await getDoc(doc(db, "settings", "event"));
            if (eventSnap.exists()) {
              const ev = eventSnap.data();
              await syncClock();
              const end = ev.endTime ? new Date(ev.endTime).getTime() : 0;
              if (ev.endTime && !isNaN(end) && end > 0 && end - getNow() <= 0) {
                updateDoc(doc(db, "users", currentUserId), { isFinished: true, selectedQuestionId: null }).catch(() => {});
                return;
              }
            }
            navigate('/selection');
          }
        }
      });
    }

    return () => {
      unsubEvent();
      unsubUser();
    };
  }, [navigate, userId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px' }}>
        <h2 className="glow-text-cyan" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>TIME IS UP!</h2>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '1.2rem' }}>YOUR CODE HAS BEEN AUTO-SUBMITTED</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Please wait for the admin to officially end the event and announce the final results.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, onSnapshot, query, where, getDocs, updateDoc } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';

// ── Landing Page ─────────────────────────────────────────────────
const LandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [rollNo, setRollNo] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [loading, setLoading] = useState(false);
  const [langSettings, setLangSettings] = useState({ c: true, cpp: true, java: true });
  const [usersList, setUsersList] = useState([]);
  const [popup, setPopup] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubLang = onSnapshot(doc(db, 'settings', 'language'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLangSettings(data);
        if (!data[language]) {
          if (data.cpp) setLanguage('cpp');
          else if (data.c) setLanguage('c');
          else if (data.java) setLanguage('java');
        }
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uList = [];
      snapshot.forEach(d => uList.push({ id: d.id, ...d.data() }));
      setUsersList(uList);
    });

    return () => {
      unsubLang();
      unsubUsers();
    };
  }, [language]);

  const detectedUser = usersList.find(u => {
    if (!u.rollNo || !rollNo) return false;
    const dbRoll = String(u.rollNo).trim().toLowerCase();
    const inputRoll = String(rollNo).trim().toLowerCase();
    if (dbRoll === inputRoll) return true;
    const dbNum = dbRoll.replace(/[^0-9a-z]/g, '');
    const inputNum = inputRoll.replace(/[^0-9a-z]/g, '');
    return dbNum !== '' && dbNum === inputNum;
  });

  const handleInitiateSession = async (e) => {
    e.preventDefault();
    if (!rollNo) return;
    if (!detectedUser) {
      setPopup({ message: `Lot #${rollNo} not registered! Please ask the Admin to register your Lot number first.`, type: "error" });
      return;
    }
    setLoading(true);
    try {
      const userId = detectedUser.id;
      const userName = detectedUser.name || `Lot ${detectedUser.rollNo}`;
      localStorage.setItem('debugEventUserId', userId);
      localStorage.setItem('debugEventUserName', userName);

      const eventDocRef = doc(db, 'settings', 'event');
      const eventDocSnap = await getDoc(eventDocRef);
      if (!eventDocSnap.exists()) {
        await setDoc(eventDocRef, { status: 'waiting', endTime: null, durationMinutes: 60 });
        navigate('/waiting');
      } else {
        const eventData = eventDocSnap.data();
        if (eventData.status === 'active') navigate('/selection');
        else if (eventData.status === 'ended') navigate('/thank-you');
        else navigate('/waiting');
      }
    } catch (error) {
      console.error("Error: ", error);
      setPopup({ message: "Failed to connect. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={loading} />
      {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} />}

      {/*
        Outer wrapper: flex column, full viewport.
        - Hero div: flex:1  → takes all remaining space, centers content
        - Copyright p: flexShrink:0 → always pinned at bottom, never hidden
      */}
      <div style={{
        position: 'relative', zIndex: 1,
        height: '100vh', width: '100vw',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}>

        {/* ── HERO (flex:1 means it fills remaining height) ── */}
        <div style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '30px',
          transition: 'opacity 0.4s, filter 0.4s',
          opacity: showModal ? 0.07 : 1,
          filter: showModal ? 'blur(5px)' : 'none',
          pointerEvents: showModal ? 'none' : 'auto',
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* College panel */}
            <div style={{
              border: '1px solid var(--accent-cyan)',
              borderTop: '2px solid var(--accent-cyan)',
              padding: '0.75rem 2.4rem',
              marginBottom: '1.4rem',
              background: 'transparent',
              boxShadow: '0 0 22px rgba(0,240,255,0.2)',
              borderRadius: '3px',
            }}>
              <p style={{
                fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0,
                letterSpacing: '3px', fontFamily: 'var(--font-heading)',
                fontWeight: '700', textTransform: 'uppercase'
              }}>
                Ayya Nadar Janaki Ammal College
              </p>
              <p style={{
                fontSize: '0.95rem', color: 'var(--accent-cyan)', margin: '4px 0 0 0',
                letterSpacing: '2px', fontFamily: 'var(--font-heading)',
                fontWeight: '500', textTransform: 'uppercase'
              }}>
                Department of Computer Applications
              </p>
            </div>

            {/* SOFTTECH */}
            <h1 style={{
              fontSize: 'clamp(5rem, 15vw, 11rem)',
              margin: 0, lineHeight: 0.88,
              fontFamily: 'var(--font-heading)',
              background: 'linear-gradient(90deg, #00F0FF 0%, #9D00FF 50%, #FF00FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 28px rgba(0,240,255,0.6)) drop-shadow(0 0 60px rgba(157,0,255,0.4))',
              letterSpacing: '4px', fontWeight: '900'
            }}>SOFTTECH</h1>

            {/* ASSOCIATION */}
            <h1 style={{
              fontSize: 'clamp(2.8rem, 8vw, 6.5rem)',
              margin: '0 0 0.5rem 0',
              fontFamily: 'var(--font-heading)',
              color: '#FF00FF',
              textShadow: '0 0 25px rgba(255,0,255,0.9), 0 0 60px rgba(255,0,255,0.4)',
              letterSpacing: '10px', fontWeight: '700'
            }}>ASSOCIATION</h1>

            {/* Subtitle */}
            <p style={{
              color: 'var(--text-secondary)', letterSpacing: '5px', fontSize: '0.82rem',
              marginBottom: '1.4rem', textTransform: 'uppercase',
              fontFamily: 'var(--font-body)', fontWeight: '400'
            }}>
              THE ULTIMATE DEBUGGING CHALLENGE
            </p>

            {/* CTA */}
            <button
              className="btn-primary"
              style={{ fontSize: '1rem', padding: '12px 48px', letterSpacing: '3px' }}
              onClick={() => setShowModal(true)}
            >
              &gt; START_SYSTEM
            </button>

          </div>
        </div>
        {/* ── END HERO ── */}

        {/* ── COPYRIGHT — position:fixed beats all overflow:hidden clipping ── */}
        <p style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.68rem',
          letterSpacing: '1px',
          fontFamily: 'var(--font-body)',
          padding: '6px 0 8px 0',
          margin: 0,
          zIndex: 5,
          background: 'transparent',
        }}>
          © 2026 Ayya Nadar Janaki Ammal College. Dept. of Computer Applications. All rights reserved.
        </p>

      </div>
      {/* ── END OUTER WRAPPER ── */}

      {/* Login Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20
        }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '440px', textAlign: 'center' }}>
            <h2 className="glow-text-cyan" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>SYSTEM ACCESS</h2>
            <form onSubmit={handleInitiateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1.5px', fontFamily: 'var(--font-heading)' }}>TEAM IDENTIFIER (LOT #)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter Lot # (e.g. 01)"
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Automatically Detected Participant Box */}
              {detectedUser ? (
                <div style={{
                  background: 'rgba(0, 245, 155, 0.08)',
                  border: '1px solid #00f59b',
                  padding: '0.85rem 1rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 0 16px rgba(0, 245, 155, 0.2)'
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.7rem', color: '#00f59b', letterSpacing: '1.5px', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>
                      ✓ DETECTED PARTICIPANT
                    </span>
                    <strong style={{ fontSize: '1.08rem', color: 'var(--text-primary)' }}>
                      {detectedUser.name}
                    </strong>
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    background: '#00f59b',
                    color: '#040711',
                    fontWeight: 'bold',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    LOT {detectedUser.rollNo}
                  </span>
                </div>
              ) : rollNo.trim() !== '' ? (
                <div style={{
                  background: 'rgba(255, 0, 85, 0.06)',
                  border: '1px solid rgba(255, 0, 85, 0.3)',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: 'var(--accent-pink)',
                  fontSize: '0.82rem'
                }}>
                  Lot #{rollNo} not found in registry. Ask Admin to add your Lot number.
                </div>
              ) : null}

              <div style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid var(--accent-cyan)', padding: '0.75rem', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>ROUND LANGUAGES ASSIGNED AUTOMATICALLY</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>EASY: C &nbsp;|&nbsp; MEDIUM: C++ &nbsp;|&nbsp; HARD: JAVA</div>
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !detectedUser}
                style={{
                  marginTop: '0.4rem',
                  background: detectedUser ? 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)' : '#091A40',
                  borderColor: 'var(--accent-cyan)',
                  color: detectedUser ? '#040711' : 'var(--accent-cyan)'
                }}
              >
                {loading ? 'CONNECTING...' : 'INITIATE_SESSION'}
              </button>
            </form>
            <button onClick={() => setShowModal(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', marginTop: '1rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              [ ESCAPE_SEQUENCE ]
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LandingPage;

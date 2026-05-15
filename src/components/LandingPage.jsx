import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, onSnapshot, query, where, getDocs, updateDoc } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';

// ── Landing Page ─────────────────────────────────────────────────
const LandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [loading, setLoading] = useState(false);
  const [langSettings, setLangSettings] = useState({ c: true, cpp: true, java: true });
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
    return () => unsubLang();
  }, [language]);

  const handleInitiateSession = async (e) => {
    e.preventDefault();
    if (!name || !rollNo || !language) return;
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("rollNo", "==", rollNo));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setPopup({ message: "Invalid Lot #! Please contact the Admin to register your Lot #.", type: "error" });
        setLoading(false); return;
      }
      const userDocSnap = querySnapshot.docs.find(d => d.data().name.toLowerCase() === name.toLowerCase());
      if (!userDocSnap) {
        setPopup({ message: "Lot # found, but Participant Name does not match. Please verify.", type: "error" });
        setLoading(false); return;
      }
      const userDocData = userDocSnap.data();
      const userId = userDocSnap.id;
      await updateDoc(doc(db, 'users', userId), { selectedLanguage: language });
      localStorage.setItem('debugEventUserId', userId);
      localStorage.setItem('debugEventUserName', userDocData.name);
      localStorage.setItem('debugEventLanguage', language);
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
            <form onSubmit={handleInitiateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1.5px', fontFamily: 'var(--font-heading)' }}>PARTICIPANT NAME</label>
                <input type="text" className="input-field" placeholder="Enter Name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1.5px', fontFamily: 'var(--font-heading)' }}>TEAM IDENTIFIER (LOT #)</label>
                <input type="text" className="input-field" placeholder="# 00" value={rollNo} onChange={e => setRollNo(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1.5px', fontFamily: 'var(--font-heading)' }}>SYSTEM LANGUAGE</label>
                <select className="input-field" value={language} onChange={e => setLanguage(e.target.value)} required>
                  {langSettings.c && <option value="c">C</option>}
                  {langSettings.cpp && <option value="cpp">C++</option>}
                  {langSettings.java && <option value="java">Java</option>}
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ marginTop: '0.4rem', background: '#091A40', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
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

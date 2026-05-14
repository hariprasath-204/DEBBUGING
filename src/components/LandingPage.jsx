import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, serverTimestamp, doc, getDoc, setDoc, onSnapshot, query, where, getDocs, updateDoc } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';

// ── Particle Network Canvas ──────────────────────────────────────
const ParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#00F0FF', '#FF00FF', '#9D00FF', '#FFD700'];
    const NUM = 80;
    const MAX_DIST = 160;

    const particles = Array.from({ length: NUM }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // move
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      // lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = 1 - dist / MAX_DIST;
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.35})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // dots
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
};

// ── Landing Page ────────────────────────────────────────────────
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

      {/* Particle network background */}
      <ParticleCanvas />

      {/* Page content */}
      <div style={{
        position: 'relative', zIndex: 1,
        height: '100vh', width: '100vw',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(8,16,54,0.92) 0%, rgba(22,10,50,0.92) 100%)'
      }}>

        {/* Main hero — fades when modal opens */}
        <div style={{
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
          transition: 'opacity 0.4s, filter 0.4s',
          opacity: showModal ? 0.1 : 1,
          filter: showModal ? 'blur(4px)' : 'none',
          pointerEvents: showModal ? 'none' : 'auto'
        }}>
          {/* College box */}
          <div style={{
            border: '1px solid var(--accent-cyan)',
            borderTop: '3px solid var(--accent-cyan)',
            padding: '0.9rem 2.5rem',
            marginBottom: '1.8rem',
            background: 'rgba(0,10,30,0.7)',
            boxShadow: '0 0 24px rgba(0,240,255,0.15)',
            borderRadius: '4px'
          }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, letterSpacing: '3px', fontFamily: 'var(--font-body)', fontWeight: '700', textTransform: 'uppercase' }}>
              Ayya Nadar Janaki Ammal College
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', margin: '4px 0 0 0', letterSpacing: '2px', fontFamily: 'var(--font-body)', fontWeight: '500', textTransform: 'uppercase' }}>
              Department of Computer Applications
            </p>
          </div>

          {/* SOFTTECH — large gradient */}
          <h1 style={{
            fontSize: 'clamp(4rem, 10vw, 7.5rem)',
            margin: 0, lineHeight: 1,
            fontFamily: 'var(--font-heading)',
            background: 'linear-gradient(90deg, #00F0FF 0%, #9D00FF 50%, #FF00FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(0,240,255,0.5))',
            letterSpacing: '4px'
          }}>SOFTTECH</h1>

          {/* ASSOCIATION — magenta glow */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 7vw, 5rem)',
            margin: '0 0 0.8rem 0',
            fontFamily: 'var(--font-heading)',
            color: '#FF00FF',
            textShadow: '0 0 30px rgba(255,0,255,0.7), 0 0 60px rgba(255,0,255,0.3)',
            letterSpacing: '12px'
          }}>ASSOCIATION</h1>

          {/* Subtitle */}
          <p style={{
            color: 'var(--text-secondary)', letterSpacing: '6px', fontSize: '0.95rem',
            marginBottom: '2.2rem', textTransform: 'uppercase',
            fontFamily: 'var(--font-body)', fontWeight: '400'
          }}>
            ✦ THE ULTIMATE DEBUGGING CHALLENGE
          </p>

          {/* CTA button */}
          <button
            className="btn-primary"
            style={{ fontSize: '1.1rem', padding: '14px 48px', letterSpacing: '3px' }}
            onClick={() => setShowModal(true)}
          >
            &gt; START_SYSTEM
          </button>
        </div>

        {/* Login Modal */}
        {showModal && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '480px', textAlign: 'center' }}>
              <h2 className="glow-text-cyan" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>SYSTEM ACCESS</h2>
              <form onSubmit={handleInitiateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', letterSpacing: '1px' }}>PARTICIPANT NAME</label>
                  <input type="text" className="input-field" placeholder="Enter Name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', letterSpacing: '1px' }}>TEAM IDENTIFIER (LOT #)</label>
                  <input type="text" className="input-field" placeholder="# 00" value={rollNo} onChange={e => setRollNo(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', letterSpacing: '1px' }}>SYSTEM LANGUAGE</label>
                  <select className="input-field" value={language} onChange={e => setLanguage(e.target.value)} required>
                    {langSettings.c   && <option value="c">C</option>}
                    {langSettings.cpp && <option value="cpp">C++</option>}
                    {langSettings.java && <option value="java">Java</option>}
                  </select>
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem', background: '#091A40', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
                  {loading ? 'CONNECTING...' : 'INITIATE_SESSION'}
                </button>
              </form>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', marginTop: '1.5rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                [ ESCAPE_SEQUENCE ]
              </button>
            </div>
          </div>
        )}

        {/* Copyright */}
        <p style={{ position: 'absolute', bottom: '14px', left: 0, right: 0, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '1px', zIndex: 2 }}>
          © 2026 Ayya Nadar Janaki Ammal College. Dept. of Computer Applications. All rights reserved.
        </p>
      </div>
    </>
  );
};

export default LandingPage;

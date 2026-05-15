import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, onSnapshot, query, where, getDocs, updateDoc } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';

// ── Aurora Nebula + Stars + Orbs Canvas ──────────────────────────
const AuroraCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let frame = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Stars ──
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.3,
      brightness: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.04 + 0.01,
      offset: Math.random() * Math.PI * 2,
    }));

    // ── Floating glowing orbs ──
    const ORB_COLORS = [
      { inner: 'rgba(0,240,255,0.18)',  outer: 'rgba(0,240,255,0)' },
      { inner: 'rgba(157,0,255,0.15)', outer: 'rgba(157,0,255,0)' },
      { inner: 'rgba(255,0,255,0.15)', outer: 'rgba(255,0,255,0)' },
      { inner: 'rgba(0,160,255,0.12)', outer: 'rgba(0,160,255,0)' },
    ];
    const orbs = Array.from({ length: 7 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 120 + Math.random() * 180,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.006,
      color: ORB_COLORS[i % ORB_COLORS.length],
    }));

    // ── Aurora wave bands ──
    const AURORA_BANDS = [
      { yFrac: 0.25, color: '0,240,255',  amp1: 70, amp2: 35, spd1: 0.007, spd2: 0.011, phase: 0 },
      { yFrac: 0.45, color: '157,0,255',  amp1: 55, amp2: 28, spd1: 0.006, spd2: 0.009, phase: 1.8 },
      { yFrac: 0.65, color: '255,0,255',  amp1: 60, amp2: 30, spd1: 0.005, spd2: 0.008, phase: 3.5 },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // ── Twinkling stars ──
      stars.forEach(s => {
        const alpha = s.brightness * (0.4 + 0.6 * Math.abs(Math.sin(frame * s.speed + s.offset)));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = s.r > 1 ? 4 : 0;
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // ── Aurora wave bands ──
      AURORA_BANDS.forEach(band => {
        const yBase = canvas.height * band.yFrac;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width + 5; x += 4) {
          const y = yBase
            + Math.sin(x * 0.008 + frame * band.spd1 + band.phase) * band.amp1
            + Math.sin(x * 0.015 + frame * band.spd2 + band.phase * 1.3) * band.amp2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, yBase - band.amp1, 0, yBase + band.amp1);
        grad.addColorStop(0, `rgba(${band.color}, 0)`);
        grad.addColorStop(0.45, `rgba(${band.color}, 0.09)`);
        grad.addColorStop(0.55, `rgba(${band.color}, 0.09)`);
        grad.addColorStop(1, `rgba(${band.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();

        // Glowing edge line on each aurora band
        ctx.beginPath();
        for (let x = 0; x <= canvas.width + 5; x += 4) {
          const y = yBase
            + Math.sin(x * 0.008 + frame * band.spd1 + band.phase) * band.amp1
            + Math.sin(x * 0.015 + frame * band.spd2 + band.phase * 1.3) * band.amp2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${band.color}, 0.4)`;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = `rgb(${band.color})`;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // ── Floating glowing orbs ──
      orbs.forEach(orb => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        orb.phase += orb.speed;
        if (orb.x < -orb.r * 2) orb.x = canvas.width + orb.r;
        if (orb.x > canvas.width + orb.r * 2) orb.x = -orb.r;
        if (orb.y < -orb.r * 2) orb.y = canvas.height + orb.r;
        if (orb.y > canvas.height + orb.r * 2) orb.y = -orb.r;

        const pulse = 0.8 + 0.2 * Math.sin(orb.phase);
        const rad = orb.r * pulse;
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, rad);
        grad.addColorStop(0, orb.color.inner);
        grad.addColorStop(1, orb.color.outer);
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
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

      {/* Aurora background */}
      <AuroraCanvas />

      {/* Page — flex column: hero fills space, copyright always at bottom */}
      <div style={{
        position: 'relative', zIndex: 1,
        height: '100vh', width: '100vw',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}>

        {/* Hero — fills remaining height, centers content */}
        <div style={{
          flex: 1, width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
              fontSize: 'clamp(3.5rem, 11vw, 8rem)',
              margin: 0, lineHeight: 0.9,
              fontFamily: 'var(--font-heading)',
              background: 'linear-gradient(90deg, #00F0FF 0%, #9D00FF 50%, #FF00FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 28px rgba(0,240,255,0.6)) drop-shadow(0 0 60px rgba(157,0,255,0.4))',
              letterSpacing: '6px', fontWeight: '900'
            }}>SOFTTECH</h1>

            {/* ASSOCIATION */}
            <h1 style={{
              fontSize: 'clamp(1.8rem, 5.5vw, 4rem)',
              margin: '0.1rem 0 0.6rem 0',
              fontFamily: 'var(--font-heading)',
              color: '#FF00FF',
              textShadow: '0 0 25px rgba(255,0,255,0.9), 0 0 60px rgba(255,0,255,0.4)',
              letterSpacing: '14px', fontWeight: '700'
            }}>ASSOCIATION</h1>

            {/* Subtitle */}
            <p style={{
              color: 'rgba(208,232,255,0.6)', letterSpacing: '6px', fontSize: '0.8rem',
              marginBottom: '1.6rem', textTransform: 'uppercase',
              fontFamily: 'var(--font-body)', fontWeight: '400'
            }}>
              ✦ THE ULTIMATE DEBUGGING CHALLENGE ✦
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

        {/* Copyright — always at bottom in normal flow */}
        <p style={{
          width: '100%', flexShrink: 0,
          textAlign: 'center', color: 'rgba(132,163,209,0.65)',
          fontSize: '0.68rem', letterSpacing: '1px',
          fontFamily: 'var(--font-body)',
          padding: '8px 0 10px 0',
        }}>
          © 2026 Ayya Nadar Janaki Ammal College. Dept. of Computer Applications. All rights reserved.
        </p>
      </div>

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
                  {langSettings.c   && <option value="c">C</option>}
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

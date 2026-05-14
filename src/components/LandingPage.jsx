import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, serverTimestamp, doc, getDoc, setDoc, onSnapshot, query, where, getDocs, updateDoc } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';

const LandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [loading, setLoading] = useState(false);
  const [langSettings, setLangSettings] = useState({ c: true, cpp: true, java: true });
  const [newsText, setNewsText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubLang = onSnapshot(doc(db, 'settings', 'language'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLangSettings(data);
        // Ensure selected language is allowed
        if (!data[language]) {
          if (data.cpp) setLanguage('cpp');
          else if (data.c) setLanguage('c');
          else if (data.java) setLanguage('java');
        }
      }
    });
    
    const unsubNews = onSnapshot(doc(db, 'settings', 'news'), (docSnap) => {
      if (docSnap.exists()) setNewsText(docSnap.data().text || '');
    });

    return () => {
      unsubLang();
      unsubNews();
    };
  }, [language]);

  const handleInitiateSession = async (e) => {
    e.preventDefault();
    if (!name || !rollNo || !language) return;
    
    setLoading(true);
    try {
      // 1. Query for the existing user by rollNo
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("rollNo", "==", rollNo));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert("Invalid Lot #! Please contact the Admin to register your Lot #.");
        setLoading(false);
        return;
      }
      
      // 2. Find the user with matching name (case-insensitive)
      const userDocSnap = querySnapshot.docs.find(d => d.data().name.toLowerCase() === name.toLowerCase());
      
      if (!userDocSnap) {
        alert("Lot # found, but Participant Name does not match. Please verify.");
        setLoading(false);
        return;
      }
      
      const userDocData = userDocSnap.data();
      const userId = userDocSnap.id;
      
      // 3. Update the user with their selected language
      await updateDoc(doc(db, 'users', userId), {
        selectedLanguage: language
      });
      
      // 4. Save to local storage for the Editor page
      localStorage.setItem('debugEventUserId', userId);
      localStorage.setItem('debugEventUserName', userDocData.name);
      localStorage.setItem('debugEventLanguage', language);
      
      // 5. Check Event Status and Navigate
      const eventDocRef = doc(db, 'settings', 'event');
      const eventDocSnap = await getDoc(eventDocRef);
      
      if (!eventDocSnap.exists()) {
        await setDoc(eventDocRef, { status: 'waiting', endTime: null, durationMinutes: 60 });
        navigate('/waiting');
      } else {
        const eventData = eventDocSnap.data();
        if (eventData.status === 'active') {
          navigate('/editor/default_question');
        } else if (eventData.status === 'ended') {
          navigate('/thank-you');
        } else {
          navigate('/waiting');
        }
      }
    } catch (error) {
      console.error("Error connecting user: ", error);
      alert("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={loading} />
      {newsText && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'var(--accent-magenta)', color: 'var(--text-primary)', padding: '5px 0', zIndex: 9999, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
          <marquee scrollamount="8">{newsText}</marquee>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', position: 'relative' }}>
      
      {/* Step 1: Main Title Screen */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'opacity 0.3s', opacity: showModal ? 0.2 : 1, pointerEvents: showModal ? 'none' : 'auto' }}>
        
        <div style={{ border: '1px solid var(--accent-cyan)', padding: '1.5rem 3rem', marginBottom: '4rem', background: 'rgba(10, 7, 16, 0.5)' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '4px' }}>AYYA NADAR JANAKI AMMAL COLLEGE</h2>
          <h3 style={{ fontSize: '1rem', color: 'var(--accent-cyan)', letterSpacing: '3px' }}>DEPARTMENT OF COMPUTER APPLICATIONS</h3>
        </div>
        
        <h1 className="gradient-title" style={{ fontSize: '6rem', margin: '0', lineHeight: '1.1', fontFamily: 'var(--font-heading)' }}>SOFTTECH</h1>
        <h1 className="glow-text-magenta" style={{ fontSize: '4.5rem', margin: '0 0 2rem 0', letterSpacing: '10px' }}>ASSOCIATION</h1>
        
        <h4 style={{ color: 'var(--text-secondary)', letterSpacing: '8px', fontSize: '1.2rem', marginBottom: '4rem', textTransform: 'uppercase' }}>
          THE ULTIMATE DEBUGGING CHALLENGE
        </h4>

        <button className="btn-primary" onClick={() => setShowModal(true)}>
          &gt; START_SYSTEM
        </button>
      </div>

      {/* Step 2: System Access Modal */}
      {showModal && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '500px', textAlign: 'center' }}>
            <h2 className="glow-text-cyan" style={{ fontSize: '2rem', marginBottom: '2.5rem' }}>SYSTEM ACCESS</h2>
            
            <form onSubmit={handleInitiateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.9rem', letterSpacing: '1px' }}>PARTICIPANT NAME</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.9rem', letterSpacing: '1px' }}>TEAM IDENTIFIER (LOT #)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="# 00" 
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.9rem', letterSpacing: '1px' }}>SYSTEM LANGUAGE</label>
                <select 
                  className="input-field" 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  required
                >
                  {langSettings.c && <option value="c">C</option>}
                  {langSettings.cpp && <option value="cpp">C++</option>}
                  {langSettings.java && <option value="java">Java</option>}
                </select>
              </div>
              
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1.5rem', background: '#091A40', borderColor: '#1A246B', color: 'var(--accent-cyan)' }}>
                {loading ? 'CONNECTING...' : 'INITIATE_SESSION'}
              </button>
            </form>

            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', marginTop: '2rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
              [ ESCAPE_SEQUENCE ]
            </button>
          </div>
        </div>
      )}
      
      <p style={{ position: 'absolute', bottom: '-20px', color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '1px' }}>
        © 2026 Ayya Nadar Janaki Ammal College. Dept. of Computer Applications. All rights reserved.
      </p>
    </div>
    </>
  );
};

export default LandingPage;

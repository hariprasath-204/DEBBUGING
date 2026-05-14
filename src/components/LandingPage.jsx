import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';

const LandingPage = () => {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name || !rollNo || !language) return;
    
    setLoading(true);
    try {
      // Create user entry
      const userRef = await addDoc(collection(db, 'users'), {
        name,
        rollNo,
        selectedLanguage: language,
        tabSwitches: 0,
        copyPasteCount: 0,
        score: 0,
        currentCode: '',
        isFinished: false,
        joinedAt: serverTimestamp()
      });
      
      // Store user ID in local storage to keep track of the current session
      localStorage.setItem('debugEventUserId', userRef.id);
      localStorage.setItem('debugEventUserName', name);
      localStorage.setItem('debugEventLanguage', language);
      
      // Fetch Event Status
      const eventDocRef = doc(db, 'settings', 'event');
      const eventDocSnap = await getDoc(eventDocRef);
      
      if (!eventDocSnap.exists()) {
        // Initialize if doesn't exist
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
      console.error("Error registering user: ", error);
      alert("Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>COLLEGE NAME</h2>
        <h3 style={{ fontSize: '1rem', color: 'var(--accent-pink)', marginBottom: '2rem' }}>DEPARTMENT OF COMPUTER APPLICATIONS</h3>
        
        <h1 className="glow-text-cyan" style={{ fontSize: '4rem', margin: '1rem 0' }}>DEBUGGING</h1>
        <h1 className="glow-text-pink" style={{ fontSize: '3rem', margin: '0' }}>CHALLENGE</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>NAME</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter your name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-pink)' }}>ROLL NO / LOT ID</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter your roll number" 
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>SELECT LANGUAGE</label>
            <select 
              className="input-field" 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
              style={{ background: 'var(--bg-deep-navy)' }}
            >
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'INITIALIZING...' : '> START_SYSTEM'}
          </button>
        </form>
      </div>
      
      <p style={{ marginTop: '3rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        © 2026 College Name. Dept. of Computer Applications. All rights reserved.
      </p>
    </div>
  );
};

export default LandingPage;

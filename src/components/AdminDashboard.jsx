import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import LoadingOverlay from './LoadingOverlay';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'event' | 'tracker' | 'users'
  const [isLoading, setIsLoading] = useState(false);
  
  // Question Form State
  const [formData, setFormData] = useState({
    title: '', description: '', expectedOutput: '', points: 100,
    variants: {
      c: { initialCode: '', correctCode: '', errorLines: '' },
      cpp: { initialCode: '', correctCode: '', errorLines: '' },
      java: { initialCode: '', correctCode: '', errorLines: '' }
    }
  });
  const [status, setStatus] = useState('');
  const [variantTab, setVariantTab] = useState('cpp'); // 'c' | 'cpp' | 'java'

  // User Form State
  const [userForm, setUserForm] = useState({ name: '', rollNo: '', language: 'cpp' });
  const [userStatus, setUserStatus] = useState('');

  // Event State
  const [eventStatus, setEventStatus] = useState('waiting');
  const [durationMinutes, setDurationMinutes] = useState(60);
  
  // Tracker State
  const [liveUsers, setLiveUsers] = useState([]);

  useEffect(() => {
    // Listen to Event State
    const eventDocRef = doc(db, 'settings', 'event');
    const unsubEvent = onSnapshot(eventDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventStatus(data.status);
        if (data.durationMinutes) setDurationMinutes(data.durationMinutes);
      } else {
        setDoc(eventDocRef, { status: 'waiting', endTime: null, durationMinutes: 60 });
      }
    });

    // Listen to Live Users for Tracker
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      // Sort by recently joined or rollNo
      users.sort((a, b) => (a.rollNo > b.rollNo ? 1 : -1));
      setLiveUsers(users);
    });

    return () => {
      unsubEvent();
      unsubUsers();
    };
  }, []);

  const handleQuestionChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVariantChange = (e, lang) => {
    setFormData({
      ...formData,
      variants: {
        ...formData.variants,
        [lang]: {
          ...formData.variants[lang],
          [e.target.name]: e.target.value
        }
      }
    });
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Saving...');
    try {
      // Process error lines for all variants
      const processedVariants = { ...formData.variants };
      for (const lang in processedVariants) {
        processedVariants[lang].errorLinesArray = processedVariants[lang].errorLines
          .split(',')
          .map(line => parseInt(line.trim()))
          .filter(n => !isNaN(n));
      }

      await addDoc(collection(db, 'questions'), {
        title: formData.title,
        description: formData.description,
        expectedOutput: formData.expectedOutput,
        points: parseInt(formData.points),
        variants: processedVariants,
        createdAt: serverTimestamp()
      });
      
      setStatus('Question added successfully!');
      setFormData({
        title: '', description: '', expectedOutput: '', points: 100,
        variants: {
          c: { initialCode: '', correctCode: '', errorLines: '' },
          cpp: { initialCode: '', correctCode: '', errorLines: '' },
          java: { initialCode: '', correctCode: '', errorLines: '' }
        }
      });
    } catch (error) {
      console.error("Error adding question: ", error);
      setStatus('Error adding question.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setUserStatus('Adding user...');
    try {
      await addDoc(collection(db, 'users'), {
        name: userForm.name,
        rollNo: userForm.rollNo,
        selectedLanguage: userForm.language,
        tabSwitches: 0,
        copyPasteCount: 0,
        score: 0,
        currentCode: '',
        isFinished: false,
        joinedAt: serverTimestamp()
      });
      setUserStatus('User added successfully!');
      setUserForm({ name: '', rollNo: '', language: 'cpp' });
    } catch (err) {
      console.error(err);
      setUserStatus('Failed to add user.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEvent = async () => {
    if (window.confirm(`Start event for ${durationMinutes} minutes? All users in waiting room will enter the IDE.`)) {
      setIsLoading(true);
      const endTime = new Date(new Date().getTime() + durationMinutes * 60000);
      await updateDoc(doc(db, 'settings', 'event'), {
        status: 'active',
        durationMinutes: parseInt(durationMinutes),
        endTime: endTime.toISOString()
      });
      setIsLoading(false);
    }
  };

  const handleStopEvent = async () => {
    if (window.confirm("Are you sure you want to STOP the event? All active users will be locked out and auto-submitted.")) {
      setIsLoading(true);
      await updateDoc(doc(db, 'settings', 'event'), {
        status: 'ended'
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={isLoading} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '95vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className="glow-text-cyan">ADMIN CONSOLE</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/leaderboard" className="btn-secondary" style={{ textDecoration: 'none' }}>LEADERBOARD</Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className={activeTab === 'questions' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('questions')}>QUESTIONS</button>
          <button className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('users')}>ADD USER</button>
          <button className={activeTab === 'event' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('event')}>EVENT CONTROLS</button>
          <button className={activeTab === 'tracker' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('tracker')}>LIVE TRACKER</button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'questions' && (
            <div className="glass-panel" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
              <h2 className="glow-text-magenta" style={{ marginBottom: '1.5rem' }}>ADD NEW QUESTION</h2>
              <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><label>TITLE</label><input type="text" name="title" className="input-field" value={formData.title} onChange={handleQuestionChange} required /></div>
                <div><label>DESCRIPTION</label><textarea name="description" className="input-field" value={formData.description} onChange={handleQuestionChange} rows="2" required /></div>
                
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {['c', 'cpp', 'java'].map(lang => (
                      <button 
                        key={lang}
                        type="button" 
                        onClick={() => setVariantTab(lang)}
                        style={{ 
                          padding: '5px 15px', 
                          background: variantTab === lang ? 'var(--accent-cyan)' : 'transparent',
                          color: variantTab === lang ? 'var(--bg-deep-navy)' : 'var(--text-primary)',
                          border: '1px solid var(--accent-cyan)',
                          cursor: 'pointer',
                          textTransform: 'uppercase'
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label>BUGGY CODE (INITIAL)</label>
                      <textarea name="initialCode" className="input-field" value={formData.variants[variantTab].initialCode} onChange={(e) => handleVariantChange(e, variantTab)} rows="6" required style={{ fontFamily: 'var(--font-mono)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>CORRECT CODE (For Line Logic)</label>
                      <textarea name="correctCode" className="input-field" value={formData.variants[variantTab].correctCode} onChange={(e) => handleVariantChange(e, variantTab)} rows="6" required style={{ fontFamily: 'var(--font-mono)' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label>ERROR LINES (Comma separated)</label>
                    <input type="text" name="errorLines" className="input-field" value={formData.variants[variantTab].errorLines} onChange={(e) => handleVariantChange(e, variantTab)} required placeholder="e.g. 2, 5, 8" />
                  </div>
                </div>

                <div><label>EXPECTED OUTPUT (Global)</label><textarea name="expectedOutput" className="input-field" value={formData.expectedOutput} onChange={handleQuestionChange} rows="2" required style={{ fontFamily: 'var(--font-mono)' }} /></div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}><label>POINTS</label><input type="number" name="points" className="input-field" value={formData.points} onChange={handleQuestionChange} required /></div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>ADD QUESTION</button>
                {status && <p style={{ color: 'var(--accent-cyan)', marginTop: '1rem' }}>{status}</p>}
              </form>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
              <h2 className="glow-text-magenta" style={{ marginBottom: '1.5rem' }}>MANUAL USER REGISTRATION</h2>
              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>PARTICIPANT NAME</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Enter Name" 
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>TEAM IDENTIFIER (LOT #)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="# 00" 
                    value={userForm.rollNo}
                    onChange={(e) => setUserForm({ ...userForm, rollNo: e.target.value })}
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>SYSTEM LANGUAGE</label>
                  <select 
                    className="input-field" 
                    value={userForm.language}
                    onChange={(e) => setUserForm({ ...userForm, language: e.target.value })}
                    required
                  >
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>ADD USER</button>
                {userStatus && <p style={{ color: 'var(--accent-cyan)', marginTop: '1rem' }}>{userStatus}</p>}
              </form>
            </div>
          )}

          {activeTab === 'event' && (
            <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
              <h2 className="glow-text-magenta" style={{ marginBottom: '1.5rem' }}>EVENT CONTROLS</h2>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>CURRENT STATUS: <span className={eventStatus === 'active' ? 'glow-text-cyan' : 'glow-text-magenta'} style={{ fontSize: '1.5rem', marginLeft: '1rem', textTransform: 'uppercase' }}>{eventStatus}</span></h3>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>DURATION (MINUTES)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={durationMinutes} 
                    onChange={(e) => setDurationMinutes(e.target.value)} 
                    disabled={eventStatus === 'active'}
                  />
                </div>
                <button onClick={handleStartEvent} disabled={eventStatus === 'active'} className="btn-primary">START EVENT</button>
                <button onClick={handleStopEvent} disabled={eventStatus !== 'active'} className="btn-secondary" style={{ background: 'var(--accent-magenta)', color: 'var(--text-primary)' }}>STOP EVENT</button>
              </div>
            </div>
          )}

          {activeTab === 'tracker' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {liveUsers.map(user => (
                  <div key={user.id} className="glass-panel" style={{ padding: '1rem', border: (user.tabSwitches > 2 || user.copyPasteCount > 2) ? '1px solid var(--accent-magenta)' : '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ color: 'var(--accent-cyan)' }}>{user.rollNo} - {user.name} ({user.selectedLanguage?.toUpperCase() || 'N/A'})</h4>
                      <span style={{ color: user.isFinished ? 'var(--accent-magenta)' : 'var(--text-secondary)' }}>{user.isFinished ? 'SUBMITTED' : 'CODING'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      <span>Tab Switches: <strong style={{ color: user.tabSwitches > 0 ? 'var(--accent-magenta)' : 'inherit' }}>{user.tabSwitches || 0}</strong></span>
                      <span>Copy/Paste: <strong style={{ color: user.copyPasteCount > 0 ? 'var(--accent-magenta)' : 'inherit' }}>{user.copyPasteCount || 0}</strong></span>
                    </div>

                    <div style={{ background: 'var(--bg-deep-navy)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', height: '120px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {user.currentCode ? user.currentCode : '// No code typed yet...'}
                      </pre>
                    </div>
                  </div>
                ))}
                
                {liveUsers.length === 0 && (
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No users registered yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;

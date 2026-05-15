import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { Trophy, Clock, FileText, Users, Activity, FileDown, Code, MonitorPlay, Sliders, Trash2, RefreshCw, Edit } from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('questions');
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  
  const showPopup = (message, type = 'info') => setPopup({ message, type });

  // Question Form State
  const [formData, setFormData] = useState({
    title: '', description: '', expectedOutput: '', points: 100, phase: 'easy',
    variants: {
      c: { initialCode: '', correctCode: '', errorLines: '' },
      cpp: { initialCode: '', correctCode: '', errorLines: '' },
      java: { initialCode: '', correctCode: '', errorLines: '' }
    }
  });
  const [status, setStatus] = useState('');
  const [variantTab, setVariantTab] = useState('cpp');
  const [questionsList, setQuestionsList] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // User Form State
  const [userForm, setUserForm] = useState({ name: '', rollNo: '' });
  const [userStatus, setUserStatus] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);

  // Event State
  const [eventStatus, setEventStatus] = useState('waiting');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Settings State
  const [langSettings, setLangSettings] = useState({ c: true, cpp: true, java: true });
  
  // Live Data
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

    // Listen to Language Settings
    const langDocRef = doc(db, 'settings', 'language');
    const unsubLang = onSnapshot(langDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setLangSettings(docSnap.data());
      } else {
        setDoc(langDocRef, { c: true, cpp: true, java: true });
      }
    });

    // Listen to Live Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      users.sort((a, b) => (a.rollNo > b.rollNo ? 1 : -1));
      setLiveUsers(users);
    });

    // Listen to Questions
    const unsubQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
      const qs = [];
      snapshot.forEach(doc => qs.push({ id: doc.id, ...doc.data() }));
      setQuestionsList(qs);
    });

    return () => {
      unsubEvent();
      unsubLang();
      unsubUsers();
      unsubQuestions();
    };
  }, []);

  const handleQuestionChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleVariantChange = (e, lang) => {
    setFormData({ ...formData, variants: { ...formData.variants, [lang]: { ...formData.variants[lang], [e.target.name]: e.target.value } } });
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Saving...');
    try {
      const processedVariants = { ...formData.variants };
      for (const lang in processedVariants) {
        processedVariants[lang].errorLinesArray = processedVariants[lang].errorLines
          .split(',').map(line => parseInt(line.trim())).filter(n => !isNaN(n));
      }
      
      if (editingQuestionId) {
        await updateDoc(doc(db, 'questions', editingQuestionId), {
          title: formData.title, description: formData.description, expectedOutput: formData.expectedOutput,
          points: parseInt(formData.points), phase: formData.phase, variants: processedVariants
        });
        showPopup('Question updated successfully!', 'success');
        setStatus('Question updated successfully!');
        setEditingQuestionId(null);
      } else {
        await addDoc(collection(db, 'questions'), {
          title: formData.title, description: formData.description, expectedOutput: formData.expectedOutput,
          points: parseInt(formData.points), phase: formData.phase, variants: processedVariants, createdAt: serverTimestamp()
        });
        showPopup('Question added successfully!', 'success');
        setStatus('Question added successfully!');
      }

      setFormData({
        title: '', description: '', expectedOutput: '', points: 100, phase: 'easy',
        variants: { c: { initialCode: '', correctCode: '', errorLines: '' }, cpp: { initialCode: '', correctCode: '', errorLines: '' }, java: { initialCode: '', correctCode: '', errorLines: '' } }
      });
    } catch (error) {
      console.error(error);
      showPopup(editingQuestionId ? 'Error updating question.' : 'Error adding question.', 'error');
      setStatus(editingQuestionId ? 'Error updating question.' : 'Error adding question.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditQuestion = (q) => {
    setFormData({
      title: q.title || '',
      description: q.description || '',
      expectedOutput: q.expectedOutput || '',
      points: q.points || 100,
      phase: q.phase || 'easy',
      variants: {
        c: { initialCode: q.variants?.c?.initialCode || '', correctCode: q.variants?.c?.correctCode || '', errorLines: q.variants?.c?.errorLines || '' },
        cpp: { initialCode: q.variants?.cpp?.initialCode || '', correctCode: q.variants?.cpp?.correctCode || '', errorLines: q.variants?.cpp?.errorLines || '' },
        java: { initialCode: q.variants?.java?.initialCode || '', correctCode: q.variants?.java?.correctCode || '', errorLines: q.variants?.java?.errorLines || '' }
      }
    });
    setEditingQuestionId(q.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setUserStatus('Saving user...');
    try {
      if (editingUserId) {
        await updateDoc(doc(db, 'users', editingUserId), {
          name: userForm.name, rollNo: userForm.rollNo
        });
        showPopup('User updated successfully!', 'success');
        setUserStatus('User updated successfully!');
        setEditingUserId(null);
      } else {
        await addDoc(collection(db, 'users'), {
          name: userForm.name, rollNo: userForm.rollNo, selectedLanguage: null,
          tabSwitches: 0, copyPasteCount: 0, score: 0, currentCode: '', isFinished: false, joinedAt: serverTimestamp()
        });
        showPopup('User added successfully!', 'success');
        setUserStatus('User added successfully!');
      }
      setUserForm({ name: '', rollNo: '' });
    } catch (err) {
      showPopup(editingUserId ? 'Failed to update user.' : 'Failed to add user.', 'error');
      setUserStatus(editingUserId ? 'Failed to update user.' : 'Failed to add user.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (u) => {
    setUserForm({ name: u.name || '', rollNo: u.rollNo || '' });
    setEditingUserId(u.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEvent = async () => {
    if (window.confirm(`Start event for ${durationMinutes} minutes? All users in waiting room will enter the IDE.`)) {
      setIsLoading(true);
      const now = new Date().getTime();
      const endTime = new Date(now + durationMinutes * 60000);
      await updateDoc(doc(db, 'settings', 'event'), { 
        status: 'active', 
        durationMinutes: parseInt(durationMinutes), 
        startTime: now,
        endTime: endTime.toISOString() 
      });
      setIsLoading(false);
    }
  };

  const handleStopEvent = async () => {
    if (window.confirm("Are you sure you want to STOP the event? All active users will be auto-submitted.")) {
      setIsLoading(true);
      await updateDoc(doc(db, 'settings', 'event'), { status: 'ended' });
      setIsLoading(false);
    }
  };

  const handleResetRound = async () => {
    if (window.confirm("WARNING: Are you sure you want to RESET THE ROUND? This clears all submissions and scores, but keeps users registered.")) {
      setIsLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const updatePromises = [];
        usersSnap.forEach(docSnap => {
          updatePromises.push(updateDoc(doc(db, 'users', docSnap.id), {
            isFinished: false,
            currentCode: '',
            finalCode: '',
            score: 0,
            tabSwitches: 0,
            copyPasteCount: 0,
            selectedQuestionId: null,
            clearedErrors: 0,
            remainingErrors: 0,
            totalErrors: 0,
            elapsedTimeMs: 0,
            completedQuestions: [],
            cumulativeClearedErrors: 0,
            cumulativeTotalErrors: 0
          }));
        });
        await Promise.all(updatePromises);
        await updateDoc(doc(db, 'settings', 'event'), { status: 'waiting', startTime: null, endTime: null });
        showPopup("Round has been reset successfully.", "success");
      } catch (err) {
        console.error(err);
        showPopup("Failed to reset round.", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLanguageToggle = async (lang) => {
    setIsLoading(true);
    const updated = { ...langSettings, [lang]: !langSettings[lang] };
    await setDoc(doc(db, 'settings', 'language'), updated, { merge: true });
    setIsLoading(false);
  };

  const handleResetData = async () => {
    if (window.confirm("WARNING: This will delete ALL users and their submissions. This action CANNOT be undone! Are you sure?")) {
      setIsLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const deletePromises = [];
        usersSnap.forEach(docSnap => deletePromises.push(deleteDoc(doc(db, 'users', docSnap.id))));
        await Promise.all(deletePromises);
        await setDoc(doc(db, 'settings', 'event'), { status: 'waiting', endTime: null, durationMinutes: 60 });
        showPopup("All user data has been wiped.", "warning");
      } catch (err) {
        console.error(err);
        showPopup("Failed to reset data.", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'questions':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>{editingQuestionId ? 'EDIT QUESTION' : 'ADD NEW QUESTION'}</h2>
            <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}><label>TITLE</label><input type="text" name="title" className="input-field" value={formData.title} onChange={handleQuestionChange} required /></div>
                <div style={{ flex: 1 }}>
                  <label>PHASE (DIFFICULTY)</label>
                  <select name="phase" className="input-field" value={formData.phase} onChange={handleQuestionChange} required>
                    <option value="easy">EASY</option>
                    <option value="medium">MEDIUM</option>
                    <option value="hard">HARD</option>
                  </select>
                </div>
              </div>
              <div><label>DESCRIPTION</label><textarea name="description" className="input-field" value={formData.description} onChange={handleQuestionChange} rows="2" required /></div>
              
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {['c', 'cpp', 'java'].map(lang => (
                    <button key={lang} type="button" onClick={() => setVariantTab(lang)}
                      style={{ padding: '5px 15px', background: variantTab === lang ? 'var(--accent-cyan)' : 'transparent', color: variantTab === lang ? 'var(--bg-deep-navy)' : 'var(--text-primary)', border: '1px solid var(--accent-cyan)', cursor: 'pointer', textTransform: 'uppercase' }}>
                      {lang}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}><label>BUGGY CODE (INITIAL)</label><textarea name="initialCode" className="input-field" value={formData.variants[variantTab].initialCode} onChange={(e) => handleVariantChange(e, variantTab)} rows="6" required style={{ fontFamily: 'var(--font-mono)' }} /></div>
                  <div style={{ flex: 1 }}><label>CORRECT CODE (For Logic)</label><textarea name="correctCode" className="input-field" value={formData.variants[variantTab].correctCode} onChange={(e) => handleVariantChange(e, variantTab)} rows="6" required style={{ fontFamily: 'var(--font-mono)' }} /></div>
                </div>
                <div style={{ marginTop: '1rem' }}><label>ERROR LINES (Comma separated)</label><input type="text" name="errorLines" className="input-field" value={formData.variants[variantTab].errorLines} onChange={(e) => handleVariantChange(e, variantTab)} required placeholder="e.g. 2, 5, 8" /></div>
              </div>

              <div><label>EXPECTED OUTPUT</label><textarea name="expectedOutput" className="input-field" value={formData.expectedOutput} onChange={handleQuestionChange} rows="2" required style={{ fontFamily: 'var(--font-mono)' }} /></div>
              <div><label>POINTS</label><input type="number" name="points" className="input-field" value={formData.points} onChange={handleQuestionChange} required /></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary">{editingQuestionId ? 'UPDATE QUESTION' : 'ADD QUESTION'}</button>
                {editingQuestionId && (
                  <button type="button" className="btn-secondary" onClick={() => {
                    setEditingQuestionId(null);
                    setFormData({ title: '', description: '', expectedOutput: '', points: 100, phase: 'easy', variants: { c: { initialCode: '', correctCode: '', errorLines: '' }, cpp: { initialCode: '', correctCode: '', errorLines: '' }, java: { initialCode: '', correctCode: '', errorLines: '' } } });
                  }}>CANCEL</button>
                )}
              </div>
              {status && <p style={{ color: 'var(--accent-cyan)', marginTop: '1rem' }}>{status}</p>}
            </form>

            <h2 className="glow-text-cyan" style={{ margin: '3rem 0 1.5rem 0' }}>EXISTING QUESTIONS</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {questionsList.map(q => (
                <div key={q.id} style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{q.title}</h4>
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-deep-navy)', border: '1px solid var(--accent-cyan)', textTransform: 'uppercase' }}>{q.phase}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEditQuestion(q)} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)' }}><Edit size={16} /></button>
                    <button onClick={async () => { if(window.confirm('Delete question?')) await deleteDoc(doc(db, 'questions', q.id)) }} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: 'var(--accent-magenta)', border: '1px solid var(--accent-magenta)' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {questionsList.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No questions added yet.</p>}
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>{editingUserId ? 'EDIT USER' : 'MANUAL USER REGISTRATION'}</h2>
              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div><label>PARTICIPANT NAME</label><input type="text" className="input-field" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required /></div>
                <div><label>TEAM IDENTIFIER (LOT #)</label><input type="text" className="input-field" value={userForm.rollNo} onChange={(e) => setUserForm({ ...userForm, rollNo: e.target.value })} required /></div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary">{editingUserId ? 'UPDATE USER' : 'ADD USER'}</button>
                  {editingUserId && (
                    <button type="button" className="btn-secondary" onClick={() => {
                      setEditingUserId(null);
                      setUserForm({ name: '', rollNo: '' });
                    }}>CANCEL</button>
                  )}
                </div>
                {userStatus && <p style={{ color: 'var(--accent-cyan)', marginTop: '1rem' }}>{userStatus}</p>}
              </form>

              <h2 className="glow-text-cyan" style={{ margin: '3rem 0 1.5rem 0' }}>REGISTERED USERS</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--accent-cyan)' }}>
                      <th style={{ padding: '1rem' }}>LOT #</th>
                      <th style={{ padding: '1rem' }}>NAME</th>
                      <th style={{ padding: '1rem' }}>LANGUAGE</th>
                      <th style={{ padding: '1rem' }}>PROGRESS</th>
                      <th style={{ padding: '1rem' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '1rem' }}>{u.rollNo}</td>
                        <td style={{ padding: '1rem' }}>{u.name}</td>
                        <td style={{ padding: '1rem', textTransform: 'uppercase' }}>{u.selectedLanguage || 'PENDING'}</td>
                        <td style={{ padding: '1rem' }}>
                            {(u.cumulativeClearedErrors || 0) + (u.clearedErrors || 0)} / {(u.cumulativeTotalErrors || 0) + (u.totalErrors || 0)}
                        </td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEditUser(u)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}><Edit size={18} /></button>
                          <button onClick={async () => { if(window.confirm('Delete user?')) await deleteDoc(doc(db, 'users', u.id)) }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        );

      case 'event':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>ROUND SETTING & EVENT CONTROLS</h2>
            <h3 style={{ marginBottom: '2rem' }}>STATUS: <span className={eventStatus === 'active' ? 'glow-text-cyan' : 'glow-text-magenta'}>{eventStatus.toUpperCase()}</span></h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
              <div><label>DURATION (MINUTES)</label><input type="number" className="input-field" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} disabled={eventStatus === 'active'} /></div>
              <button onClick={handleStartEvent} disabled={eventStatus === 'active'} className="btn-primary">START EVENT</button>
              <button onClick={handleStopEvent} disabled={eventStatus !== 'active'} className="btn-secondary" style={{ background: 'var(--accent-magenta)', color: 'var(--bg-deep-navy)' }}>STOP EVENT</button>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
              <button onClick={handleResetRound} className="sidebar-btn" style={{ color: 'var(--accent-pink)', border: '1px solid var(--accent-pink)', maxWidth: '250px', justifyContent: 'center' }}><RefreshCw size={18} style={{ marginRight: '8px' }}/> RESET ROUND</button>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Clears all submissions and scores, but keeps users registered for another round.</p>
            </div>
          </div>
        );

      case 'languages':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>LANGUAGE SETTINGS</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Toggle which programming languages are available for registration.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {['c', 'cpp', 'java'].map(lang => (
                <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => handleLanguageToggle(lang)} className={langSettings[lang] ? 'btn-primary' : 'btn-secondary'} style={{ width: '150px' }}>
                    {langSettings[lang] ? 'ENABLED' : 'DISABLED'}
                  </button>
                  <span style={{ textTransform: 'uppercase', fontSize: '1.2rem' }}>{lang === 'cpp' ? 'C++' : lang}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'submissions':
        return (
          <div>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>USER SUBMISSIONS</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {liveUsers.filter(u => u.isFinished).map(user => (
                <div key={user.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ color: 'var(--accent-cyan)' }}>{user.rollNo} - {user.name}</h3>
                    <span>Score: {user.score}</span>
                  </div>
                  <pre style={{ background: 'var(--bg-deep-navy)', padding: '1rem', color: 'var(--text-primary)', overflowX: 'auto' }}>
                    {user.finalCode || '// No code submitted'}
                  </pre>
                </div>
              ))}
              {liveUsers.filter(u => u.isFinished).length === 0 && <p>No submissions yet.</p>}
            </div>
          </div>
        );

      case 'results':
        const sortedUsers = [...liveUsers].sort((a, b) => b.score - a.score);
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h2 className="glow-text-cyan">RESULTS & PDF</h2>
              <button onClick={() => window.print()} className="btn-primary"><FileDown size={18} style={{ marginRight: '8px' }}/> DOWNLOAD PDF</button>
            </div>
            <div id="print-area">
              <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>FINAL LEADERBOARD</h1>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--accent-cyan)' }}>
                    <th style={{ padding: '1rem' }}>RANK</th>
                    <th style={{ padding: '1rem' }}>LOT / ROLL NO</th>
                    <th style={{ padding: '1rem' }}>NAME</th>
                    <th style={{ padding: '1rem' }}>SCORE</th>
                    <th style={{ padding: '1rem' }}>CHEATING FLAGS</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user, idx) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '1rem' }}>{idx + 1}</td>
                      <td style={{ padding: '1rem' }}>{user.rollNo}</td>
                      <td style={{ padding: '1rem' }}>{user.name}</td>
                      <td style={{ padding: '1rem', color: user.score < 0 ? 'var(--accent-magenta)' : 'var(--accent-cyan)' }}>{user.score}</td>
                      <td style={{ padding: '1rem' }}>Tabs: {user.tabSwitches} | Copy: {user.copyPasteCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'tracker':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>LIVE CODE TRACKER</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                    <span>Errors Fixed: <strong style={{ color: 'var(--accent-cyan)' }}>{(user.cumulativeClearedErrors || 0) + (user.clearedErrors || 0)} / {(user.cumulativeTotalErrors || 0) + (user.totalErrors || 0)}</strong></span>
                    <span>Line Count: <strong style={{ color: 'var(--accent-pink)' }}>{user.currentLinesCount || 0} / {user.targetLinesCount || 0}</strong></span>
                  </div>
                  <div style={{ background: 'var(--bg-deep-navy)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', height: '120px', overflowY: 'auto' }}>
                    <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{user.currentCode || '// No code typed yet...'}</pre>
                  </div>
                </div>
              ))}
              {liveUsers.length === 0 && <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No users registered yet.</div>}
            </div>
          </div>
        );
      
      default: return null;
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={isLoading} />
      {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} />}
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        
        {/* Sidebar Navigation */}
        <div className="no-print" style={{ width: '260px', background: 'var(--bg-panel)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ fontSize: '1.2rem', margin: 0 }}>ADMIN CONSOLE</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>SYSTEM V2.0</p>
          </div>
          
          <a href="/leaderboard" target="_blank" rel="noreferrer" className="sidebar-btn"><Trophy size={18} /> Leaderboard</a>
          <button onClick={() => setActiveTab('event')} className={`sidebar-btn ${activeTab === 'event' ? 'active' : ''}`}><Clock size={18} /> Round Setting</button>
          <button onClick={() => setActiveTab('questions')} className={`sidebar-btn ${activeTab === 'questions' ? 'active' : ''}`}><FileText size={18} /> Questions</button>
          <button onClick={() => setActiveTab('users')} className={`sidebar-btn ${activeTab === 'users' ? 'active' : ''}`}><Users size={18} /> User Management</button>
          <button onClick={() => setActiveTab('results')} className={`sidebar-btn ${activeTab === 'results' ? 'active' : ''}`}><FileDown size={18} /> Results & PDF</button>
          <button onClick={() => setActiveTab('submissions')} className={`sidebar-btn ${activeTab === 'submissions' ? 'active' : ''}`}><Code size={18} /> Submissions</button>
          <button onClick={() => setActiveTab('tracker')} className={`sidebar-btn ${activeTab === 'tracker' ? 'active' : ''}`}><MonitorPlay size={18} /> Live Code</button>
          <button onClick={() => setActiveTab('languages')} className={`sidebar-btn ${activeTab === 'languages' ? 'active' : ''}`}><Sliders size={18} /> Language Settings</button>
          
          <div style={{ marginTop: 'auto' }}>
            <button onClick={handleResetData} className="sidebar-btn" style={{ color: 'var(--accent-magenta)' }}><Trash2 size={18} /> Reset Data</button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;

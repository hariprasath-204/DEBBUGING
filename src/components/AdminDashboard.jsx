import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { syncClock, getNow } from '../utils/timeSync';
import { sortParticipants, getStudentCategory, getSortedParticipantsByCategory } from '../utils/ranking';
import { Trophy, Clock, FileText, Users, Activity, FileDown, Code, MonitorPlay, Sliders, Trash2, RefreshCw, Edit, Award, Sparkles, GraduationCap, PenTool, Upload, CheckCircle, Image, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';


const SignatureDrawingPad = ({ sigTitle, onClose, onSave }) => {
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(sigTitle, dataUrl);
  };

  return (
    <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div style={{ background: 'var(--bg-deep-navy)', border: '2px solid var(--accent-cyan)', borderRadius: 'var(--radius-sm)', padding: '1.5rem', width: '90%', maxWidth: '500px', boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="glow-text-cyan" style={{ margin: 0, fontSize: '1.1rem' }}>✍️ Draw Signature: {sigTitle}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
          Use mouse or finger to draw your digital signature inside the white box below:
        </p>
        <div style={{ background: 'white', borderRadius: '4px', border: '2px dashed #999', overflow: 'hidden', marginBottom: '1rem' }}>
          <canvas
            ref={canvasRef}
            width={450}
            height={180}
            style={{ display: 'block', width: '100%', height: '180px', cursor: 'crosshair', touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <button onClick={clearCanvas} className="btn-secondary" style={{ flex: 1, padding: '10px' }}>
            Clear Pad
          </button>
          <button onClick={handleSave} className="btn-primary" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> Save & Apply E-Sign
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('questions');
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  const [selectedConclusionUser, setSelectedConclusionUser] = useState(null);
  const [selectedTrackerUser, setSelectedTrackerUser] = useState(null);
  const [selectedSubUserId, setSelectedSubUserId] = useState(null);
  const [selectedSubPhase, setSelectedSubPhase] = useState('c');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('ALL');
  const [reportType, setReportType] = useState('scoresheet'); // 'scoresheet' or 'winners'
  const [reportEventName, setReportEventName] = useState('CODATHAN - DEBUGGING EVENT');
  const [judgeSignatures, setJudgeSignatures] = useState(['Staff Signature']);
  const [newSigTitle, setNewSigTitle] = useState('');
  const [esignMap, setEsignMap] = useState({}); // { [sigTitle]: 'data:image/png;base64,...' }
  const [drawingSigTitle, setDrawingSigTitle] = useState(null);

  const handleFileUpload = (sigTitle, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setEsignMap(prev => ({ ...prev, [sigTitle]: event.target.result }));
    };
    reader.readAsDataURL(file);
  };
  
  
  const showPopup = (message, type = 'info') => setPopup({ message, type });

  // Question Form State
  const [formData, setFormData] = useState({
    title: '', description: '', expectedOutput: '', points: 100, phase: 'c',
    variants: {
      c: { initialCode: '', correctCode: '', errorLines: '' },
      cpp: { initialCode: '', correctCode: '', errorLines: '' },
      python: { initialCode: '', correctCode: '', errorLines: '' },
      java: { initialCode: '', correctCode: '', errorLines: '' }
    }
  });
  const [status, setStatus] = useState('');
  const [variantTab, setVariantTab] = useState('c');
  const [questionsList, setQuestionsList] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // User Form State
  const [userForm, setUserForm] = useState({ name: '', rollNo: '' });
  const [userStatus, setUserStatus] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);

  // Event State
  const [eventStatus, setEventStatus] = useState('waiting');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [timeLeft, setTimeLeft] = useState('');
  const [eventEndTime, setEventEndTime] = useState(null);

  useEffect(() => {
    syncClock();
    if (eventStatus === 'active' && eventEndTime) {
      const end = new Date(eventEndTime).getTime();
      const updateAdminTimer = () => {
        const now = getNow();
        const distance = end - now;
        if (distance < 0) {
          setTimeLeft("00:00");
        } else {
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      };
      updateAdminTimer();
      const interval = setInterval(updateAdminTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft('');
    }
  }, [eventStatus, eventEndTime]);

  // Settings State
  const [langSettings, setLangSettings] = useState({ c: true, cpp: true, python: true, java: true });
  const [phaseLangs, setPhaseLangs] = useState({ easy: 'c', medium: 'cpp', hard: 'java', c: 'c', cpp: 'cpp', python: 'python', java: 'java', apiKey: '28152502bdcf827c763a92f0bf7ed806' });
  
  // JDoodle Java API Keys Management State
  const [jdoodleKeys, setJdoodleKeys] = useState([]);
  const [jdoodleStatusList, setJdoodleStatusList] = useState({ nonFinished: [], finished: [], all: [], totalCount: 0 });
  const [isCheckingJdoodle, setIsCheckingJdoodle] = useState(false);
  const [newJavaKey, setNewJavaKey] = useState({ clientId: '', clientSecret: '' });

  // Live Data
  const [liveUsers, setLiveUsers] = useState([]);

  useEffect(() => {
    // Listen to Event State
    const eventDocRef = doc(db, 'settings', 'event');
    const unsubEvent = onSnapshot(eventDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventStatus(data.status);
        if (data.durationMinutes !== undefined && data.durationMinutes !== null && !isNaN(parseFloat(data.durationMinutes)) && parseFloat(data.durationMinutes) > 0) {
          setDurationMinutes(data.durationMinutes);
        } else if (!durationMinutes || parseFloat(durationMinutes) <= 0) {
          setDurationMinutes(60);
        }
        setEventEndTime(data.endTime || null);
      } else {
        setDoc(eventDocRef, { status: 'waiting', endTime: null, durationMinutes: 60 });
      }
    });

    // Listen to Language Settings
    const langDocRef = doc(db, 'settings', 'language');
    const unsubLang = onSnapshot(langDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setLangSettings(d);
        setPhaseLangs({
          easy: d.easy || 'c',
          medium: d.medium || 'cpp',
          hard: d.hard || 'java',
          apiKey: d.apiKey || '28152502bdcf827c763a92f0bf7ed806'
        });
      } else {
        setDoc(langDocRef, { easy: 'c', medium: 'cpp', hard: 'java', apiKey: '28152502bdcf827c763a92f0bf7ed806', c: true, cpp: true, java: true });
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

    // Listen to JDoodle Java API Keys
    const jdoodleDocRef = doc(db, 'settings', 'jdoodle');
    const unsubJdoodle = onSnapshot(jdoodleDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const keys = Array.isArray(data.keys) ? data.keys : [];
        setJdoodleKeys(keys);
        fetchInstantJdoodleStatus(keys);
        fetchJdoodleStatus(keys);
      } else {
        setDoc(jdoodleDocRef, { keys: [] });
      }
    });

    return () => {
      unsubEvent();
      unsubLang();
      unsubUsers();
      unsubQuestions();
      unsubJdoodle();
    };
  }, []);

  const fetchInstantJdoodleStatus = async (keysToTest = jdoodleKeys) => {
    try {
      const res = await axios.post('/api/jdoodle/count', { keys: keysToTest });
      if (res.data) {
        setJdoodleStatusList(prev => ({
          ...prev,
          totalCount: res.data.totalCount || (res.data.all ? res.data.all.length : 0),
          all: res.data.all || prev.all || [],
          nonFinished: res.data.nonFinished || prev.nonFinished || [],
          finished: res.data.finished || prev.finished || []
        }));
      }
    } catch (err) {
      console.error('Failed to fetch instant JDoodle status:', err);
    }
  };

  const fetchJdoodleStatus = async (keysToTest = jdoodleKeys) => {
    setIsCheckingJdoodle(true);
    await fetchInstantJdoodleStatus(keysToTest);
    try {
      const res = await axios.post('/api/jdoodle/status', { keys: keysToTest });
      if (res.data) {
        setJdoodleStatusList({
          nonFinished: res.data.nonFinished || [],
          finished: res.data.finished || [],
          all: res.data.all || [],
          totalCount: res.data.totalCount || (res.data.all ? res.data.all.length : 0)
        });
      }
    } catch (err) {
      console.error('Failed to fetch JDoodle status:', err);
    } finally {
      setIsCheckingJdoodle(false);
    }
  };

  const handleAddJavaKey = async (e) => {
    e.preventDefault();
    if (!newJavaKey.clientId.trim() || !newJavaKey.clientSecret.trim()) return;
    setIsLoading(true);
    try {
      const updatedKeys = [...jdoodleKeys, { clientId: newJavaKey.clientId.trim(), clientSecret: newJavaKey.clientSecret.trim() }];
      await setDoc(doc(db, 'settings', 'jdoodle'), { keys: updatedKeys }, { merge: true });
      await axios.post('/api/jdoodle/add', { clientId: newJavaKey.clientId.trim(), clientSecret: newJavaKey.clientSecret.trim() });
      setNewJavaKey({ clientId: '', clientSecret: '' });
      showPopup('New Java API key added successfully!', 'success');
      await fetchInstantJdoodleStatus(updatedKeys);
      fetchJdoodleStatus(updatedKeys);
    } catch (err) {
      showPopup('Failed to add Java API key', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJavaKey = async (clientIdToRemove) => {
    if (window.confirm('Remove this custom Java API key from settings?')) {
      setIsLoading(true);
      const updatedKeys = jdoodleKeys.filter(k => k.clientId !== clientIdToRemove);
      await setDoc(doc(db, 'settings', 'jdoodle'), { keys: updatedKeys }, { merge: true });
      showPopup('Java API key removed', 'success');
      await fetchInstantJdoodleStatus(updatedKeys);
      fetchJdoodleStatus(updatedKeys);
      setIsLoading(false);
    }
  };

  const handleQuestionChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'phase') {
      const phaseLangMap = { easy: 'c', medium: 'cpp', hard: 'java', c: 'c', cpp: 'cpp', python: 'python', java: 'java' };
      if (phaseLangMap[e.target.value]) {
        setVariantTab(phaseLangMap[e.target.value]);
      }
    }
  };

  const handleVariantChange = (e, lang) => {
    setFormData({ ...formData, variants: { ...formData.variants, [lang]: { ...formData.variants[lang], [e.target.name]: e.target.value } } });
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Saving...');
    try {
      const phaseLangMap = { easy: 'c', medium: 'cpp', hard: 'java', c: 'c', cpp: 'cpp', python: 'python', java: 'java' };
      const targetLang = phaseLangMap[formData.phase] || 'c';
      const fallbackVariant = formData.variants[targetLang]?.initialCode ? formData.variants[targetLang] :
                              (formData.variants.c?.initialCode ? formData.variants.c :
                              (formData.variants.cpp?.initialCode ? formData.variants.cpp :
                              (formData.variants.python?.initialCode ? formData.variants.python : formData.variants.java)));

      const processedVariants = { ...formData.variants };
      for (const lang in processedVariants) {
        if (!processedVariants[lang].initialCode && fallbackVariant) {
          processedVariants[lang] = { ...fallbackVariant };
        }
        processedVariants[lang].errorLinesArray = (processedVariants[lang].errorLines || '')
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
        title: '', description: '', expectedOutput: '', points: 100, phase: 'c',
        variants: { c: { initialCode: '', correctCode: '', errorLines: '' }, cpp: { initialCode: '', correctCode: '', errorLines: '' }, python: { initialCode: '', correctCode: '', errorLines: '' }, java: { initialCode: '', correctCode: '', errorLines: '' } }
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
    const pMap = { easy: 'c', medium: 'cpp', hard: 'java', c: 'c', cpp: 'cpp', python: 'python', java: 'java' };
    const p = pMap[q.phase] || q.phase || 'c';
    setFormData({
      title: q.title || '',
      description: q.description || '',
      expectedOutput: q.expectedOutput || '',
      points: q.points || 100,
      phase: p,
      variants: {
        c: { initialCode: q.variants?.c?.initialCode || '', correctCode: q.variants?.c?.correctCode || '', errorLines: q.variants?.c?.errorLines || '' },
        cpp: { initialCode: q.variants?.cpp?.initialCode || '', correctCode: q.variants?.cpp?.correctCode || '', errorLines: q.variants?.cpp?.errorLines || '' },
        python: { initialCode: q.variants?.python?.initialCode || '', correctCode: q.variants?.python?.correctCode || '', errorLines: q.variants?.python?.errorLines || '' },
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
    const mins = parseFloat(durationMinutes);
    if (!mins || isNaN(mins) || mins <= 0) {
      showPopup("Please enter a valid duration in minutes greater than 0.", "error");
      return;
    }
    if (window.confirm(`Start event for ${mins} minutes? All users in waiting room will enter the IDE.`)) {
      setIsLoading(true);
      await syncClock();
      const now = getNow();
      const endTime = new Date(now + mins * 60000);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const updatePromises = [];
        usersSnap.forEach(docSnap => {
          updatePromises.push(updateDoc(doc(db, 'users', docSnap.id), {
            isFinished: false,
            selectedQuestionId: null
          }));
        });
        await Promise.all(updatePromises);
      } catch (err) {
        console.warn('Error resetting users for start event:', err);
      }
      await updateDoc(doc(db, 'settings', 'event'), { 
        status: 'active', 
        durationMinutes: mins, 
        startTime: now,
        endTime: endTime.toISOString(),
        roundId: now
      });
      setIsLoading(false);
    }
  };

  const handleUpdateTimer = async () => {
    const mins = parseFloat(durationMinutes);
    if (!mins || isNaN(mins) || mins <= 0) {
      showPopup("Please enter a valid duration in minutes greater than 0.", "error");
      return;
    }
    if (window.confirm(`Update remaining timer to ${mins} minutes for all active users?`)) {
      setIsLoading(true);
      await syncClock();
      const now = getNow();
      const endTime = new Date(now + mins * 60000);
      await updateDoc(doc(db, 'settings', 'event'), {
        durationMinutes: mins,
        endTime: endTime.toISOString()
      });
      setIsLoading(false);
      showPopup(`Timer updated to ${mins} minutes remaining!`, "success");
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
    if (window.confirm("WARNING: Are you sure you want to RESET THE ROUND TIMER? This resets event status to WAITING and clears active editor sessions, while PRESERVING all participant scores, time taken, warnings, and submissions.")) {
      setIsLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const updatePromises = [];
        usersSnap.forEach(docSnap => {
          updatePromises.push(updateDoc(doc(db, 'users', docSnap.id), {
            isFinished: false,
            currentCode: '',
            selectedQuestionId: null
          }));
        });
        await Promise.all(updatePromises);
        await updateDoc(doc(db, 'settings', 'event'), { status: 'waiting', startTime: null, endTime: null });
        showPopup("Round status reset to WAITING (Participant scores, warnings, time & submissions preserved).", "success");
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

  const handleSavePhaseLanguages = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await setDoc(doc(db, 'settings', 'language'), {
      ...langSettings,
      easy: phaseLangs.easy,
      medium: phaseLangs.medium,
      hard: phaseLangs.hard,
      apiKey: phaseLangs.apiKey
    }, { merge: true });
    setIsLoading(false);
    showPopup('Round languages & API Key saved successfully!', 'success');
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
                  <label>MISSION STAGE (LANGUAGE)</label>
                  <select name="phase" className="input-field" value={formData.phase} onChange={handleQuestionChange} required>
                    <option value="c">1. C LANGUAGE</option>
                    <option value="cpp">2. C++ LANGUAGE</option>
                    <option value="python">3. PYTHON LANGUAGE</option>
                    <option value="java">4. JAVA LANGUAGE</option>
                  </select>
                </div>
              </div>
              <div><label>DESCRIPTION</label><textarea name="description" className="input-field" value={formData.description} onChange={handleQuestionChange} rows="2" required /></div>
              
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {['c', 'cpp', 'python', 'java'].map(lang => (
                    <button key={lang} type="button" onClick={() => setVariantTab(lang)}
                      style={{ padding: '5px 15px', background: variantTab === lang ? 'var(--accent-cyan)' : 'transparent', color: variantTab === lang ? 'var(--bg-deep-navy)' : 'var(--text-primary)', border: '1px solid var(--accent-cyan)', cursor: 'pointer', textTransform: 'uppercase' }}>
                      {lang === 'cpp' ? 'C++' : lang}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}><label>BUGGY CODE (INITIAL)</label><textarea name="initialCode" className="input-field" value={formData.variants[variantTab].initialCode} onChange={(e) => handleVariantChange(e, variantTab)} rows="6" required wrap="off" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'pre', overflow: 'scroll', overflowX: 'scroll', overflowY: 'scroll' }} /></div>
                  <div style={{ flex: 1 }}><label>CORRECT CODE (For Logic)</label><textarea name="correctCode" className="input-field" value={formData.variants[variantTab].correctCode} onChange={(e) => handleVariantChange(e, variantTab)} rows="6" required wrap="off" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'pre', overflow: 'scroll', overflowX: 'scroll', overflowY: 'scroll' }} /></div>
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
                    setFormData({ title: '', description: '', expectedOutput: '', points: 100, phase: 'c', variants: { c: { initialCode: '', correctCode: '', errorLines: '' }, cpp: { initialCode: '', correctCode: '', errorLines: '' }, python: { initialCode: '', correctCode: '', errorLines: '' }, java: { initialCode: '', correctCode: '', errorLines: '' } } });
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
                    {liveUsers.map(u => {
                      const cat = getStudentCategory(u.rollNo);
                      return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{u.rollNo}</span>
                          {cat === 'UG' && <span style={{ padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid #00f0ff' }}>UG</span>}
                          {cat === 'PG' && <span style={{ padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', background: 'rgba(255, 0, 255, 0.15)', color: '#ff00ff', border: '1px solid #ff00ff' }}>PG</span>}
                        </td>
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
                    );
                  })}
                  </tbody>
                </table>
              </div>
          </div>
        );

      case 'event':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>ROUND SETTING & EVENT CONTROLS</h2>
            <h3 style={{ marginBottom: '2rem' }}>
              STATUS: <span className={eventStatus === 'active' ? 'glow-text-cyan' : 'glow-text-magenta'}>{eventStatus.toUpperCase()}</span>
              {timeLeft && <span style={{ marginLeft: '2rem', color: 'var(--accent-pink)' }}>TIME REMAINING: {timeLeft}</span>}
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div><label>DURATION (MINUTES)</label><input type="number" className="input-field" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} /></div>
              <button onClick={handleStartEvent} disabled={eventStatus === 'active'} className="btn-primary">START EVENT</button>
              {eventStatus === 'active' && (
                <button onClick={handleUpdateTimer} className="btn-primary" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-deep-navy)' }}>UPDATE TIMER</button>
              )}
              <button onClick={handleStopEvent} disabled={eventStatus !== 'active'} className="btn-secondary" style={{ background: 'var(--accent-magenta)', color: 'var(--bg-deep-navy)' }}>STOP EVENT</button>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
              <button onClick={handleResetRound} className="sidebar-btn" style={{ color: 'var(--accent-pink)', border: '1px solid var(--accent-pink)', maxWidth: '250px', justifyContent: 'center' }}><RefreshCw size={18} style={{ marginRight: '8px' }}/> RESET ROUND</button>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Resets round status to WAITING and clears active editor sessions while PRESERVING all participant scores, warnings, time taken, and submissions.</p>
            </div>
          </div>
        );

      case 'languages':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>SEQUENTIAL LANGUAGE & API CONFIGURATION</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>The progression order is fixed: 1. C ➔ 2. C++ ➔ 3. Python ➔ 4. Java. You can configure the API Key below.</p>
            
            <form onSubmit={handleSavePhaseLanguages} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', marginBottom: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <label style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>STAGE 1 LANGUAGE</label>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>C Language (Fixed)</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <label style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>STAGE 2 LANGUAGE</label>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>C++ Language (Fixed)</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <label style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>STAGE 3 LANGUAGE</label>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Python Language (Fixed)</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <label style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>STAGE 4 LANGUAGE</label>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Java Language (Fixed)</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <label style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>ONLINE COMPILER API KEY</label>
                <input type="text" className="input-field" value={phaseLangs.apiKey} onChange={e => setPhaseLangs({ ...phaseLangs, apiKey: e.target.value })} placeholder="28152502bdcf827c763a92f0bf7ed806" />
              </div>

              <div>
                <button type="submit" className="btn-primary">SAVE API CONFIGURATION</button>
              </div>
            </form>

            <h3 className="glow-text-cyan" style={{ marginBottom: '1rem' }}>STAGE COMPILER AVAILABILITY</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {['c', 'cpp', 'python', 'java'].map(lang => (
                <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => handleLanguageToggle(lang)} className={langSettings[lang] ? 'btn-primary' : 'btn-secondary'} style={{ width: '150px' }}>
                    {langSettings[lang] ? 'ENABLED' : 'DISABLED'}
                  </button>
                  <span style={{ textTransform: 'uppercase', fontSize: '1.2rem' }}>{lang === 'cpp' ? 'C++' : lang}</span>
                </div>
              ))}
            </div>

            <h3 className="glow-text-cyan" style={{ marginTop: '3rem', marginBottom: '1rem' }}>JAVA (JDOODLE) API KEY MANAGEMENT & LIVE STATUS</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Java compilation uses the JDoodle execution engine with automatic key rotation and failover across the entire pool.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-deep-navy)', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid var(--accent-cyan)', marginBottom: '1.5rem', boxShadow: '0 0 15px rgba(0, 240, 255, 0.1)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Failover Pool</span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  {jdoodleStatusList.totalCount || jdoodleStatusList.all?.length || 0} Keys
                </span>
              </div>
              <div style={{ height: '30px', width: '1px', background: 'var(--border-subtle)' }}></div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Available</span>
                <span style={{ color: '#00f59b', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  {jdoodleStatusList.nonFinished.length} Keys
                </span>
              </div>
              <div style={{ height: '30px', width: '1px', background: 'var(--border-subtle)' }}></div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Exhausted Today</span>
                <span style={{ color: 'var(--accent-magenta)', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  {jdoodleStatusList.finished.length} Keys
                </span>
              </div>
            </div>

            <form onSubmit={handleAddJavaKey} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--bg-deep-navy)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
              <div style={{ flex: '1 1 220px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>NEW JDOODLE CLIENT ID</label>
                <input type="text" className="input-field" value={newJavaKey.clientId} onChange={e => setNewJavaKey({ ...newJavaKey, clientId: e.target.value })} placeholder="e.g. 4a9a6038b2a7e..." required />
              </div>
              <div style={{ flex: '1 1 220px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>NEW JDOODLE CLIENT SECRET</label>
                <input type="text" className="input-field" value={newJavaKey.clientSecret} onChange={e => setNewJavaKey({ ...newJavaKey, clientSecret: e.target.value })} placeholder="e.g. af69762f1a318..." required />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>ADD JAVA API KEY</button>
              <button type="button" onClick={() => fetchJdoodleStatus()} disabled={isCheckingJdoodle} className="btn-secondary" style={{ padding: '0.7rem 1.5rem', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
                {isCheckingJdoodle ? 'CHECKING CREDITS...' : 'REFRESH STATUS'}
              </button>
            </form>

            <div style={{ background: 'var(--bg-deep-navy)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--accent-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></span>
                  COMPLETE API KEY POOL ({jdoodleStatusList.totalCount || jdoodleStatusList.all?.length || 0} REGISTERED KEYS)
                </h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>All built-in + custom keys available in failover chain</span>
              </div>
              {(!jdoodleStatusList.all || jdoodleStatusList.all.length === 0) ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>Loading registered keys from failover pool...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.8rem', maxHeight: '380px', overflowY: 'auto' }}>
                  {jdoodleStatusList.all.map((item, idx) => (
                    <div key={idx} style={{ background: '#0a0e1a', padding: '0.8rem 1rem', borderRadius: '6px', border: item.status === 'finished' ? '1px solid rgba(255, 0, 85, 0.3)' : '1px solid rgba(0, 245, 155, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          <strong>#{idx + 1}</strong> ID: {item.clientId ? `${item.clientId.slice(0, 8)}...${item.clientId.slice(-4)}` : 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: item.status === 'finished' ? 'var(--accent-magenta)' : '#00f59b', marginTop: '4px' }}>
                          {item.status === 'finished' ? (item.errorReason || 'EXHAUSTED / LIMIT REACHED') : `ACTIVE | Credits Used Today: ${item.used || 0}/22`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: item.status === 'finished' ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 245, 155, 0.15)', color: item.status === 'finished' ? 'var(--accent-magenta)' : '#00f59b' }}>
                          {item.status === 'finished' ? 'FINISHED' : 'ACTIVE'}
                        </span>
                        {jdoodleKeys.some(k => k.clientId === item.clientId) && (
                          <button onClick={() => handleDeleteJavaKey(item.clientId)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }} title="Remove custom key"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              {/* Non-Finished APIs */}
              <div style={{ background: 'rgba(0, 245, 155, 0.04)', border: '1px solid rgba(0, 245, 155, 0.3)', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 245, 155, 0.2)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                  <h4 style={{ color: '#00f59b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#00f59b' }}></span>
                    NON-FINISHED JAVA APIs (ACTIVE & AVAILABLE)
                  </h4>
                  <span style={{ fontWeight: 'bold', background: 'rgba(0, 245, 155, 0.15)', color: '#00f59b', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                    {jdoodleStatusList.nonFinished.length} Keys Active
                  </span>
                </div>
                {jdoodleStatusList.nonFinished.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No active Java API keys verified right now. Click Refresh Status.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {jdoodleStatusList.nonFinished.map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-deep-navy)', padding: '0.8rem 1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>ID: {item.clientId.slice(0, 10)}...{item.clientId.slice(-4)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#00f59b', marginTop: '4px' }}>Credits Used Today: <strong>{item.used} / 22</strong></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(0, 245, 155, 0.1)', color: '#00f59b', border: '1px solid rgba(0, 245, 155, 0.3)' }}>NON-FINISHED</span>
                          {jdoodleKeys.some(k => k.clientId === item.clientId) && (
                            <button onClick={() => handleDeleteJavaKey(item.clientId)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }} title="Remove custom key"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Finished APIs */}
              <div style={{ background: 'rgba(255, 0, 85, 0.04)', border: '1px solid rgba(255, 0, 85, 0.3)', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 0, 85, 0.2)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                  <h4 style={{ color: 'var(--accent-magenta)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-magenta)' }}></span>
                    FINISHED JAVA APIs (EXHAUSTED / LIMIT EXCEEDED)
                  </h4>
                  <span style={{ fontWeight: 'bold', background: 'rgba(255, 0, 85, 0.15)', color: 'var(--accent-magenta)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                    {jdoodleStatusList.finished.length} Keys Exhausted
                  </span>
                </div>
                {jdoodleStatusList.finished.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>All Java API keys have available quota right now (0 finished).</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {jdoodleStatusList.finished.map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-deep-navy)', padding: '0.8rem 1rem', borderRadius: '6px', border: '1px solid rgba(255, 0, 85, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>ID: {item.clientId.slice(0, 10)}...{item.clientId.slice(-4)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-magenta)', marginTop: '4px' }}>Status: <strong>{item.errorReason || 'Quota limit reached (Finished)'}</strong></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255, 0, 85, 0.1)', color: 'var(--accent-magenta)', border: '1px solid rgba(255, 0, 85, 0.3)' }}>FINISHED</span>
                          {jdoodleKeys.some(k => k.clientId === item.clientId) && (
                            <button onClick={() => handleDeleteJavaKey(item.clientId)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }} title="Remove custom key"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'submissions':
        const submittedUsers = liveUsers.filter(u => 
          Object.keys(u.submissions || {}).length > 0 || u.isFinished || (u.completedQuestions || []).length > 0 || (u.totalSubmissionsCount || 0) > 0
        );
        const totalSubs = submittedUsers.reduce((acc, u) => acc + (u.totalSubmissionsCount || Object.keys(u.submissions || {}).length || 0), 0);
        const langTotals = submittedUsers.reduce((acc, u) => {
          const lCount = u.langSubmissionsCount || {};
          Object.entries(u.submissions || {}).forEach(([_, sub]) => {
            const p = sub.phase || 'c';
            if (!lCount[p]) acc[p] = (acc[p] || 0) + 1;
          });
          Object.entries(lCount).forEach(([p, cnt]) => {
            acc[p] = (acc[p] || 0) + cnt;
          });
          return acc;
        }, { c: 0, cpp: 0, python: 0, java: 0 });

        const selectedUser = liveUsers.find(u => u.id === selectedSubUserId);
        const activeSubData = selectedUser ? (
          Object.values(selectedUser.submissions || {}).find(s => s.phase === selectedSubPhase) ||
          Object.entries(selectedUser.submissions || {}).find(([k, v]) => k.includes(selectedSubPhase) || v.phase === selectedSubPhase)?.[1]
        ) : null;

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="glow-text-cyan" style={{ margin: 0 }}>USER SUBMISSIONS & CODE REVIEW</h2>
              <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-deep-navy)', padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Total Submissions: {totalSubs}</span>
                <span style={{ color: 'var(--text-secondary)' }}>|</span>
                <span>C: <strong>{langTotals.c || 0}</strong></span>
                <span>C++: <strong>{langTotals.cpp || 0}</strong></span>
                <span>Python: <strong>{langTotals.python || 0}</strong></span>
                <span>Java: <strong>{langTotals.java || 0}</strong></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left Panel: Participant List */}
              <div className="glass-panel" style={{ padding: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  Participants ({submittedUsers.length})
                </h3>
                {submittedUsers.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No submissions recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {submittedUsers.map(user => {
                      const isSel = user.id === selectedSubUserId;
                      const uSubsCount = user.totalSubmissionsCount || Object.keys(user.submissions || {}).length || 0;
                      return (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedSubUserId(user.id);
                            const firstPhase = Object.values(user.submissions || {})[0]?.phase || 'c';
                            setSelectedSubPhase(firstPhase);
                          }}
                          style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            background: isSel ? 'rgba(0, 240, 255, 0.12)' : 'var(--bg-deep-navy)',
                            border: isSel ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <strong style={{ color: isSel ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                              {user.rollNo} - {user.name}
                            </strong>
                            <span style={{ fontWeight: 'bold', color: user.score < 0 ? 'var(--accent-magenta)' : '#00f59b' }}>
                              {user.score} pts
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <span>Time: {user.elapsedTimeMs ? `${Math.floor(user.elapsedTimeMs / 60000)}m ${Math.floor((user.elapsedTimeMs % 60000) / 1000)}s` : 'N/A'}</span>
                            <span>Submissions: <strong>{uSubsCount}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Panel: Selected Participant Code & Metrics */}
              <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '60vh' }}>
                {!selectedUser ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '1.1rem' }}>Select a participant from the left list to view their submitted code, timing, and evaluation metrics.</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
                      <div>
                        <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.4rem', margin: 0 }}>
                          {selectedUser.name} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>(Roll: {selectedUser.rollNo})</span>
                        </h3>
                        <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Total Score: <strong style={{ color: '#00f59b' }}>{selectedUser.score} pts</strong> | Total Active Time: <strong>{selectedUser.elapsedTimeMs ? `${Math.floor(selectedUser.elapsedTimeMs / 60000)}m ${Math.floor((selectedUser.elapsedTimeMs % 60000) / 1000)}s` : 'N/A'}</strong> | Tab Switches: <strong style={{ color: selectedUser.tabSwitches > 0 ? 'var(--accent-pink)' : 'inherit' }}>{selectedUser.tabSwitches || 0} (-{(selectedUser.tabSwitches || 0) * 2} pts)</strong>
                        </div>
                      </div>
                    </div>

                    {/* Language / Stage Tabs */}
                    <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem' }}>
                      {['c', 'cpp', 'python', 'java'].map(lang => {
                        const isTabSel = selectedSubPhase === lang;
                        const hasSubmitted = Object.values(selectedUser.submissions || {}).some(s => s.phase === lang);
                        return (
                          <button
                            key={lang}
                            onClick={() => setSelectedSubPhase(lang)}
                            className={isTabSel ? 'btn-primary' : 'btn-secondary'}
                            style={{
                              padding: '0.5rem 1.2rem',
                              fontSize: '0.85rem',
                              position: 'relative',
                              opacity: !hasSubmitted && !isTabSel ? 0.6 : 1
                            }}
                          >
                            {lang === 'cpp' ? 'C++' : lang.toUpperCase()}
                            {hasSubmitted && <span style={{ marginLeft: '6px', color: '#00f59b' }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Phase Details */}
                    {!activeSubData ? (
                      <div style={{ background: 'var(--bg-deep-navy)', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p>No submission recorded for <strong>{selectedSubPhase.toUpperCase()}</strong> stage yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Timing & Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Start Time</span>
                            <strong>{activeSubData.startTimeStr || (activeSubData.startTime ? new Date(activeSubData.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A')}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>End Time</span>
                            <strong>{activeSubData.endTimeStr || (activeSubData.endTime ? new Date(activeSubData.endTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A')}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Taken Time</span>
                            <strong style={{ color: 'var(--accent-cyan)' }}>
                              {activeSubData.takenTimeMs ? `${Math.floor(activeSubData.takenTimeMs / 60000)}m ${Math.floor((activeSubData.takenTimeMs % 60000) / 1000)}s` : 'N/A'}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Score Awarded</span>
                            <strong style={{ color: '#00f59b' }}>+{activeSubData.score || 0} pts</strong>
                          </div>
                        </div>

                        {/* Code Header & Box */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span>Submitted Code ({activeSubData.title || selectedSubPhase.toUpperCase()})</span>
                            <span>Lines: {activeSubData.codeLines || 0} (Target: {activeSubData.targetLines || 0}) | Errors Fixed: {activeSubData.clearedErrors || 0}/{activeSubData.totalErrors || 0}</span>
                          </div>
                          <pre style={{
                            background: '#0a0e1a',
                            padding: '1.2rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            color: '#e2e8f0',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            overflowX: 'auto',
                            maxHeight: '50vh',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {activeSubData.submittedCode || activeSubData.code || '// No code content found'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'results':
      case 'esign':
        const filteredUsers = getSortedParticipantsByCategory(liveUsers, adminCategoryFilter);
        const displayUsers = reportType === 'winners' ? filteredUsers.slice(0, 3) : filteredUsers;
        const ugCount = getSortedParticipantsByCategory(liveUsers, 'UG').length;
        const pgCount = getSortedParticipantsByCategory(liveUsers, 'PG').length;
        const allCount = getSortedParticipantsByCategory(liveUsers, 'ALL').length;

        const handleAddJudgeSig = () => {
          if (newSigTitle.trim()) {
            setJudgeSignatures([...judgeSignatures, newSigTitle.trim()]);
            setNewSigTitle('');
          }
        };

        const handleRemoveJudgeSig = (idxToRemove) => {
          setJudgeSignatures(judgeSignatures.filter((_, idx) => idx !== idxToRemove));
        };

        const handleDownloadPdf = () => {
          const element = document.getElementById('print-area');
          if (!element) return;
          const cleanEventName = (reportEventName || 'CODATHAN').replace(/[^a-zA-Z0-9]/g, '_');
          const cleanReportType = reportType === 'scoresheet' ? 'ScoreSheet' : 'Winners';
          const filename = `${cleanEventName}_${cleanReportType}_${adminCategoryFilter}.pdf`;
          
          const opt = {
            margin:       [12, 10, 12, 10],
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['css'], before: '.html2pdf__page-break' }
          };
          
          html2pdf().set(opt).from(element).save();
        };

        const renderSharedPrintableSection = () => {
          const PAGE_1_ROWS = 18;
          const PAGE_N_ROWS = 24;
          const tableChunks = [];
          
          if (displayUsers.length === 0) {
            tableChunks.push({ rows: [], startIndex: 0, pageNum: 1, isFirstPage: true });
          } else {
            let idx = 0;
            let pageNum = 1;
            while (idx < displayUsers.length) {
              const limit = pageNum === 1 ? PAGE_1_ROWS : PAGE_N_ROWS;
              const chunkRows = displayUsers.slice(idx, idx + limit);
              tableChunks.push({ rows: chunkRows, startIndex: idx, pageNum, isFirstPage: pageNum === 1 });
              idx += limit;
              pageNum++;
            }
          }

          const lastChunk = tableChunks[tableChunks.length - 1];
          const putSignaturesOnNewPage = false;

          const renderTableHeader = () => (
            <thead style={{ display: 'table-header-group' }}>
              <tr style={{ borderBottom: '2px solid black', background: '#f8fafc', color: 'black', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <th style={{ width: '10%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Rank</th>
                <th style={{ width: '32%', padding: '8px 8px', color: 'black', border: '1.5px solid black', textAlign: 'left', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Participant Name</th>
                <th style={{ width: '21%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Roll No / Lot</th>
                <th style={{ width: '13%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Errors Fixed</th>
                <th style={{ width: '12%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Time Taken</th>
                <th style={{ width: '12%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Total Score</th>
              </tr>
            </thead>
          );

          const renderSignatures = () => (
            <div className="avoid-break signatures-container" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: '2.5rem', paddingBottom: '0.6rem', flexWrap: 'wrap', gap: '3rem', pageBreakInside: 'avoid', breakInside: 'avoid', color: 'black', width: '100%' }}>
              {judgeSignatures.map((sigTitle, i) => (
                <div key={i} className="avoid-break" style={{ textAlign: 'center', minWidth: '190px', pageBreakInside: 'avoid', breakInside: 'avoid', margin: '0 10px' }}>
                  {esignMap[sigTitle] ? (
                    <img src={esignMap[sigTitle]} alt={sigTitle} style={{ height: '70px', maxWidth: '210px', objectFit: 'contain', margin: '0 auto', display: 'block', marginBottom: '5px' }} />
                  ) : (
                    <>
                      <div style={{ height: '55px' }}></div>
                      <div style={{ borderBottom: '1.5px solid black', width: '85%', margin: '0 auto 5px auto' }}></div>
                    </>
                  )}
                  <div style={{ fontWeight: 'bold', fontSize: '10pt', color: 'black' }}>{sigTitle}</div>
                </div>
              ))}
            </div>
          );

          return (
            <div id="print-area" style={{ background: 'white', color: 'black', padding: '1.2rem', fontFamily: '"Times New Roman", Times, serif', boxSizing: 'border-box' }}>
              {tableChunks.map((chunk, cIdx) => (
                <React.Fragment key={chunk.pageNum}>
                  {chunk.isFirstPage && (
                    <>
                      {/* College Header with Logos matching official PDF */}
                      <div className="avoid-break" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid black', paddingBottom: '1.2rem', marginBottom: '1.5rem', color: 'black', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <img src="/college-logo.png" alt="College Logo" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
                        <div style={{ textAlign: 'center', flex: 1, padding: '0 1rem', color: 'black' }}>
                          <div style={{ fontWeight: '900', fontSize: '1.18rem', letterSpacing: '3px' }}>SOFTECH</div>
                          <div style={{ fontWeight: '800', fontSize: '1.08rem', margin: '3px 0' }}>DEPARTMENT OF COMPUTER APPLICATIONS</div>
                          <div style={{ fontWeight: '900', fontSize: '1.35rem', margin: '4px 0' }}>AYYA NADAR JANAKI AMMAL COLLEGE</div>
                          <div style={{ fontSize: '0.68rem', lineHeight: '1.35', fontWeight: '500', maxWidth: '680px', margin: '0 auto' }}>
                            (Autonomous, Affiliated to Madurai Kamaraj University, Madurai, Re-accredited (4th Cycle) with 'A+' Grade
                            (CGPA 3.48 out of 4) by NAAC, Recognized as College of Excellence and Mentor Institution by UGC, STAR College by DBT
                            and Ranked 72nd at National Level in NIRF 2025 and DST-FIST (2023) Supported & An ISO 9001:2015 & ISO 21001:2018 Certified Institution)
                          </div>
                          <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '4px' }}>SIVAKASI - 626 124.</div>
                        </div>
                        <img src="/dept-logo.png" alt="Dept Logo" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
                      </div>

                      {/* Event & Sheet Title Subheading */}
                      <div className="avoid-break" style={{ textAlign: 'center', marginBottom: '1.6rem', color: 'black', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', margin: '0 0 0.4rem 0', color: 'black', textTransform: 'uppercase' }}>
                          {reportEventName}
                        </h2>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'black', textDecoration: 'underline' }}>
                          {reportType === 'scoresheet'
                            ? `${adminCategoryFilter === 'ALL' ? 'Overall' : adminCategoryFilter} ScoreSheet`
                            : `Top 3 Winners (${adminCategoryFilter === 'ALL' ? 'Overall' : adminCategoryFilter})`}
                        </h3>
                      </div>
                    </>
                  )}

                  {/* Table Chunk for this Page */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'black', pageBreakInside: 'auto', breakInside: 'auto', tableLayout: 'fixed' }}>
                    {renderTableHeader()}
                    <tbody>
                      {chunk.rows.length === 0 ? (
                        <tr className="avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'black', border: '1px solid black', fontSize: '10pt' }}>
                            No participants found for this report criteria.
                          </td>
                        </tr>
                      ) : (
                        chunk.rows.map((user, rIdx) => {
                          const globalIndex = chunk.startIndex + rIdx;
                          const cat = getStudentCategory(user.rollNo);
                          return (
                            <tr key={user.id} className="avoid-break" style={{ borderBottom: '1px solid black', color: 'black', pageBreakInside: 'avoid', breakInside: 'avoid', pageBreakAfter: 'auto' }}>
                              <td style={{ width: '10%', padding: '6px 5px', fontWeight: 'bold', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt' }}>
                                {reportType === 'scoresheet' ? `#${globalIndex + 1}` : (globalIndex === 0 ? '1' : globalIndex === 1 ? '2' : '3')}
                              </td>
                              <td style={{ width: '32%', padding: '6px 8px', fontWeight: 'bold', color: 'black', border: '1px solid black', textAlign: 'left', wordBreak: 'normal', overflowWrap: 'break-word', verticalAlign: 'middle', fontSize: '10pt', lineHeight: '1.25' }}>
                                {user.name || 'Anonymous'}
                              </td>
                              <td style={{ width: '21%', padding: '6px 5px', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt' }}>
                                {user.rollNo || 'N/A'} {cat !== 'OTHER' && `(${cat})`}
                              </td>
                              <td style={{ width: '13%', padding: '6px 5px', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt' }}>
                                {(user.cumulativeClearedErrors || 0) + (user.clearedErrors || 0)} / {(user.cumulativeTotalErrors || 0) + (user.totalErrors || 0)}
                              </td>
                              <td style={{ width: '12%', padding: '6px 5px', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt' }}>
                                {user.elapsedTimeMs ? `${Math.floor(user.elapsedTimeMs / 60000)}m ${Math.floor((user.elapsedTimeMs % 60000) / 1000)}s` : 'N/A'}
                              </td>
                              <td style={{ width: '12%', padding: '6px 5px', fontWeight: 'bold', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10.5pt' }}>
                                {user.score !== undefined ? user.score : 0}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Render signatures below table if on last chunk and fits on page */}
                  {cIdx === tableChunks.length - 1 && !putSignaturesOnNewPage && renderSignatures()}

                  {/* Page break after chunk if not the last chunk */}
                  {cIdx < tableChunks.length - 1 && <div className="html2pdf__page-break"></div>}
                </React.Fragment>
              ))}

              {/* If signatures need a separate page due to table filling up the final page */}
              {putSignaturesOnNewPage && (
                <>
                  <div className="html2pdf__page-break"></div>
                  {renderSignatures()}
                </>
              )}
            </div>
          );
        };

        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            {drawingSigTitle && (
              <SignatureDrawingPad
                sigTitle={drawingSigTitle}
                onClose={() => setDrawingSigTitle(null)}
                onSave={(title, dataUrl) => {
                  setEsignMap(prev => ({ ...prev, [title]: dataUrl }));
                  setDrawingSigTitle(null);
                }}
              />
            )}

            {/* ── Screen Control Panel (no-print) ───────────────────────── */}
            <div className="no-print" style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 className="glow-text-cyan" style={{ margin: 0, fontSize: '1.6rem' }}>
                    {activeTab === 'esign' ? '✍️ STAFF E-SIGN & OFFICIAL PDF STUDIO' : 'OFFICIAL PDF REPORT GENERATOR'}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    {activeTab === 'esign'
                      ? 'Upload image signatures or draw digital e-signatures for judges and staff, then download clean college PDF reports.'
                      : 'Generate college-formatted ScoreSheets and Top 3 Winner lists without blue criteria box or extra columns.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <button onClick={handleDownloadPdf} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                    <FileDown size={19} /> DOWNLOAD OFFICIAL PDF (.PDF)
                  </button>
                </div>
              </div>

              {/* Controls Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', background: 'var(--bg-deep-navy)', padding: '1.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                {/* 1. Report Type Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                    1. REPORT FORMAT TYPE
                  </label>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      onClick={() => setReportType('scoresheet')}
                      className={reportType === 'scoresheet' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      📊 Full ScoreSheet
                    </button>
                    <button
                      onClick={() => setReportType('winners')}
                      className={reportType === 'winners' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', background: reportType === 'winners' ? 'linear-gradient(135deg, #ffd700, #ff8800)' : 'transparent', color: reportType === 'winners' ? '#000' : 'var(--text-primary)', borderColor: reportType === 'winners' ? '#ffd700' : 'var(--border-subtle)' }}
                    >
                      🏆 Top 3 Winners Sheet
                    </button>
                  </div>
                </div>

                {/* 2. Category Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                    2. STUDENT CATEGORY
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setAdminCategoryFilter('ALL')}
                      className={adminCategoryFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem' }}
                    >
                      ALL ({allCount})
                    </button>
                    <button
                      onClick={() => setAdminCategoryFilter('UG')}
                      className={adminCategoryFilter === 'UG' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', borderColor: '#00f0ff', color: adminCategoryFilter === 'UG' ? '#040711' : '#00f0ff', background: adminCategoryFilter === 'UG' ? '#00f0ff' : 'transparent' }}
                    >
                      UG ({ugCount})
                    </button>
                    <button
                      onClick={() => setAdminCategoryFilter('PG')}
                      className={adminCategoryFilter === 'PG' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', borderColor: '#ff00ff', color: adminCategoryFilter === 'PG' ? '#040711' : '#ff00ff', background: adminCategoryFilter === 'PG' ? '#ff00ff' : 'transparent' }}
                    >
                      PG ({pgCount})
                    </button>
                  </div>
                </div>

                {/* 3. Event Title Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                    3. EVENT TITLE HEADER
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={reportEventName}
                    onChange={(e) => setReportEventName(e.target.value)}
                    placeholder="e.g. CODATHAN - DEBUGGING EVENT"
                    style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                </div>

                {/* 4. Judge & Staff E-Signature Upload Studio */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '1px' }}>
                    4. STAFF & JUDGE E-SIGNATURES (RIGHT-ALIGNED AT BOTTOM OF PDF)
                  </label>

                  {/* Grid of signature cards for each title */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.2rem' }}>
                    {judgeSignatures.map((sig, i) => (
                      <div key={i} style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>✍️ {sig}</strong>
                          <button onClick={() => handleRemoveJudgeSig(i)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', padding: 0 }} title="Remove this signature box">
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Preview of E-Sign if exists */}
                        {esignMap[sig] ? (
                          <div style={{ background: 'white', padding: '10px', borderRadius: '4px', textAlign: 'center', position: 'relative' }}>
                            <img src={esignMap[sig]} alt={sig} style={{ height: '80px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                            <button
                              onClick={() => setEsignMap(prev => { const copy = { ...prev }; delete copy[sig]; return copy; })}
                              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 6px', cursor: 'pointer' }}
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                            <label className="btn-secondary" style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: 0 }}>
                              <Upload size={14} /> Upload Image
                              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(sig, e)} style={{ display: 'none' }} />
                            </label>
                            <button onClick={() => setDrawingSigTitle(sig)} className="btn-secondary" style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
                              <PenTool size={14} /> Draw Pad
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', maxWidth: '500px' }}>
                    <input
                      type="text"
                      className="input-field"
                      value={newSigTitle}
                      onChange={(e) => setNewSigTitle(e.target.value)}
                      placeholder="Add another judge/staff title (e.g. Dr. A. Sharma - Judge 1)"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                    <button onClick={handleAddJudgeSig} className="btn-secondary" style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                      + Add Signature Box
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Printable Area (#print-area) exact to @pdf format ─────── */}
            {renderSharedPrintableSection()}
          </div>
        );


      case 'tracker':
        const activeTrackerUser = liveUsers.find(u => u.id === selectedTrackerUser?.id) || null;
        
        return (
          <div className="glass-panel" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>LIVE CODE TRACKER</h2>
            
            <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: '1', borderRight: '1px solid var(--border-subtle)', paddingRight: '1rem', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>ACTIVE PARTICIPANTS</h3>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {liveUsers.map(user => (
                    <button 
                      key={user.id} 
                      onClick={() => setSelectedTrackerUser(user)}
                      className={selectedTrackerUser?.id === user.id ? 'btn-primary' : 'btn-secondary'}
                      style={{ 
                        textAlign: 'left', padding: '1rem', display: 'flex', justifyContent: 'space-between',
                        border: (user.tabSwitches > 2 || user.copyPasteCount > 2) ? '1px solid var(--accent-magenta)' : undefined
                      }}
                    >
                      <span>{user.rollNo} - {user.name}</span>
                      <span style={{ color: user.isFinished ? 'var(--text-secondary)' : 'var(--accent-cyan)' }}>
                        {user.isFinished ? 'SUBMITTED' : 'CODING'}
                      </span>
                    </button>
                  ))}
                  {liveUsers.length === 0 && <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No users registered.</div>}
                </div>
              </div>
              
              <div style={{ flex: '2', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {activeTrackerUser ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div>
                        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>{activeTrackerUser.name}</h2>
                        <span style={{ color: 'var(--text-secondary)' }}>{activeTrackerUser.rollNo} | {activeTrackerUser.selectedLanguage?.toUpperCase() || 'N/A'}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>STATUS</div>
                        <strong style={{ color: activeTrackerUser.isFinished ? 'var(--accent-magenta)' : 'var(--accent-cyan)' }}>
                          {activeTrackerUser.isFinished ? 'SUBMITTED' : 'ACTIVELY CODING'}
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>CURRENT PROGRAM ERRORS FIXED</div>
                        <div style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}><span style={{ color: 'var(--accent-cyan)' }}>{activeTrackerUser.clearedErrors || 0}</span> / {activeTrackerUser.totalErrors || 0}</div>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(255, 42, 109, 0.05)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>CURRENT PROGRAM CODE LINES</div>
                        <div style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}><span style={{ color: 'var(--accent-pink)' }}>{activeTrackerUser.currentLinesCount || 0}</span> / {activeTrackerUser.targetLinesCount || 0}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tab Switches: <strong style={{ color: activeTrackerUser.tabSwitches > 0 ? 'var(--accent-magenta)' : 'var(--text-primary)' }}>{activeTrackerUser.tabSwitches || 0}</strong></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Copy/Paste: <strong style={{ color: activeTrackerUser.copyPasteCount > 0 ? 'var(--accent-magenta)' : 'var(--text-primary)' }}>{activeTrackerUser.copyPasteCount || 0}</strong></span>
                    </div>

                    <div style={{ flex: 1, background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', overflowY: 'auto' }}>
                      <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.8rem' }}>LIVE EDITOR VIEW</h4>
                      <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{activeTrackerUser.currentCode || '// No code typed yet...'}</pre>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    Select a participant from the left to view their live code.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'conclusion':
        const conclusionUsers = getSortedParticipantsByCategory(liveUsers, adminCategoryFilter);
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className="glow-text-cyan" style={{ margin: 0 }}>WINNER CONCLUSION</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setAdminCategoryFilter('ALL')} className={adminCategoryFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>ALL</button>
                <button onClick={() => setAdminCategoryFilter('UG')} className={adminCategoryFilter === 'UG' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '5px 12px', fontSize: '0.8rem', borderColor: '#00f0ff', color: adminCategoryFilter === 'UG' ? '#040711' : '#00f0ff', background: adminCategoryFilter === 'UG' ? '#00f0ff' : 'transparent' }}>UG</button>
                <button onClick={() => setAdminCategoryFilter('PG')} className={adminCategoryFilter === 'PG' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '5px 12px', fontSize: '0.8rem', borderColor: '#ff00ff', color: adminCategoryFilter === 'PG' ? '#040711' : '#ff00ff', background: adminCategoryFilter === 'PG' ? '#ff00ff' : 'transparent' }}>PG</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div style={{ flex: '1', borderRight: '1px solid var(--border-subtle)', paddingRight: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>SELECT ({adminCategoryFilter}) PARTICIPANT</h3>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {conclusionUsers.map(user => {
                    const cat = getStudentCategory(user.rollNo);
                    return (
                    <button 
                      key={user.id} 
                      onClick={() => setSelectedConclusionUser(user)}
                      className={selectedConclusionUser?.id === user.id ? 'btn-primary' : 'btn-secondary'}
                      style={{ textAlign: 'left', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <span>{user.rollNo} - {user.name}</span>
                        {cat === 'UG' && <span style={{ marginLeft: '6px', padding: '1px 5px', borderRadius: '8px', fontSize: '0.65rem', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid #00f0ff' }}>UG</span>}
                        {cat === 'PG' && <span style={{ marginLeft: '6px', padding: '1px 5px', borderRadius: '8px', fontSize: '0.65rem', background: 'rgba(255, 0, 255, 0.15)', color: '#ff00ff', border: '1px solid #ff00ff' }}>PG</span>}
                      </div>
                      <span style={{ color: user.score < 0 ? 'var(--accent-magenta)' : 'var(--accent-cyan)' }}>{user.score}</span>
                    </button>
                  );})}
                </div>
              </div>
              
              <div style={{ flex: '2', paddingLeft: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {selectedConclusionUser ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <div>
                        <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '2rem' }}>{selectedConclusionUser.name}</h2>
                        <span style={{ color: 'var(--text-secondary)' }}>LOT / ROLL NO: {selectedConclusionUser.rollNo}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL CONCLUSION</span>
                        <h2 style={{ margin: 0, fontSize: '3rem', color: selectedConclusionUser.score < 0 ? 'var(--accent-magenta)' : 'var(--accent-cyan)' }}>{selectedConclusionUser.score}</h2>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {['c', 'cpp', 'python', 'java', 'easy', 'medium', 'hard'].map(phase => {
                        const phaseSubmissions = Object.values(selectedConclusionUser.submissions || {}).filter(s => s.phase === phase);
                        if (phaseSubmissions.length === 0) return null;
                        
                        let phaseScore = 0;
                        let phaseCleared = 0;
                        let phaseTotal = 0;
                        let phaseLines = 0;
                        let phaseTargetLines = 0;
                        
                        phaseSubmissions.forEach(s => {
                          phaseScore += (s.score || 0);
                          phaseCleared += (s.clearedErrors || 0);
                          phaseTotal += (s.totalErrors || 0);
                          phaseLines += (s.codeLines || 0);
                          phaseTargetLines += (s.targetLines || 0);
                        });

                        return (
                          <div key={phase} style={{ background: 'var(--bg-deep-navy)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                            <h3 style={{ textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{phase} PHASE</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>{phaseScore} PTS</span>
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div style={{ padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ERRORS FIXED</div>
                                <div style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}><span style={{ color: 'var(--accent-cyan)' }}>{phaseCleared}</span> / {phaseTotal}</div>
                              </div>
                              <div style={{ padding: '1rem', background: 'rgba(255, 42, 109, 0.05)', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>CODE LINES</div>
                                <div style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}><span style={{ color: 'var(--accent-pink)' }}>{phaseLines}</span> / {phaseTargetLines}</div>
                              </div>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>INDIVIDUAL PROGRAMS</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {phaseSubmissions.map((s, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                    <span style={{ color: 'var(--text-primary)' }}>{s.title || 'Unknown Mission'}</span>
                                    <span style={{ color: 'var(--accent-cyan)' }}>{s.score} pts</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(selectedConclusionUser.submissions || {}).length === 0 && (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No completed missions yet.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    Select a participant from the left to view their detailed conclusion.
                  </div>
                )}
              </div>
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
        
        {/* Sidebar Navigation with Scrollbar */}
        <div className="no-print" style={{ width: '260px', background: 'var(--bg-panel)', borderRight: '1px solid var(--border-subtle)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
            <h2 className="glow-text-cyan" style={{ fontSize: '1.2rem', margin: 0 }}>ADMIN CONSOLE</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>SYSTEM V2.0</p>
          </div>
          
          <a href="/leaderboard" target="_blank" rel="noreferrer" className="sidebar-btn"><Trophy size={18} /> Leaderboard</a>
          <a href="/winners" target="_blank" rel="noreferrer" className="sidebar-btn" style={{ color: 'var(--accent-cyan)' }}><Sparkles size={18} /> Top 3 Winners</a>
          <button onClick={() => setActiveTab('event')} className={`sidebar-btn ${activeTab === 'event' ? 'active' : ''}`}><Clock size={18} /> Round Setting</button>
          <button onClick={() => setActiveTab('questions')} className={`sidebar-btn ${activeTab === 'questions' ? 'active' : ''}`}><FileText size={18} /> Questions</button>
          <button onClick={() => setActiveTab('users')} className={`sidebar-btn ${activeTab === 'users' ? 'active' : ''}`}><Users size={18} /> User Management</button>
          <button onClick={() => setActiveTab('results')} className={`sidebar-btn ${activeTab === 'results' ? 'active' : ''}`}><FileDown size={18} /> Results & PDF</button>
          <button onClick={() => setActiveTab('esign')} className={`sidebar-btn ${activeTab === 'esign' ? 'active' : ''}`}><PenTool size={18} /> Staff E-Sign & PDF</button>
          <button onClick={() => setActiveTab('submissions')} className={`sidebar-btn ${activeTab === 'submissions' ? 'active' : ''}`}><Code size={18} /> Submissions</button>
          <button onClick={() => setActiveTab('tracker')} className={`sidebar-btn ${activeTab === 'tracker' ? 'active' : ''}`}><MonitorPlay size={18} /> Live Code</button>
          <button onClick={() => setActiveTab('conclusion')} className={`sidebar-btn ${activeTab === 'conclusion' ? 'active' : ''}`}><Award size={18} /> Conclusion</button>
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

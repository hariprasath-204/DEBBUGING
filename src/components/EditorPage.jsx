import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from "@monaco-editor/react";
import axios from 'axios';
import { db } from '../firebase';
import { doc, getDoc, getDocs, collection, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';

const EditorPage = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('// Loading...');
  const [output, setOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [popup, setPopup] = useState(null);
  
  const userId = localStorage.getItem('debugEventUserId');
  const userName = localStorage.getItem('debugEventUserName');
  const lockedLanguage = localStorage.getItem('debugEventLanguage') || 'cpp'; // Default fallback

  const [violations, setViolations] = useState({ tabSwitches: 0, copyPasteCount: 0 });
  const [fullscreenRequired, setFullscreenRequired] = useState(true);

  const cheatingRef = useRef({ tabSwitches: 0, copyPasteCount: 0 });
  const editorContainerRef = useRef(null);
  const codeRef = useRef(code);
  const errorStatsRef = useRef({ total: 0, cleared: 0, remaining: 0, currentLines: 0, targetLines: 0 });
  const ignoreCheatRef = useRef(false);
  const eventStartTimeRef = useRef(null);

  // Sync state to ref for auto-save and submission closures
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    // 1. Fetch Question (and verify language from Firestore user doc)
    const fetchQuestion = async () => {
      try {
        // Read the user's chosen language FROM FIRESTORE (source of truth)
        // in case localStorage is stale from a previous session
        let lang = lockedLanguage;
        if (userId) {
          const userSnap = await getDoc(doc(db, 'users', userId));
          if (userSnap.exists() && userSnap.data().selectedLanguage) {
            lang = userSnap.data().selectedLanguage;
            // Sync localStorage with the real value
            localStorage.setItem('debugEventLanguage', lang);
          }
        }

        if (questionId && questionId !== 'default_question') {
          const docSnap = await getDoc(doc(db, "questions", questionId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setQuestion({ id: docSnap.id, ...data });
            if (data.variants && data.variants[lang]) {
              setCode(data.variants[lang].initialCode || '// No code provided for this language.');
            } else {
              setCode(data.initialCode || '');
            }
          } else {
            setCode('// Mission not found.');
          }
        } else {
          const querySnapshot = await getDocs(collection(db, "questions"));
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            setQuestion({ id: docSnap.id, ...data });
            if (data.variants && data.variants[lang]) setCode(data.variants[lang].initialCode || '');
          } else {
            setCode('// No missions available.');
          }
        }
      } catch (err) {
        console.error("Error fetching question:", err);
      }
    };
    fetchQuestion();

    // 2. Listen to Event Timer
    const eventDocRef = doc(db, 'settings', 'event');
    const unsubEvent = onSnapshot(eventDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Read fullscreen requirement setting
        if (data.fullscreenRequired !== undefined) setFullscreenRequired(data.fullscreenRequired);
        if (data.status === 'ended') {
          // Event over -> force submit
          handleSubmit(true);
        } else if (data.status === 'active' && data.endTime) {
          if (data.startTime) eventStartTimeRef.current = data.startTime;
          // Setup timer
          const end = new Date(data.endTime).getTime();
          const timerInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = end - now;
            
            if (distance < 0) {
              clearInterval(timerInterval);
              setTimeLeft("00:00");
              handleSubmit(true); // Auto submit when time reaches 0
            } else {
              const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((distance % (1000 * 60)) / 1000);
              setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
          }, 1000);
          
          return () => clearInterval(timerInterval);
        }
      }
    });

    // 3. Auto-save every 3 seconds
    const autoSaveInterval = setInterval(async () => {
      if (userId && codeRef.current) {
        try {
          await updateDoc(doc(db, 'users', userId), {
            currentCode: codeRef.current,
            ...errorStatsRef.current
          });
        } catch (e) {
          // Silently fail if quota exceeded or offline
        }
      }
    }, 3000);

    // 4. Anti-cheating & Fullscreen Listeners
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        cheatingRef.current.tabSwitches += 1;
        setPopup({ message: "WARNING: Tab switching detected! This is recorded as a cheating violation.", type: "warning" });
        if (userId) {
          await updateDoc(doc(db, 'users', userId), { tabSwitches: increment(1) });
        }
      }
    };

    const handleCopyPaste = async (e) => {
      cheatingRef.current.copyPasteCount += 1;
      setPopup({ message: "WARNING: Copy/Pasting is strictly prohibited!", type: "warning" });
      e.preventDefault();
      if (userId) {
        await updateDoc(doc(db, 'users', userId), { copyPasteCount: increment(1) });
      }
    };

    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      // Only flag as violation if fullscreen is required AND not intentional exit
      if (!document.fullscreenElement && !ignoreCheatRef.current && fullscreenRequired) {
        cheatingRef.current.tabSwitches += 1;
        setPopup({ message: "WARNING: Exiting Fullscreen is recorded as a violation!", type: "warning" });
        if (userId) updateDoc(doc(db, 'users', userId), { tabSwitches: increment(1) });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      unsubEvent();
      clearInterval(autoSaveInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [userId, navigate, lockedLanguage]);

  const requestFullScreen = () => {
    if (editorContainerRef.current) {
      if (editorContainerRef.current.requestFullscreen) {
        editorContainerRef.current.requestFullscreen();
      }
    }
  };

  const compileCode = async () => {
    setIsCompiling(true);
    setOutput('Compiling...');
    try {
      // Always read language fresh (Firestore syncs this during question load)
      const lang = localStorage.getItem('debugEventLanguage') || 'cpp';
      let compiler = 'gcc-head';
      if (lang === 'cpp') compiler = 'gcc-head';
      if (lang === 'c') compiler = 'gcc-head-c';
      if (lang === 'java') compiler = 'openjdk-jdk21-full'; // Use stable Java 21

      // Use relative path so Vite proxy forwards to localhost:3000 in dev,
      // and Vercel naturally hits the Serverless Function in prod.
      const response = await axios.post(`/api/compile`, {
        code: codeRef.current,
        compiler: compiler
      });

      const result = response.data.program_message || response.data.compiler_error || "No output";
      setOutput(result);
      return result;
    } catch (err) {
      setOutput("Error connecting to compiler API");
      return null;
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!question || isSubmitting) return;
    setIsSubmitting(true);
    
    // First run the code to get final output
    const userOutput = await compileCode();
    
    // Determine language-specific correct code
    let langCorrectCode = '';
    if (question.variants && question.variants[lockedLanguage]) {
      langCorrectCode = question.variants[lockedLanguage].correctCode;
    } else {
      langCorrectCode = question.correctCode || ''; // Fallback
    }

    // Calculate stats
    const correctLines = langCorrectCode.split('\n').filter(line => line.trim() !== '').length;
    const userLines = codeRef.current.split('\n').filter(line => line.trim() !== '').length;
    
    const normalizedUserOutput = (userOutput || '').trim();
    const normalizedExpected = (question.expectedOutput || '').trim();
    
    const isOutputCorrect = normalizedUserOutput === normalizedExpected;
    const lineDifference = Math.abs(correctLines - userLines);
    
    let score = 0;
    if (isOutputCorrect) {
      score += question.points || 100;
      if (lineDifference === 0) {
        score += 50; 
      } else {
        score -= (lineDifference * 2);
      }
    }

    if (cheatingRef.current.tabSwitches > 2 || cheatingRef.current.copyPasteCount > 2) {
      score = -9999;
    }

    let elapsedTimeMs = 0;
    if (eventStartTimeRef.current) {
      elapsedTimeMs = new Date().getTime() - eventStartTimeRef.current;
    }

    try {
      const userDocSnap = await getDoc(doc(db, 'users', userId));
      let userData = {};
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
      }

      const completedQs = userData.completedQuestions || [];
      const newCompletedQs = [...completedQs, questionId];
      
      const prevFinalCode = userData.finalCode || '';
      const newFinalCode = prevFinalCode + `\n\n// ====== MISSION: ${question.title || questionId} ======\n` + codeRef.current;
      
      const newCumulCleared = (userData.cumulativeClearedErrors || 0) + errorStatsRef.current.clearedErrors;
      const newCumulTotal = (userData.cumulativeTotalErrors || 0) + errorStatsRef.current.totalErrors;

      const updatePayload = {
        score: increment(score),
        finalCode: newFinalCode,
        elapsedTimeMs: elapsedTimeMs,
        completedQuestions: newCompletedQs,
        cumulativeClearedErrors: newCumulCleared,
        cumulativeTotalErrors: newCumulTotal
      };

      if (isAutoSubmit) {
        updatePayload.isFinished = true;
      } else {
        updatePayload.selectedQuestionId = null;
      }

      await updateDoc(doc(db, 'users', userId), updatePayload);

      if (isAutoSubmit) {
        setPopup({ message: "TIME IS UP! Your code has been automatically submitted.", type: "warning" });
        ignoreCheatRef.current = true;
        if (document.fullscreenElement) await document.exitFullscreen();
        setTimeout(() => navigate('/timer-finished'), 2000);
      } else {
        setPopup({ message: isOutputCorrect ? `Success! Output matched. Score awarded: ${score}` : 'Output did not match expected output. Code Submitted.', type: isOutputCorrect ? 'success' : 'warning' });
        ignoreCheatRef.current = true;
        if (document.fullscreenElement) await document.exitFullscreen();
        setTimeout(() => navigate('/selection'), 2000);
      }
    } catch (err) {
      console.error("Error submitting:", err);
      setPopup({ message: "Submission failed.", type: "error" });
      setIsSubmitting(false);
    }
  };

  // Get specific error lines to display
  let currentErrorLines = [];
  if (question && question.variants && question.variants[lockedLanguage] && question.variants[lockedLanguage].errorLinesArray) {
    currentErrorLines = question.variants[lockedLanguage].errorLinesArray;
  } else if (question && question.errorLines) {
    currentErrorLines = question.errorLines; // Fallback
  }

  // Calculate Error Stats
  let totalErrors = currentErrorLines.length;
  let clearedErrors = 0;

  if (question && totalErrors > 0) {
    let initialCode = '';
    if (question.variants && question.variants[lockedLanguage]) {
      initialCode = question.variants[lockedLanguage].initialCode || '';
    } else {
      initialCode = question.initialCode || '';
    }
    const initialLines = initialCode.split('\n');
    const currentLines = code.split('\n');

    currentErrorLines.forEach(lineNum => {
      const idx = parseInt(lineNum) - 1;
      if (initialLines[idx] !== undefined && currentLines[idx] !== undefined) {
        if (initialLines[idx].trim() !== currentLines[idx].trim()) {
          clearedErrors++;
        }
      }
    });
  }
  let remainingErrors = totalErrors - clearedErrors;
  if (remainingErrors < 0) remainingErrors = 0;

  // Calculate Line Counts
  let targetLinesCount = 0;
  if (question) {
    let correctCode = '';
    if (question.variants && question.variants[lockedLanguage]) {
      correctCode = question.variants[lockedLanguage].correctCode || '';
    } else {
      correctCode = question.correctCode || '';
    }
    targetLinesCount = correctCode.split('\n').filter(line => line.trim() !== '').length;
  }
  const currentLinesCount = code.split('\n').filter(line => line.trim() !== '').length;

  // Save to ref for the interval to pick up
  errorStatsRef.current = {
    totalErrors,
    clearedErrors,
    remainingErrors,
    currentLinesCount,
    targetLinesCount
  };

  return (
    <>
      <LoadingOverlay isLoading={!question || isCompiling || isSubmitting} />
      {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} />}
      <div ref={editorContainerRef} style={{ display: 'flex', flexDirection: 'column', height: isFullScreen ? '100vh' : '90vh' }}>
      
      {!isFullScreen && fullscreenRequired && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(9, 11, 26, 0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <h2 className="glow-text-pink" style={{ marginBottom: '2rem' }}>FULLSCREEN REQUIRED</h2>
            <p style={{ color: 'var(--text-primary)', marginBottom: '2rem' }}>You must enter fullscreen mode to begin the debugging challenge. Exiting fullscreen will be flagged as cheating.</p>
            <button onClick={requestFullScreen} className="btn-primary" style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}>ENTER FULLSCREEN</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 className="glow-text-cyan" style={{ margin: 0 }}>DEBUGGING ARENA</h2>
        
        {timeLeft && (
          <div style={{ background: 'var(--accent-pink)', color: 'var(--bg-deep-navy)', padding: '5px 15px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
            TIME REMAINING: {timeLeft}
          </div>
        )}

        <div style={{ color: 'var(--accent-pink)' }}>USER: {userName}</div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, padding: '1rem', overflow: 'hidden' }}>
        {/* Left Panel: Question Info */}
        <div className="glass-panel" style={{ flex: '0 0 35%', padding: '1.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>{question?.title || 'Loading...'}</h3>
          <span style={{ display: 'inline-block', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', alignSelf: 'flex-start' }}>PHASE: {question?.phase || 'UNKNOWN'}</span>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6' }}>{question?.description}</p>
          
          <div style={{ marginTop: 'auto' }}>
            <h4 style={{ color: 'var(--accent-magenta)', marginBottom: '0.5rem' }}>EXPECTED OUTPUT</h4>
            <pre style={{ background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              {question?.expectedOutput}
            </pre>
          </div>
        </div>

        {/* Right Panel: Editor & Console Stack */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          
          {/* Top: Editor */}
          <div className="glass-panel" style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-panel-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
              
              <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                LANGUAGE: {lockedLanguage === 'cpp' ? 'C++' : lockedLanguage} (LOCKED)
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={compileCode} disabled={isCompiling} className="btn-secondary" style={{ padding: '5px 15px', fontSize: '0.8rem' }}>
                  {isCompiling ? 'RUNNING...' : 'RUN CODE'}
                </button>
                <button onClick={() => handleSubmit(false)} disabled={isSubmitting || !question} className="btn-primary" style={{ padding: '5px 15px', fontSize: '0.8rem' }}>
                  {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <Editor
                height="100%"
                theme="vs-dark"
                language={lockedLanguage === 'cpp' || lockedLanguage === 'c' ? 'cpp' : lockedLanguage}
                value={code}
                onChange={(value) => setCode(value)}
                options={{ minimap: { enabled: false }, fontSize: 16 }}
              />
            </div>
          </div>

          {/* Bottom: Console Output */}
          <div className="glass-panel" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>CONSOLE OUTPUT</h4>
            <pre style={{ 
              flex: 1, 
              background: 'var(--bg-deep-navy)', 
              padding: '1rem', 
              borderRadius: '4px', 
              color: output.includes('error') ? 'var(--accent-magenta)' : 'var(--text-primary)',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              border: '1px solid var(--border-subtle)',
              margin: 0
            }}>
              {output}
            </pre>
          </div>

        </div>
      </div>
    </div>
    </>
  );
};

export default EditorPage;

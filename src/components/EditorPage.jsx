import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from "@monaco-editor/react";
import axios from 'axios';
import { db } from '../firebase';
import { doc, getDoc, getDocs, collection, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { syncClock, getNow } from '../utils/timeSync';

const EditorPage = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('// Loading...');
  const [output, setOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [popup, setPopup] = useState(null);

  const userId = localStorage.getItem('debugEventUserId');
  const userName = localStorage.getItem('debugEventUserName');
  const [phaseLanguages, setPhaseLanguages] = useState({ easy: 'c', medium: 'cpp', hard: 'java' });
  const activeLanguage = question ? (phaseLanguages[question.phase] || 'cpp') : 'cpp';

  const [violations, setViolations] = useState({ tabSwitches: 0, copyPasteCount: 0 });

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

    // 1. Fetch Question & Admin Round Language Mapping
    const fetchQuestion = async () => {
      try {
        const langConfigSnap = await getDoc(doc(db, 'settings', 'language'));
        let phaseLangs = { easy: 'c', medium: 'cpp', hard: 'java' };
        if (langConfigSnap.exists()) {
          const d = langConfigSnap.data();
          if (d.easy) phaseLangs.easy = d.easy;
          if (d.medium) phaseLangs.medium = d.medium;
          if (d.hard) phaseLangs.hard = d.hard;
          setPhaseLanguages(phaseLangs);
        }

        let targetQuestion = null;
        if (questionId && questionId !== 'default_question') {
          const docSnap = await getDoc(doc(db, "questions", questionId));
          if (docSnap.exists()) {
            targetQuestion = { id: docSnap.id, ...docSnap.data() };
          }
        } else {
          const querySnapshot = await getDocs(collection(db, "questions"));
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            targetQuestion = { id: docSnap.id, ...docSnap.data() };
          }
        }

        if (targetQuestion) {
          const phaseLang = phaseLangs[targetQuestion.phase] || 'cpp';
          setQuestion(targetQuestion);
          const initialCode = targetQuestion.variants?.[phaseLang]?.initialCode ||
                              targetQuestion.variants?.cpp?.initialCode ||
                              targetQuestion.variants?.c?.initialCode ||
                              targetQuestion.variants?.java?.initialCode ||
                              targetQuestion.initialCode ||
                              '// No code provided.';

          // 1. Check local storage draft first
          const localDraft = localStorage.getItem(`codathan_draft_${userId}_${targetQuestion.id}`);

          // 2. Also check Firestore user draft
          let remoteDraft = null;
          try {
            const uSnap = await getDoc(doc(db, 'users', userId));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              if (uData.drafts && uData.drafts[targetQuestion.id]) {
                remoteDraft = uData.drafts[targetQuestion.id];
              } else if (uData.currentCode && uData.currentCode !== initialCode && !uData.isFinished) {
                remoteDraft = uData.currentCode;
              }
            }
          } catch (e) {
            console.warn("Could not load remote draft:", e);
          }

          setCode(localDraft || remoteDraft || initialCode);
        } else {
          setCode('// Mission not found.');
        }
      } catch (err) {
        console.error("Error fetching question:", err);
      }
    };
    fetchQuestion();

    // Synchronize client clock with server
    syncClock();

    // 2. Listen to Event Timer
    const eventDocRef = doc(db, 'settings', 'event');
    const unsubEvent = onSnapshot(eventDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'ended') {
          // Event over -> force submit
          handleSubmit(true);
        } else if (data.status === 'active' && data.endTime) {
          if (data.startTime) eventStartTimeRef.current = data.startTime;
          // Setup timer
          const end = new Date(data.endTime).getTime();
          const updateTimer = () => {
            const now = getNow();
            const distance = end - now;
            
            if (distance < 0) {
              setTimeLeft("00:00");
              handleSubmit(true);
            } else {
              const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((distance % (1000 * 60)) / 1000);
              setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
          };
          updateTimer();
          const timerInterval = setInterval(updateTimer, 1000);
          return () => clearInterval(timerInterval);
        }
      }
    });

    // 3. Auto-save every 3 seconds
    const autoSaveInterval = setInterval(async () => {
      if (userId && codeRef.current && questionId) {
        try {
          await updateDoc(doc(db, 'users', userId), {
            currentCode: codeRef.current,
            [`drafts.${questionId}`]: codeRef.current,
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


    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("copy", handleCopyPaste);

    return () => {
      unsubEvent();
      clearInterval(autoSaveInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("copy", handleCopyPaste);
    };
  }, [userId, navigate, activeLanguage]);


  const handleResetCode = () => {
    if (!question) return;
    if (window.confirm("Are you sure you want to reset your code back to the original buggy template? Any unsaved edits will be discarded.")) {
      const initialCode = question.variants?.[activeLanguage]?.initialCode ||
                         question.variants?.cpp?.initialCode ||
                         question.variants?.c?.initialCode ||
                         question.variants?.java?.initialCode ||
                         question.initialCode ||
                         '';
      setCode(initialCode);
      if (userId && question.id) {
        localStorage.removeItem(`codathan_draft_${userId}_${question.id}`);
      }
      setPopup({ message: "Code reset to original buggy template.", type: "info" });
    }
  };

  const compileCode = async () => {
    setIsCompiling(true);
    setOutput('Compiling...');
    try {
      const response = await axios.post(`/api/compile`, {
        code: codeRef.current,
        compiler: activeLanguage,
        apiKey: '28152502bdcf827c763a92f0bf7ed806'
      });

      const result = response.data.program_message || response.data.compiler_error || "No output";
      setOutput(result);
      return result;
    } catch (err) {
      console.error("Compilation error:", err?.message);
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || "Compilation Error: Unable to connect to compiler engine.";
      setOutput(errorMsg);
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
    if (question.variants && question.variants[activeLanguage]) {
      langCorrectCode = question.variants[activeLanguage].correctCode;
    } else {
      langCorrectCode = question.correctCode || ''; // Fallback
    }

    // Calculate stats
    const correctLines = langCorrectCode.split('\n').filter(line => line.trim() !== '').length;
    const userLines = codeRef.current.split('\n').filter(line => line.trim() !== '').length;
    
    const normalizedUserOutput = (userOutput || '').trim();
    const normalizedExpected = (question.expectedOutput || '').trim();
    
    const isOutputCorrect = normalizedUserOutput === normalizedExpected;
    
    if (!isAutoSubmit && !isOutputCorrect) {
      setPopup({ message: 'Output did not match expected output. Keep trying!', type: 'error' });
      setIsSubmitting(false);
      return;
    }

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

      const prevSubmissions = userData.submissions || {};
      const submissionData = {
        score: score,
        clearedErrors: errorStatsRef.current.clearedErrors,
        totalErrors: errorStatsRef.current.totalErrors,
        codeLines: userLines,
        targetLines: correctLines,
        phase: question.phase || 'unknown',
        title: question.title || questionId,
        submittedAt: new Date().toISOString()
      };

      const updatePayload = {
        score: increment(score),
        finalCode: newFinalCode,
        elapsedTimeMs: elapsedTimeMs,
        completedQuestions: newCompletedQs,
        cumulativeClearedErrors: newCumulCleared,
        cumulativeTotalErrors: newCumulTotal,
        submissions: {
          ...prevSubmissions,
          [questionId]: submissionData
        },
        currentCode: '',
        clearedErrors: 0,
        totalErrors: 0,
        remainingErrors: 0,
        currentLinesCount: 0,
        targetLinesCount: 0
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
        setTimeout(() => navigate('/timer-finished'), 2000);
      } else {
        setPopup({ message: `Success! Output matched. Score awarded: ${score}`, type: 'success' });
        ignoreCheatRef.current = true;
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
  if (question && question.variants && question.variants[activeLanguage] && question.variants[activeLanguage].errorLinesArray) {
    currentErrorLines = question.variants[activeLanguage].errorLinesArray;
  } else if (question && question.errorLines) {
    currentErrorLines = question.errorLines; // Fallback
  }

  // Calculate Error Stats
  let totalErrors = currentErrorLines.length;
  let clearedErrors = 0;

  if (question && totalErrors > 0) {
    let initialCode = '';
    if (question.variants && question.variants[activeLanguage]) {
      initialCode = question.variants[activeLanguage].initialCode || '';
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
    if (question.variants && question.variants[activeLanguage]) {
      correctCode = question.variants[activeLanguage].correctCode || '';
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
      <div ref={editorContainerRef} style={{ display: 'flex', flexDirection: 'column', height: '90vh' }}>
      

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
                ROUND LANGUAGE: {activeLanguage === 'cpp' ? 'C++' : activeLanguage.toUpperCase()} (LOCKED FOR {question?.phase?.toUpperCase() || 'ROUND'})
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleResetCode} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem', color: 'var(--accent-pink)', borderColor: 'var(--border-subtle)' }} title="Reset to original buggy code">
                  RESET CODE
                </button>
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
                language={activeLanguage === 'cpp' || activeLanguage === 'c' ? 'cpp' : activeLanguage}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (userId && question?.id && value) {
                    localStorage.setItem(`codathan_draft_${userId}_${question.id}`, value);
                  }
                }}
                options={{ minimap: { enabled: false }, fontSize: 16 }}
              />
            </div>
          </div>

          {/* Bottom: Console Output */}
          <div className="glass-panel" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
              <h4 style={{ color: 'var(--accent-cyan)', margin: 0, fontFamily: 'var(--font-heading)' }}>CONSOLE OUTPUT</h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>[ SCROLLABLE ]</span>
            </div>
            <pre style={{ 
              flex: 1, 
              background: 'var(--bg-deep-navy)', 
              padding: '1rem', 
              borderRadius: '4px', 
              color: (output && (output.toLowerCase().includes('error') || output.toLowerCase().includes('exception'))) ? 'var(--accent-magenta)' : 'var(--text-primary)',
              overflowY: 'auto',
              overflowX: 'auto',
              minHeight: 0,
              maxHeight: '100%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: '1px solid var(--border-subtle)',
              margin: 0,
              fontFamily: 'var(--font-mono)'
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

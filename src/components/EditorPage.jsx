import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from "@monaco-editor/react";
import axios from 'axios';
import { db } from '../firebase';
import { doc, getDocs, collection, updateDoc, increment, onSnapshot } from 'firebase/firestore';

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
  
  const userId = localStorage.getItem('debugEventUserId');
  const userName = localStorage.getItem('debugEventUserName');
  const lockedLanguage = localStorage.getItem('debugEventLanguage') || 'cpp'; // Default fallback

  const cheatingRef = useRef({ tabSwitches: 0, copyPasteCount: 0 });
  const editorContainerRef = useRef(null);
  const codeRef = useRef(code);

  // Sync state to ref for auto-save and submission closures
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    // 1. Fetch Question
    const fetchQuestion = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          setQuestion({ id: doc.id, ...data });
          
          // Set initial code based on locked language
          if (data.variants && data.variants[lockedLanguage]) {
            setCode(data.variants[lockedLanguage].initialCode || '// No code provided for this language.');
          } else {
             // Fallback for old questions created before Phase 3
            setCode(data.initialCode || '');
          }
        } else {
          setCode('// No questions available. Waiting for admin...');
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
        if (data.status === 'ended') {
          // Event over -> force submit
          handleSubmit(true);
        } else if (data.status === 'active' && data.endTime) {
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
            currentCode: codeRef.current
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
        alert("WARNING: Tab switching detected! This is recorded as a cheating violation.");
        if (userId) {
          await updateDoc(doc(db, 'users', userId), { tabSwitches: increment(1) });
        }
      }
    };

    const handleCopyPaste = async (e) => {
      cheatingRef.current.copyPasteCount += 1;
      alert("WARNING: Copy/Pasting is strictly prohibited!");
      e.preventDefault();
      if (userId) {
        await updateDoc(doc(db, 'users', userId), { copyPasteCount: increment(1) });
      }
    };

    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        cheatingRef.current.tabSwitches += 1;
        alert("WARNING: Exiting Fullscreen is recorded as a violation!");
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
      let compiler = 'gcc-head';
      if (lockedLanguage === 'cpp') compiler = 'gcc-head';
      if (lockedLanguage === 'c') compiler = 'gcc-head-c';
      if (lockedLanguage === 'java') compiler = 'openjdk-head';

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(`${baseUrl}/api/compile`, {
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

    try {
      await updateDoc(doc(db, 'users', userId), {
        score: increment(score),
        isFinished: true,
        finalCode: codeRef.current
      });

      if (isAutoSubmit) {
        alert("TIME IS UP! Your code has been automatically submitted.");
        if (document.fullscreenElement) await document.exitFullscreen();
        navigate('/timer-finished');
      } else {
        alert(isOutputCorrect ? `Success! Output matched. Score awarded: ${score}` : 'Output did not match expected output. Code Submitted.');
        if (document.fullscreenElement) await document.exitFullscreen();
        navigate('/leaderboard');
      }
    } catch (err) {
      console.error("Error submitting:", err);
      alert("Submission failed.");
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

  return (
    <div ref={editorContainerRef} style={{ display: 'flex', flexDirection: 'column', height: isFullScreen ? '100vh' : '90vh', background: 'var(--bg-deep-navy)' }}>
      
      {!isFullScreen && (
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

      <div style={{ display: 'flex', gap: '1rem', flex: 1, padding: '1rem' }}>
        {/* Left Panel: Question */}
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>{question?.title || 'Loading...'}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{question?.description}</p>
          
          <div style={{ marginTop: 'auto' }}>
            <h4 style={{ color: 'var(--accent-pink)', marginBottom: '0.5rem' }}>EXPECTED OUTPUT</h4>
            <pre style={{ background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
              {question?.expectedOutput}
            </pre>
            
            {currentErrorLines.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--accent-cyan)' }}>KNOWN ERROR LINES ({lockedLanguage.toUpperCase()})</h4>
                <p style={{ color: 'var(--text-secondary)' }}>Lines: {currentErrorLines.join(', ')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Middle Panel: Editor */}
        <div className="glass-panel" style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-panel-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
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

        {/* Right Panel: Output */}
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }}>CONSOLE</h3>
          <pre style={{ 
            flex: 1, 
            background: 'var(--bg-deep-navy)', 
            padding: '1rem', 
            borderRadius: '4px', 
            color: output.includes('error') ? 'var(--accent-pink)' : 'var(--text-primary)',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;

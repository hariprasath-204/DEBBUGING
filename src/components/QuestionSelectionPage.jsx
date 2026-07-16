import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { Code } from 'lucide-react';
import { clearAllLocalDrafts } from '../utils/drafts';
import { getNow, syncClock } from '../utils/timeSync';

const QuestionSelectionPage = () => {
  const [loading, setLoading] = useState(true);

  const [questions, setQuestions] = useState({ c: [], cpp: [], python: [], java: [] });
  const [selectedPhase, setSelectedPhase] = useState('c');
  const [popup, setPopup] = useState(null);
  
  const navigate = useNavigate();
  const userId = localStorage.getItem('debugEventUserId');

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    syncClock();

    const unsubEvent = onSnapshot(doc(db, 'settings', 'event'), (eventSnap) => {
      if (eventSnap.exists()) {
        const data = eventSnap.data();
        if (data.status === 'waiting') {
          clearAllLocalDrafts();
          navigate('/waiting');
        } else if (data.status === 'ended' || data.status === 'stopped') {
          navigate('/thank-you');
        } else if (data.status === 'active' && data.endTime) {
          const end = new Date(data.endTime).getTime();
          if (!isNaN(end) && end > 0 && end - getNow() <= 0) {
            updateDoc(doc(db, 'users', userId), { isFinished: true, selectedQuestionId: null }).catch(() => {});
            navigate('/timer-finished');
          }
        }
      }
    });

    const unsubUser = onSnapshot(doc(db, 'users', userId), (userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData && userData.selectedQuestionId) {
          navigate(`/editor/${userData.selectedQuestionId}`);
        }
      }
    });

    const checkState = async () => {
      // Check Event Status
      const eventSnap = await getDoc(doc(db, 'settings', 'event'));
      let isTimeExpired = false;
      if (eventSnap.exists()) {
        const evData = eventSnap.data();
        if (evData.status !== 'active') {
          navigate('/waiting');
          return;
        }
        if (evData.endTime) {
          const end = new Date(evData.endTime).getTime();
          if (!isNaN(end) && end > 0 && end - getNow() <= 0) {
            isTimeExpired = true;
            updateDoc(doc(db, 'users', userId), { isFinished: true, selectedQuestionId: null }).catch(() => {});
            navigate('/timer-finished');
            return;
          }
        }
      }

      // Check User's existing selection
      const userSnap = await getDoc(doc(db, 'users', userId));
      let completedQs = [];
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.selectedQuestionId) {
          navigate(`/editor/${userData.selectedQuestionId}`);
          return;
        }
        completedQs = userData.completedQuestions || [];
      }

      // Fetch all questions and categorize into c, cpp, python, java
      const qSnap = await getDocs(collection(db, 'questions'));
      const phaseMap = { easy: 'c', medium: 'cpp', hard: 'java', c: 'c', cpp: 'cpp', python: 'python', java: 'java' };
      const qData = { c: [], cpp: [], python: [], java: [] };
      let totalQuestionsCount = 0;
      
      qSnap.forEach(doc => {
        const data = doc.data();
        const p = phaseMap[data.phase] || data.phase;
        if (qData[p]) {
          totalQuestionsCount++;
          qData[p].push({ id: doc.id, isCompleted: completedQs.includes(doc.id), ...data, phase: p });
        }
      });

      if (userSnap.exists() && userSnap.data().isFinished) {
        if (totalQuestionsCount > 0 && completedQs.length >= totalQuestionsCount) {
          navigate('/all-completed');
          return;
        } else if (isTimeExpired) {
          navigate('/timer-finished');
          return;
        } else {
          // If time is NOT expired and not all questions are finished, this is a stale isFinished flag from previous run. Auto-heal:
          await updateDoc(doc(db, 'users', userId), { isFinished: false }).catch(() => {});
        }
      }

      if (totalQuestionsCount > 0 && completedQs.length >= totalQuestionsCount) {
        // User has completed all available questions
        await updateDoc(doc(db, 'users', userId), { isFinished: true });
        navigate('/all-completed');
        return;
      }

      setQuestions(qData);
      setLoading(false);
    };

    checkState();

    return () => {
      if (unsubEvent) unsubEvent();
      if (unsubUser) unsubUser();
    };
  }, [navigate, userId]);

  const handleSelectQuestion = (questionId) => {
    setPopup({
      message: "Are you sure you want to select this question? You CANNOT change it later!",
      type: "warning",
      onConfirm: async () => {
        setLoading(true);
        try {
          await updateDoc(doc(db, 'users', userId), {
            selectedQuestionId: questionId,
            currentCode: '',
            clearedErrors: 0,
            totalErrors: 0,
            remainingErrors: 0,
            currentLinesCount: 0,
            targetLinesCount: 0
          });
          navigate(`/editor/${questionId}`);
        } catch (err) {
          console.error(err);
          setPopup({ message: "Failed to lock in question.", type: "error" });
          setLoading(false);
        }
      }
    });
  };

  const isPhaseUnlocked = (phase) => {
    if (phase === 'c') return true;
    if (phase === 'cpp') {
      return questions.c.some(q => q.isCompleted) || questions.c.length === 0;
    }
    if (phase === 'python') {
      const cppUnlocked = questions.c.some(q => q.isCompleted) || questions.c.length === 0;
      return cppUnlocked && (questions.cpp.some(q => q.isCompleted) || questions.cpp.length === 0);
    }
    if (phase === 'java') {
      const cppUnlocked = questions.c.some(q => q.isCompleted) || questions.c.length === 0;
      const pyUnlocked = cppUnlocked && (questions.cpp.some(q => q.isCompleted) || questions.cpp.length === 0);
      return pyUnlocked && (questions.python.some(q => q.isCompleted) || questions.python.length === 0);
    }
    return false;
  };

  if (loading) return <LoadingOverlay isLoading={true} />;

  return (
    <>
    {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} onConfirm={popup.onConfirm} />}
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      
      <div style={{ width: '100%', maxWidth: '1000px' }}>
          <h1 className="gradient-title" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem' }}>SELECT YOUR MISSION</h1>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['c', 'cpp', 'python', 'java'].map(phase => {
              const langLabels = { c: 'C', cpp: 'C++', python: 'PYTHON', java: 'JAVA' };
              const unlocked = isPhaseUnlocked(phase);
              return (
              <button 
                key={phase}
                onClick={() => {
                  if (!unlocked) {
                    const prereq = phase === 'cpp' ? 'C Language' : phase === 'python' ? 'C++ Language' : 'Python Language';
                    setPopup({ message: `🔒 Stage Locked! Complete a mission in ${prereq} first to unlock this stage.`, type: "warning" });
                    return;
                  }
                  setSelectedPhase(phase);
                }}
                style={{
                  padding: '1rem 2.2rem',
                  background: selectedPhase === phase ? 'rgba(0, 240, 255, 0.15)' : unlocked ? 'rgba(22, 32, 87, 0.6)' : 'rgba(15, 23, 48, 0.3)',
                  border: `2px solid ${selectedPhase === phase ? 'var(--accent-cyan)' : unlocked ? 'var(--border-subtle)' : 'rgba(255,255,255,0.08)'}`,
                  color: selectedPhase === phase ? 'var(--accent-cyan)' : unlocked ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  boxShadow: selectedPhase === phase ? '0 0 20px var(--accent-cyan-glow)' : 'none',
                  transition: 'all 0.3s ease',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  opacity: unlocked ? 1 : 0.6
                }}
              >
                {!unlocked && <span style={{ marginRight: '8px' }}>🔒</span>}
                {langLabels[phase]}
              </button>
              );
            })}
          </div>

          {selectedPhase && (
            <div className="glass-panel" style={{ padding: '2rem', animation: 'slideUpFade 0.4s ease forwards' }}>
              <h2 style={{ color: 'var(--accent-cyan)', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                STAGE: {selectedPhase === 'cpp' ? 'C++' : selectedPhase.toUpperCase()} MISSIONS
              </h2>
              
              {questions[selectedPhase].length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No missions available in this sector.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {questions[selectedPhase].map(q => (
                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep-navy)', borderRadius: 'var(--radius-sm)', opacity: q.isCompleted ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                      <div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', textDecoration: q.isCompleted ? 'line-through' : 'none' }}>{q.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '600px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.description}</p>
                        <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: q.isCompleted ? 'var(--text-secondary)' : 'var(--accent-magenta)', border: `1px solid ${q.isCompleted ? 'var(--text-secondary)' : 'var(--accent-magenta)'}`, padding: '2px 8px', borderRadius: '12px' }}>{q.points} POINTS</span>
                      </div>
                      <button 
                        onClick={() => !q.isCompleted && handleSelectQuestion(q.id)} 
                        className={q.isCompleted ? "btn-secondary" : "btn-primary"} 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: q.isCompleted ? 'not-allowed' : 'pointer' }}
                        disabled={q.isCompleted}
                      >
                        {q.isCompleted ? <span style={{ color: 'var(--text-secondary)' }}>COMPLETED</span> : <><Code size={18} /> CODE NOW</>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
    </div>
    </>
  );
};

export default QuestionSelectionPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { Code } from 'lucide-react';

const QuestionSelectionPage = () => {
  const [loading, setLoading] = useState(true);

  const [questions, setQuestions] = useState({ easy: [], medium: [], hard: [] });
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [popup, setPopup] = useState(null);
  
  const navigate = useNavigate();
  const userId = localStorage.getItem('debugEventUserId');
  const [phaseLanguages, setPhaseLanguages] = useState({ easy: 'c', medium: 'cpp', hard: 'java' });

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    const checkState = async () => {
      // Check Event Status
      const eventSnap = await getDoc(doc(db, 'settings', 'event'));
      if (eventSnap.exists() && eventSnap.data().status !== 'active') {
        navigate('/waiting');
        return;
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

      // Fetch phase language configuration from Firestore
      const langConfigSnap = await getDoc(doc(db, 'settings', 'language'));
      let phaseLangs = { easy: 'c', medium: 'cpp', hard: 'java' };
      if (langConfigSnap.exists()) {
        const d = langConfigSnap.data();
        if (d.easy) phaseLangs.easy = d.easy;
        if (d.medium) phaseLangs.medium = d.medium;
        if (d.hard) phaseLangs.hard = d.hard;
        setPhaseLanguages(phaseLangs);
      }

      // Fetch all questions
      const qSnap = await getDocs(collection(db, 'questions'));
      const qData = { easy: [], medium: [], hard: [] };
      let totalQuestionsCount = 0;
      
      qSnap.forEach(doc => {
        const data = doc.data();
        if (data.phase && qData[data.phase]) {
          const expectedLang = phaseLangs[data.phase] || 'cpp';
          const variant = data.variants && data.variants[expectedLang];
          const hasVariant = variant && (variant.initialCode !== '' || variant.correctCode !== '' || variant.errorLines !== '');
          if (!hasVariant) return;

          totalQuestionsCount++;
          qData[data.phase].push({ id: doc.id, isCompleted: completedQs.includes(doc.id), ...data });
        }
      });

      if (userSnap.exists() && userSnap.data().isFinished) {
        if (totalQuestionsCount > 0 && completedQs.length >= totalQuestionsCount) {
          navigate('/all-completed');
        } else {
          navigate('/timer-finished');
        }
        return;
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

  if (loading) return <LoadingOverlay isLoading={true} />;

  return (
    <>
    {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} onConfirm={popup.onConfirm} />}
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      
      <div style={{ width: '100%', maxWidth: '1000px' }}>
          <h1 className="gradient-title" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem' }}>SELECT YOUR MISSION</h1>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
            {['easy', 'medium', 'hard'].map(phase => {
              const langLabel = (phaseLanguages[phase] || '').toUpperCase() === 'CPP' ? 'C++' : (phaseLanguages[phase] || '').toUpperCase();
              return (
              <button 
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                style={{
                  padding: '1rem 2.5rem',
                  background: selectedPhase === phase ? 'rgba(0, 240, 255, 0.15)' : 'rgba(22, 32, 87, 0.6)',
                  border: `2px solid ${selectedPhase === phase ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  color: selectedPhase === phase ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  boxShadow: selectedPhase === phase ? '0 0 20px var(--accent-cyan-glow)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {phase} ({langLabel})
              </button>
              );
            })}
          </div>

          {selectedPhase && (
            <div className="glass-panel" style={{ padding: '2rem', animation: 'slideUpFade 0.4s ease forwards' }}>
              <h2 style={{ color: 'var(--accent-cyan)', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                {selectedPhase} MISSIONS — {phaseLanguages[selectedPhase]?.toUpperCase() === 'CPP' ? 'C++' : phaseLanguages[selectedPhase]?.toUpperCase()} LANGUAGE
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

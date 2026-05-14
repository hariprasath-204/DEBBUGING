import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { Code, Maximize } from 'lucide-react';

const QuestionSelectionPage = () => {
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [questions, setQuestions] = useState({ easy: [], medium: [], hard: [] });
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [popup, setPopup] = useState(null);
  
  const navigate = useNavigate();
  const userId = localStorage.getItem('debugEventUserId');

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
      if (userSnap.exists() && userSnap.data().selectedQuestionId) {
        navigate(`/editor/${userSnap.data().selectedQuestionId}`);
        return;
      }

      // Fetch all questions
      const qSnap = await getDocs(collection(db, 'questions'));
      const qData = { easy: [], medium: [], hard: [] };
      qSnap.forEach(doc => {
        const data = doc.data();
        if (data.phase && qData[data.phase]) {
          qData[data.phase].push({ id: doc.id, ...data });
        }
      });
      setQuestions(qData);
      setLoading(false);
    };

    checkState();

    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [navigate, userId]);

  const enterFullScreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } catch (err) {
      setPopup({ message: 'Failed to enter full screen. Please allow full screen permissions.', type: 'error' });
    }
  };

  const handleSelectQuestion = (questionId) => {
    setPopup({
      message: "Are you sure you want to select this question? You CANNOT change it later!",
      type: "warning",
      onConfirm: async () => {
        setLoading(true);
        try {
          await updateDoc(doc(db, 'users', userId), {
            selectedQuestionId: questionId
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
      
      {!isFullScreen ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px' }}>
          <Maximize size={48} style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }} />
          <h2 className="glow-text-cyan" style={{ marginBottom: '1rem' }}>SYSTEM ACCESS DENIED</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>You must enter Full Screen mode to view the mission briefs and select your target.</p>
          <button onClick={enterFullScreen} className="btn-primary" style={{ width: '100%' }}>ENTER FULL SCREEN</button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          <h1 className="gradient-title" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem' }}>SELECT YOUR MISSION</h1>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
            {['easy', 'medium', 'hard'].map(phase => (
              <button 
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                style={{
                  padding: '1rem 3rem',
                  background: selectedPhase === phase ? 'rgba(0, 240, 255, 0.15)' : 'rgba(22, 32, 87, 0.6)',
                  border: `2px solid ${selectedPhase === phase ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  color: selectedPhase === phase ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.2rem',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  boxShadow: selectedPhase === phase ? '0 0 20px var(--accent-cyan-glow)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {phase}
              </button>
            ))}
          </div>

          {selectedPhase && (
            <div className="glass-panel" style={{ padding: '2rem', animation: 'slideUpFade 0.4s ease forwards' }}>
              <h2 style={{ color: 'var(--accent-cyan)', marginBottom: '1.5rem', textTransform: 'uppercase' }}>{selectedPhase} MISSIONS</h2>
              
              {questions[selectedPhase].length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No missions available in this sector.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {questions[selectedPhase].map(q => (
                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep-navy)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>{q.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '600px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.description}</p>
                        <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-magenta)', border: '1px solid var(--accent-magenta)', padding: '2px 8px', borderRadius: '12px' }}>{q.points} POINTS</span>
                      </div>
                      <button onClick={() => handleSelectQuestion(q.id)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Code size={18} /> CODE NOW
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default QuestionSelectionPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { sortParticipants, getStudentCategory, getSortedParticipantsByCategory } from '../utils/ranking';
import { Trophy, Award, Clock, Code, ShieldAlert, Sparkles, RefreshCw, ArrowLeft, GraduationCap } from 'lucide-react';

const MEDAL_INFO = [
  { rank: 1, medal: '🥇', title: 'CHAMPION (1ST PLACE)', color: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)', height: '440px', order: 2 },
  { rank: 2, medal: '🥈', title: 'RUNNER UP (2ND PLACE)', color: '#C0C0C0', glow: 'rgba(192, 192, 192, 0.35)', height: '390px', order: 1 },
  { rank: 3, medal: '🥉', title: 'SECOND RUNNER UP (3RD PLACE)', color: '#CD7F32', glow: 'rgba(205, 127, 50, 0.35)', height: '360px', order: 3 }
];

const TopWinnersPage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [category, setCategory] = useState('ALL'); // 'ALL', 'UG', 'PG'
  const [loading, setLoading] = useState(true);
  const [revealedIndex, setRevealedIndex] = useState(-1);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const fetchedUsers = [];
      snap.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() });
      });

      const sorted = sortParticipants(fetchedUsers);
      setAllUsers(sorted);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching top winners:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const users = getSortedParticipantsByCategory(allUsers, category).slice(0, 3);

  const triggerRevealSequence = () => {
    setRevealedIndex(-1);
    setTimeout(() => setRevealedIndex(3), 300); // Reveal 3rd
    setTimeout(() => setRevealedIndex(2), 1100); // Reveal 2nd
    setTimeout(() => setRevealedIndex(1), 2200); // Reveal 1st Champion!
  };

  useEffect(() => {
    if (!loading && users.length > 0) {
      triggerRevealSequence();
    }
  }, [loading, category, allUsers.length]);

  const handleCategorySwitch = (newCat) => {
    setCategory(newCat);
    triggerRevealSequence();
  };

  const formatTime = (ms) => {
    if (!ms) return 'N/A';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const ugCount = getSortedParticipantsByCategory(allUsers, 'UG').length;
  const pgCount = getSortedParticipantsByCategory(allUsers, 'PG').length;
  const allCount = getSortedParticipantsByCategory(allUsers, 'ALL').length;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden', overflowY: 'auto' }}>
      <style>{`
        /* Cyberpunk Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(10, 15, 30, 0.8);
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, var(--accent-cyan), var(--accent-magenta));
          border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #00f0ff, #ff007f);
          box-shadow: 0 0 10px var(--accent-cyan);
        }
      `}</style>
      {/* Cyberpunk Title Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', zIndex: 10 }}>
        <div style={{ display: 'inline-block', padding: '6px 18px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '30px', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '3px', marginBottom: '1rem' }}>
          CODATHAN HALL OF FAME
        </div>
        <h1 className="glow-text-cyan" style={{ fontSize: '3.2rem', letterSpacing: '6px', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>
          {category === 'UG' ? '🎓 UG TOP 3 WINNERS SHOWCASE' : category === 'PG' ? '🎖️ PG TOP 3 WINNERS SHOWCASE' : '🏆 GLOBAL TOP 3 WINNERS SHOWCASE'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '750px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
          {category === 'UG' ? 'Top Undergraduate Champions (UCA Series e.g. 24UCA101)' : category === 'PG' ? 'Top Postgraduate Champions (PCA Series e.g. 25PCA101, 26PCA101)' : 'Overall Top 3 Champions across all departments and degree categories.'}
        </p>

        {/* Category Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleCategorySwitch('ALL')}
            style={{
              padding: '12px 26px',
              borderRadius: '30px',
              border: '1px solid var(--accent-cyan)',
              background: category === 'ALL' ? 'var(--accent-cyan)' : 'rgba(0, 240, 255, 0.05)',
              color: category === 'ALL' ? 'var(--bg-deep-navy)' : 'var(--accent-cyan)',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: category === 'ALL' ? '0 0 20px rgba(0, 240, 255, 0.5)' : 'none'
            }}
          >
            🌐 GLOBAL TOP 3 ({allCount})
          </button>

          <button
            onClick={() => handleCategorySwitch('UG')}
            style={{
              padding: '12px 26px',
              borderRadius: '30px',
              border: '1px solid #00f0ff',
              background: category === 'UG' ? 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)' : 'rgba(0, 240, 255, 0.05)',
              color: category === 'UG' ? '#040711' : '#00f0ff',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: category === 'UG' ? '0 0 20px rgba(0, 240, 255, 0.5)' : 'none'
            }}
          >
            <GraduationCap size={19} /> UG TOP 3 ({ugCount})
          </button>

          <button
            onClick={() => handleCategorySwitch('PG')}
            style={{
              padding: '12px 26px',
              borderRadius: '30px',
              border: '1px solid #ff00ff',
              background: category === 'PG' ? 'linear-gradient(135deg, #ff00ff 0%, #9d00ff 100%)' : 'rgba(255, 0, 255, 0.05)',
              color: category === 'PG' ? '#040711' : '#ff00ff',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: category === 'PG' ? '0 0 20px rgba(255, 0, 255, 0.5)' : 'none'
            }}
          >
            <Award size={19} /> PG TOP 3 ({pgCount})
          </button>
        </div>
      </div>

      {/* Podium Stage Layout */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '1.3rem' }}>
          Scanning system records and verifying official evaluations...
        </div>
      ) : users.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '1.2rem', padding: '3rem', textAlign: 'center' }}>
          No participants found in {category === 'UG' ? 'the UG category (UCA format like 24UCA101)' : category === 'PG' ? 'the PG category (PCA format like 25PCA101)' : 'the competition'} yet!
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '2rem', maxWidth: '1250px', margin: '0 auto', flex: 1, paddingBottom: '3rem', zIndex: 10 }}>
          {MEDAL_INFO.map((info, idx) => {
            const user = users[info.rank - 1];
            const isRevealed = revealedIndex === -1 || revealedIndex <= info.rank || (revealedIndex === 1 && info.rank === 1);
            const isChampion = info.rank === 1;

            const categoryPrefix = category === 'UG' ? 'UG ' : category === 'PG' ? 'PG ' : '';
            const displayTitle = `${categoryPrefix}${info.title}`;

            if (!user) {
              return (
                <div key={info.rank} style={{ order: info.order, width: '360px', height: info.height, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${info.color}44`, borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.6 }}>
                  <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>{info.medal}</span>
                  <span style={{ color: info.color, fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center', padding: '0 1rem' }}>{displayTitle}</span>
                  <span style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Awaiting Participant...</span>
                </div>
              );
            }

            const hasWarnings = (user.tabSwitches || 0) > 0 || (user.copyPasteCount || 0) > 0;
            const cat = getStudentCategory(user.rollNo);

            return (
              <div
                key={user.id}
                style={{
                  order: info.order,
                  width: isChampion ? '400px' : '360px',
                  height: info.height,
                  background: isChampion ? 'rgba(20, 28, 45, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                  border: `2px solid ${info.color}`,
                  borderRadius: '20px',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: `0 0 35px ${info.glow}, inset 0 0 20px ${info.glow}`,
                  position: 'relative',
                  transform: isChampion ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: isRevealed ? 1 : 0.2,
                  filter: isRevealed ? 'none' : 'blur(6px)'
                }}
                className="winner-card"
              >
                {/* Top Medal & Title Badge */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: isChampion ? '4rem' : '3.2rem', marginBottom: '0.5rem', filter: `drop-shadow(0 0 15px ${info.color})` }}>
                    {info.medal}
                  </div>
                  <div style={{ color: info.color, fontWeight: '900', fontSize: isChampion ? '1.15rem' : '1rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {displayTitle}
                  </div>
                </div>

                {/* Participant Details */}
                <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: isChampion ? '1.9rem' : '1.6rem', margin: '0 0 0.4rem 0', fontWeight: '800', wordBreak: 'break-word' }}>
                    {user.name || 'Anonymous Coder'}
                  </h2>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
                    <span>ROLL NO / LOT: <strong style={{ color: 'var(--text-primary)' }}>{user.rollNo || 'N/A'}</strong></span>
                    {cat === 'UG' && (
                      <span style={{ padding: '1px 8px', borderRadius: '10px', fontSize: '0.72rem', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid #00f0ff' }}>UG</span>
                    )}
                    {cat === 'PG' && (
                      <span style={{ padding: '1px 8px', borderRadius: '10px', fontSize: '0.72rem', background: 'rgba(255, 0, 255, 0.15)', color: '#ff00ff', border: '1px solid #ff00ff' }}>PG</span>
                    )}
                  </div>
                </div>

                {/* Score & Execution Stats */}
                <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '14px', padding: '1.2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '600' }}>FINAL SCORE</span>
                    <span style={{ color: info.color, fontSize: isChampion ? '2.3rem' : '1.9rem', fontWeight: '900', textShadow: `0 0 12px ${info.glow}` }}>
                      {user.score || 0}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Code size={15} color="var(--accent-cyan)" />
                      <span>Executions:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{user.totalSubmissionsCount || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Clock size={15} color="#FFD700" />
                      <span>Time:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatTime(user.elapsedTimeMs)}</strong>
                    </div>
                  </div>

                  {/* Warning Status */}
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', color: hasWarnings ? 'var(--accent-pink)' : '#10B981' }}>
                    <ShieldAlert size={14} />
                    {hasWarnings ? (
                      <span>Tabs Switched: {user.tabSwitches || 0} (-{(user.tabSwitches || 0) * 2} pts)</span>
                    ) : (
                      <span style={{ fontWeight: 'bold' }}>✓ Clean Status (No Tab Switches)</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Reveal Button */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', marginBottom: '3rem', zIndex: 10 }}>
        <button 
          onClick={triggerRevealSequence}
          className="btn-primary" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '16px 38px', 
            fontSize: '1.15rem', 
            fontWeight: 'bold', 
            letterSpacing: '2px',
            boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)',
            borderRadius: '40px',
            cursor: 'pointer'
          }}
        >
          <Sparkles size={22} /> 🎉 LAUNCH WINNER REVEAL
        </button>
      </div>

      {/* Background Cyberpunk Spotlight Glow */}
      <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '600px', background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, rgba(255, 0, 255, 0.08) 50%, transparent 70%)', filter: 'blur(80px)', zIndex: 1, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '20%', width: '500px', height: '400px', background: 'radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%)', filter: 'blur(70px)', zIndex: 1, pointerEvents: 'none' }}></div>
    </div>
  );
};

export default TopWinnersPage;

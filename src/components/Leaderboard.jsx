import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { sortParticipants, getStudentCategory, getSortedParticipantsByCategory } from '../utils/ranking';
import { Trophy, Sparkles, GraduationCap, Award } from 'lucide-react';

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const Leaderboard = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL', 'UG', 'PG'
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() });
      });

      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching leaderboard: ', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const intervalId = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Trigger reveal after data loads
  useEffect(() => {
    if (!loading && allUsers.length > 0) {
      setTimeout(() => setRevealed(true), 100);
    }
  }, [loading, allUsers]);

  const handleCategoryChange = (cat) => {
    setRevealed(false);
    setCategoryFilter(cat);
    setTimeout(() => setRevealed(true), 60);
  };

  const displayedUsers = getSortedParticipantsByCategory(allUsers, categoryFilter);

  const ugCount = getSortedParticipantsByCategory(allUsers, 'UG').length;
  const pgCount = getSortedParticipantsByCategory(allUsers, 'PG').length;
  const allCount = getSortedParticipantsByCategory(allUsers, 'ALL').length;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1150px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="glow-text-cyan" style={{ margin: 0, fontSize: '2.5rem', letterSpacing: '4px' }}>
              {categoryFilter === 'UG' ? '🎓 UG LEADERBOARD' : categoryFilter === 'PG' ? '🎖️ PG LEADERBOARD' : '🏆 GLOBAL LEADERBOARD'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem', letterSpacing: '1px' }}>
              {categoryFilter === 'UG' ? 'Undergraduate Students (UCA Series e.g. 24UCA101)' : categoryFilter === 'PG' ? 'Postgraduate Students (PCA Series e.g. 25PCA101, 26PCA101)' : 'All Registered Participants (UG & PG Combined)'}
            </p>
          </div>
          <Link to="/winners" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '0.95rem', textDecoration: 'none' }}>
            <Sparkles size={18} /> 🏆 TOP 3 WINNERS SHOWCASE
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleCategoryChange('ALL')}
            style={{
              padding: '10px 20px',
              borderRadius: '30px',
              border: '1px solid var(--accent-cyan)',
              background: categoryFilter === 'ALL' ? 'var(--accent-cyan)' : 'rgba(0, 240, 255, 0.05)',
              color: categoryFilter === 'ALL' ? 'var(--bg-deep-navy)' : 'var(--accent-cyan)',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.25s ease',
              boxShadow: categoryFilter === 'ALL' ? '0 0 16px rgba(0, 240, 255, 0.4)' : 'none'
            }}
          >
            🌐 ALL PARTICIPANTS ({allCount})
          </button>

          <button
            onClick={() => handleCategoryChange('UG')}
            style={{
              padding: '10px 20px',
              borderRadius: '30px',
              border: '1px solid #00f0ff',
              background: categoryFilter === 'UG' ? 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)' : 'rgba(0, 240, 255, 0.05)',
              color: categoryFilter === 'UG' ? '#040711' : '#00f0ff',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.25s ease',
              boxShadow: categoryFilter === 'UG' ? '0 0 16px rgba(0, 240, 255, 0.4)' : 'none'
            }}
          >
            <GraduationCap size={17} /> UG LEADERBOARD ({ugCount})
          </button>

          <button
            onClick={() => handleCategoryChange('PG')}
            style={{
              padding: '10px 20px',
              borderRadius: '30px',
              border: '1px solid #ff00ff',
              background: categoryFilter === 'PG' ? 'linear-gradient(135deg, #ff00ff 0%, #9d00ff 100%)' : 'rgba(255, 0, 255, 0.05)',
              color: categoryFilter === 'PG' ? '#040711' : '#ff00ff',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.25s ease',
              boxShadow: categoryFilter === 'PG' ? '0 0 16px rgba(255, 0, 255, 0.4)' : 'none'
            }}
          >
            <Award size={17} /> PG LEADERBOARD ({pgCount})
          </button>
        </div>

        <style>{`
          /* Cyberpunk Custom Scrollbar */
          .table-scroll-container::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .table-scroll-container::-webkit-scrollbar-track {
            background: rgba(10, 15, 30, 0.85);
            border-radius: 8px;
          }
          .table-scroll-container::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, var(--accent-cyan), var(--accent-primary));
            border-radius: 8px;
            border: 2px solid rgba(10, 15, 30, 0.85);
          }
          .table-scroll-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #00f0ff, #ff007f);
            box-shadow: 0 0 12px var(--accent-cyan);
          }

          @keyframes slideInFromBottom {
            from { opacity: 0; transform: translateY(25px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .lb-row {
            opacity: 0;
            transform: translateY(25px);
          }
          .lb-row.visible {
            animation: slideInFromBottom 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .rank-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 38px; height: 38px;
            border-radius: 50%;
            font-weight: bold;
            font-size: 1rem;
          }
        `}</style>

        <div className="glass-panel table-scroll-container" style={{ overflowY: 'auto', overflowX: 'auto', maxHeight: 'calc(100vh - 220px)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-panel-hover)', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)' }}>
              <tr style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', letterSpacing: '1px' }}>
                <th style={{ padding: '1rem' }}>RANK</th>
                <th style={{ padding: '1rem' }}>NAME</th>
                <th style={{ padding: '1rem' }}>ROLL NO / CATEGORY</th>
                <th style={{ padding: '1rem' }}>SCORE</th>
                <th style={{ padding: '1rem' }}>EXECS</th>
                <th style={{ padding: '1rem' }}>TIME TAKEN</th>
                <th style={{ padding: '1rem' }}>WARNINGS</th>
                <th style={{ padding: '1rem' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Data...</td></tr>
              ) : displayedUsers.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No participants found in {categoryFilter === 'UG' ? 'UG (UCA series)' : categoryFilter === 'PG' ? 'PG (PCA series)' : 'this category'}.</td></tr>
              ) : (
                // Render top-to-bottom (Rank #1 at the top down to #last at the bottom)
                displayedUsers.map((user, index) => {
                  const hasWarnings = (user.tabSwitches || 0) > 0 || (user.copyPasteCount || 0) > 0;
                  const isTop3 = index < 3;
                  const rank = index + 1;
                  const cat = getStudentCategory(user.rollNo);

                  // Cascade delay for top-to-bottom reveal
                  const delay = Math.min(index * 50, 1000);

                  let rowBg = 'transparent';
                  if (index === 0) rowBg = 'rgba(255, 215, 0, 0.08)';
                  else if (index === 1) rowBg = 'rgba(192, 192, 192, 0.06)';
                  else if (index === 2) rowBg = 'rgba(205, 127, 50, 0.06)';

                  return (
                    <tr
                      key={user.id}
                      className={`lb-row${revealed ? ' visible' : ''}`}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: rowBg,
                        animationDelay: `${delay}ms`,
                      }}
                    >
                      {/* RANK */}
                      <td style={{ padding: '1rem' }}>
                        {isTop3 ? (
                          <span className="rank-badge" style={{
                            background: `${MEDAL_COLORS[index]}22`,
                            border: `2px solid ${MEDAL_COLORS[index]}`,
                            color: MEDAL_COLORS[index],
                            fontSize: '1.2rem'
                          }}>
                            {MEDAL[index]}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>#{rank}</span>
                        )}
                      </td>

                      {/* NAME */}
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: isTop3 ? MEDAL_COLORS[index] : 'var(--text-primary)', fontSize: isTop3 ? '1.05rem' : '1rem' }}>
                        {user.name || 'Anonymous'}
                      </td>

                      {/* ROLL NO & CATEGORY BADGE */}
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{user.rollNo || 'N/A'}</span>
                        {cat === 'UG' && (
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 'bold', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid #00f0ff' }}>
                            UG
                          </span>
                        )}
                        {cat === 'PG' && (
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 'bold', background: 'rgba(255, 0, 255, 0.15)', color: '#ff00ff', border: '1px solid #ff00ff' }}>
                            PG
                          </span>
                        )}
                      </td>

                      {/* SCORE */}
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: (user.score || 0) < 0 ? 'var(--accent-magenta)' : 'var(--text-primary)' }}>
                        {user.score !== undefined ? user.score : 0}
                      </td>

                      {/* EXECS */}
                      <td style={{ padding: '1rem', color: 'var(--accent-cyan)' }}>
                        {user.totalSubmissionsCount || 0}
                      </td>

                      {/* TIME TAKEN */}
                      <td style={{ padding: '1rem' }}>
                        {user.elapsedTimeMs ? (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {Math.floor(user.elapsedTimeMs / 60000)}m {Math.floor((user.elapsedTimeMs % 60000) / 1000)}s
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                        )}
                      </td>

                      {/* WARNINGS */}
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: hasWarnings ? 'var(--accent-pink)' : 'var(--text-secondary)' }}>
                        Tabs: {user.tabSwitches || 0} (-{(user.tabSwitches || 0) * 2} pts) / Copy: {user.copyPasteCount || 0}
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: '1rem' }}>
                        {user.isFinished ? (
                          <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ FINISHED</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>ACTIVE</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

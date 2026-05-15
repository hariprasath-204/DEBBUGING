import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() });
      });

      // ── Ranking logic ──────────────────────────────────────────────
      fetchedUsers.sort((a, b) => {
        // 0. Cheaters always go to the bottom
        const aCheated = a.tabSwitches > 2 || a.copyPasteCount > 2;
        const bCheated = b.tabSwitches > 2 || b.copyPasteCount > 2;
        if (aCheated && !bCheated) return 1;
        if (!aCheated && bCheated) return -1;

        // 1. Most errors fixed (cumulative across all questions)
        const aCleared = (a.cumulativeClearedErrors || 0) + (a.clearedErrors || 0);
        const bCleared = (b.cumulativeClearedErrors || 0) + (b.clearedErrors || 0);
        if (bCleared !== aCleared) return bCleared - aCleared;

        // 2. Higher score
        if (b.score !== a.score) return b.score - a.score;

        // 3. Lines closest to original (smaller difference = better)
        const aLineDiff = Math.abs((a.currentLinesCount || 0) - (a.targetLinesCount || 0));
        const bLineDiff = Math.abs((b.currentLinesCount || 0) - (b.targetLinesCount || 0));
        if (aLineDiff !== bLineDiff) return aLineDiff - bLineDiff;

        // 4. Fastest time (lower elapsedTimeMs = better)
        const aTime = a.elapsedTimeMs || Infinity;
        const bTime = b.elapsedTimeMs || Infinity;
        return aTime - bTime;
      });

      setUsers(fetchedUsers);
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

  // Trigger bottom-to-top reveal after data loads
  useEffect(() => {
    if (!loading && users.length > 0) {
      setTimeout(() => setRevealed(true), 100);
    }
  }, [loading, users]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
      <h1 className="glow-text-cyan" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', letterSpacing: '4px' }}>
        🏆 GLOBAL LEADERBOARD
      </h1>

      <style>{`
        @keyframes slideInFromBottom {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lb-row {
          opacity: 0;
          transform: translateY(40px);
        }
        .lb-row.visible {
          animation: slideInFromBottom 0.5s ease forwards;
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

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-panel-hover)', color: 'var(--accent-cyan)', fontSize: '0.85rem', letterSpacing: '1px' }}>
              <th style={{ padding: '1rem' }}>RANK</th>
              <th style={{ padding: '1rem' }}>NAME</th>
              <th style={{ padding: '1rem' }}>ROLL NO</th>
              <th style={{ padding: '1rem' }}>SCORE</th>
              <th style={{ padding: '1rem' }}>TIME TAKEN</th>
              <th style={{ padding: '1rem' }}>WARNINGS</th>
              <th style={{ padding: '1rem' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Data...</td></tr>
            ) : (
              // Reverse to render bottom-to-top (last in DOM = lowest rank, reveals first)
              [...users].reverse().map((user, revIdx) => {
                const index = users.length - 1 - revIdx; // actual rank index
                const isCheater = user.tabSwitches > 2 || user.copyPasteCount > 2;
                const isTop3 = index < 3 && !isCheater;
                const rank = index + 1;

                // Delay: rank #last reveals first (delay=0), rank #1 reveals last
                const delay = (revIdx * 120);

                let rowBg = 'transparent';
                if (isCheater) rowBg = 'rgba(255, 42, 109, 0.08)';
                else if (index === 0) rowBg = 'rgba(255, 215, 0, 0.08)';
                else if (index === 1) rowBg = 'rgba(192, 192, 192, 0.06)';
                else if (index === 2) rowBg = 'rgba(205, 127, 50, 0.06)';

                const totalCleared = (user.cumulativeClearedErrors || 0) + (user.clearedErrors || 0);
                const totalErrors  = (user.cumulativeTotalErrors  || 0) + (user.totalErrors  || 0);
                const lineDiff     = Math.abs((user.currentLinesCount || 0) - (user.targetLinesCount || 0));

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
                        <span style={{ color: 'var(--text-secondary)' }}>#{rank}</span>
                      )}
                    </td>

                    {/* NAME */}
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: isTop3 ? MEDAL_COLORS[index] : 'var(--text-primary)', fontSize: isTop3 ? '1.05rem' : '1rem' }}>
                      {user.name}
                    </td>

                    {/* ROLL NO */}
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.rollNo}</td>

                    {/* SCORE */}
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: user.score < 0 ? 'var(--accent-magenta)' : 'var(--text-primary)' }}>
                      {user.score}
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
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: isCheater ? 'var(--accent-magenta)' : 'var(--text-secondary)' }}>
                      Tabs: {user.tabSwitches || 0} / Copy: {user.copyPasteCount || 0}
                    </td>

                    {/* STATUS */}
                    <td style={{ padding: '1rem' }}>
                      {isCheater ? (
                        <span style={{ color: 'var(--accent-pink)', fontWeight: 'bold', fontSize: '0.8rem' }}>DISQUALIFIED</span>
                      ) : user.isFinished ? (
                        <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>✓ FINISHED</span>
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
  );
};

export default Leaderboard;

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("score", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedUsers = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push({ id: doc.id, ...doc.data() });
        });
        
        // Custom sort: Cheaters at the bottom
        fetchedUsers.sort((a, b) => {
          const aCheated = a.tabSwitches > 2 || a.copyPasteCount > 2;
          const bCheated = b.tabSwitches > 2 || b.copyPasteCount > 2;
          
          if (aCheated && !bCheated) return 1;
          if (!aCheated && bCheated) return -1;
          
          const aCleared = (a.cumulativeClearedErrors || 0) + (a.clearedErrors || 0);
          const bCleared = (b.cumulativeClearedErrors || 0) + (b.clearedErrors || 0);
          
          if (bCleared !== aCleared) {
            return bCleared - aCleared; // Highest cleared errors first
          }
          
          if (b.score !== a.score) {
            return b.score - a.score; // Tie-breaker 1: Score
          }

          // Tie-breaker 2: Time taken (faster is better)
          // Default to Infinity if they haven't submitted yet
          const aTime = a.elapsedTimeMs || Infinity;
          const bTime = b.elapsedTimeMs || Infinity;
          return aTime - bTime;
        });

        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching leaderboard: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    
    // Refresh every 10 seconds automatically
    const intervalId = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 className="glow-text-cyan" style={{ textAlign: 'center', marginBottom: '2rem' }}>GLOBAL LEADERBOARD</h1>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-panel-hover)', color: 'var(--accent-cyan)' }}>
              <th style={{ padding: '1rem' }}>RANK</th>
              <th style={{ padding: '1rem' }}>NAME</th>
              <th style={{ padding: '1rem' }}>ROLL NO</th>
              <th style={{ padding: '1rem' }}>ERRORS FIXED</th>
              <th style={{ padding: '1rem' }}>LINES</th>
              <th style={{ padding: '1rem' }}>SCORE</th>
              <th style={{ padding: '1rem' }}>TIME TAKEN</th>
              <th style={{ padding: '1rem' }}>WARNINGS</th>
              <th style={{ padding: '1rem' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center' }}>Loading Data...</td></tr>
            ) : (
              users.map((user, index) => {
                const isCheater = user.tabSwitches > 2 || user.copyPasteCount > 2;
                const isTop3 = index < 3 && !isCheater;
                
                let rowStyle = { borderBottom: '1px solid var(--border-subtle)' };
                if (isCheater) {
                  rowStyle.background = 'rgba(255, 42, 109, 0.1)';
                  rowStyle.color = 'var(--accent-pink)';
                } else if (isTop3) {
                  rowStyle.background = 'rgba(5, 217, 232, 0.1)';
                }

                return (
                  <tr key={user.id} style={rowStyle}>
                    <td style={{ padding: '1rem' }}>
                      {isTop3 ? <span className="glow-text-cyan">#{index + 1}</span> : `#${index + 1}`}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{user.name}</td>
                    <td style={{ padding: '1rem' }}>{user.rollNo}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                        {(user.cumulativeClearedErrors || 0) + (user.clearedErrors || 0)}
                      </span> / {(user.cumulativeTotalErrors || 0) + (user.totalErrors || 0)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ color: user.currentLinesCount > user.targetLinesCount ? 'var(--accent-magenta)' : 'var(--accent-cyan)' }}>
                        {user.currentLinesCount || 0}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}> / {user.targetLinesCount || 0}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>{user.score}</td>
                    <td style={{ padding: '1rem' }}>
                      {user.elapsedTimeMs ? (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {Math.floor(user.elapsedTimeMs / 60000)}m {Math.floor((user.elapsedTimeMs % 60000) / 1000)}s
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      Tab Switches: {user.tabSwitches || 0} <br/>
                      Copy/Paste: {user.copyPasteCount || 0}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isCheater ? (
                        <span style={{ color: 'var(--accent-pink)', fontWeight: 'bold' }}>DISQUALIFIED</span>
                      ) : (
                        <span style={{ color: 'var(--accent-cyan)' }}>ACTIVE</span>
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

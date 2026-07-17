/**
 * Authoritative global sorting logic for CODATHAN Leaderboard and Winner Showcase.
 * 
 * Sorting Criteria (in exact priority order):
 * 1. Tab Switches Penalty: Participants with ANY tab switches (tabSwitches > 0) go LAST.
 * 2. Score: Higher score ranks above lower score.
 * 3. Number of Executions: Fewer submissions / executions (totalSubmissionsCount) ranks higher.
 * 4. Total Timing Consumed: Faster total time taken (elapsedTimeMs) ranks higher.
 */
export function sortParticipants(users) {
  return [...users].sort((a, b) => {
    // 0. Tab switches penalty: any tab switch (> 0) pushes participant behind clean participants
    const aTabs = (a.tabSwitches || 0) > 0 ? 1 : 0;
    const bTabs = (b.tabSwitches || 0) > 0 ? 1 : 0;
    if (aTabs !== bTabs) {
      return aTabs - bTabs; // 0 (no tab switches) comes before 1 (has tab switches)
    }

    // 1. Higher score first
    const aScore = a.score || 0;
    const bScore = b.score || 0;
    if (bScore !== aScore) {
      return bScore - aScore;
    }

    // 2. Number of executions (totalSubmissionsCount) - fewer executions first
    const aSubs = a.totalSubmissionsCount || 0;
    const bSubs = b.totalSubmissionsCount || 0;
    if (aSubs !== bSubs) {
      return aSubs - bSubs;
    }

    // 3. Total timing consumed (elapsedTimeMs) - faster time first
    const aTime = a.elapsedTimeMs || Infinity;
    const bTime = b.elapsedTimeMs || Infinity;
    return aTime - bTime;
  });
}

/**
 * Determines the student category ('UG' or 'PG') based on roll number format.
 * UG: e.g. 24UCA101 (contains 'UCA' or starts with digits + 'U')
 * PG: e.g. 25PCA101, 26PCA101 (contains 'PCA' or starts with digits + 'P')
 */
export function getStudentCategory(rollNo) {
  if (!rollNo) return 'OTHER';
  const clean = String(rollNo).trim().toUpperCase();
  // Check PCA / PG series
  if (clean.includes('PCA') || /^\d*PCA/.test(clean) || /PCA/.test(clean)) {
    return 'PG';
  }
  // Check UCA / UG series
  if (clean.includes('UCA') || /^\d*UCA/.test(clean) || /UCA/.test(clean)) {
    return 'UG';
  }
  // Fallback pattern matching for standard college roll numbers: digits followed by U/P
  if (/^\d+U/i.test(clean)) return 'UG';
  if (/^\d+P/i.test(clean)) return 'PG';
  return 'OTHER';
}

/**
 * Filters participants by category ('ALL', 'UG', 'PG') and sorts them using sortParticipants.
 */
export function getSortedParticipantsByCategory(users, category = 'ALL') {
  let filtered = users;
  if (category === 'UG' || category === 'PG') {
    filtered = users.filter(u => getStudentCategory(u.rollNo) === category);
  }
  return sortParticipants(filtered);
}


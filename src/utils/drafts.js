/**
 * Helper utilities for cleaning up local storage drafts across round resets and event starts.
 */

export function clearAllLocalDrafts() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('codathan_draft_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Error clearing local drafts:', err);
  }
}

export function clearFullUserSession() {
  try {
    localStorage.removeItem('debugEventUserId');
    localStorage.removeItem('debugEventUserName');
    clearAllLocalDrafts();
  } catch (err) {
    console.warn('Error clearing full user session:', err);
  }
}


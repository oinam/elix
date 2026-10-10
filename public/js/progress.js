// Stars earned on each topic, kept in this browser between visits.

const key = (topic) => `elix-progress-${topic}`;

export function loadProgress(topic) {
  try {
    const saved = JSON.parse(localStorage.getItem(key(topic)));
    if (saved && Array.isArray(saved.done)) return { parts: [], total: 0, ...saved };
  } catch {
    // Missing or unreadable: start fresh.
  }
  return { done: [], parts: [], total: 0 };
}

export function saveProgress(topic, progress) {
  try {
    localStorage.setItem(key(topic), JSON.stringify(progress));
  } catch {
    // Private browsing can block storage; progress just won't be remembered.
  }
}

export function clearProgress(topic) {
  try {
    localStorage.removeItem(key(topic));
  } catch {
    // Nothing to clear.
  }
}

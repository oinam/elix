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

// Fill in the star pills on a menu page, and return how many stars they show.
// <span id="stars-<topic>"> shows one topic: "⭐ 3 of 5".
// <span data-topics="<topic> <topic> …"> adds up a whole book or unit: "⭐ 12".
export function showStars() {
  const seen = new Set();
  const stars = (topic) => {
    seen.add(topic);
    return loadProgress(topic).done.length;
  };
  document.querySelectorAll('[id^="stars-"]').forEach((pill) => {
    const topic = pill.id.slice('stars-'.length);
    const done = stars(topic);
    pill.textContent = `⭐ ${done} of ${loadProgress(topic).total}`;
    pill.hidden = !done;
  });
  document.querySelectorAll('[data-topics]').forEach((pill) => {
    const done = pill.dataset.topics.split(/\s+/).reduce((sum, topic) => sum + stars(topic), 0);
    pill.textContent = `⭐ ${done}`;
    pill.hidden = !done;
  });
  return [...seen].reduce((sum, topic) => sum + loadProgress(topic).done.length, 0);
}

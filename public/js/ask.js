// Ask Cello: a question box in the panel, answered by the Worker at /api/ask
// (worker/index.js). It only appears when the Worker says it's ready, so the
// no-install server (no /api) and a site without a key look the same as before.
//
// The page sends its own title, part names, and Fast facts along with the
// question, so Cello answers about this page.

export async function addAsk({ cello, parts }) {
  const panel = document.querySelector('.panel');
  if (!panel) return;
  try {
    const res = await fetch('/api/ask');
    if (!res.ok || !(await res.json()).ready) return;
  } catch {
    return;
  }

  const section = document.createElement('section');
  section.className = 'chunky ask';
  section.innerHTML = `
    <h2><span class="wavy" style="--wave: var(--blue)">Ask Cello</span></h2>
    <p class="sub">Wondering about something here? Ask me!</p>
    <form class="ask-form">
      <input type="text" name="question" maxlength="200" autocomplete="off" required
             placeholder="Type your question" aria-label="Your question for Cello">
      <button class="btn press" type="submit">💬 Ask</button>
    </form>
    <p class="answer" aria-live="polite" hidden></p>`;
  // Before “Try this!”, so it’s easy to find.
  const tryThis = panel.querySelector('.try')?.closest('section');
  panel.insertBefore(section, tryThis ?? null);

  const form = section.querySelector('form');
  const input = form.elements.question;
  const button = form.querySelector('button');
  const answerEl = section.querySelector('.answer');

  const context = [
    ...Object.values(parts).map((p) => `${p.name}: ${p.text}`),
    ...[...document.querySelectorAll('.facts li')].map((li) => li.textContent.trim()),
  ].join('\n');
  const topic = document.querySelector('h1')?.textContent.trim() ?? document.title;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    button.disabled = true;
    answerEl.hidden = false;
    answerEl.textContent = 'Thinking…';
    cello.say('Hmm, good question! Let me think…', { mood: 'wow', ms: 0 });
    let answer;
    let ok = false;
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, topic, context }),
      });
      ok = res.ok;
      answer = (await res.json()).answer;
    } catch {
      // Network trouble: fall through to the line below.
    }
    // A failed ask still comes back with a kind line from the Worker.
    answer ||= 'Hmm, I can’t answer right now. Try again in a little while!';
    answerEl.textContent = answer;
    if (ok) cello.say('Here’s what I think! It’s in the Ask Cello box.', { ms: 4000 });
    else cello.say(answer, { ms: 4000 });
    button.disabled = false;
  });
}

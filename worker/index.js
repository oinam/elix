// The site's one bit of server code: Ask Cello. Everything else is a static
// file from public/; wrangler.jsonc only sends /api/* here.
//
//   GET  /api/ask  → { ready }  (is the Anthropic key set?)
//   POST /api/ask  { question, topic, context } → { answer }
//
// The key is a Cloudflare secret (`npx wrangler secret put ANTHROPIC_API_KEY`),
// or ANTHROPIC_API_KEY in mise.local.toml for `mise run dev`. It never reaches
// the browser. Two rate limits keep the bill small: a few questions a minute
// per visitor, and a cap on the whole site.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-5-5';
const MAX_QUESTION = 200;
const MAX_CONTEXT = 2500;

const SYSTEM = `You are Cello, a friendly cartoon cell on ELIx, a science website for a 10-year-old in Grade 5 in India who follows the NCERT syllabus. She is exploring one page and has typed a question.

How to answer:
- At most three short sentences, in everyday words a 10-year-old knows. Plain text only: no lists, no headings, no markdown.
- If you use a science word, explain it once, in brackets.
- Keep the science right, even when it is simple. If you are not sure, say so and suggest she asks her teacher.
- Use the page's own facts, given below, when they help.
- Be warm and curious, never scolding. At most one emoji, at the end.
- If the question isn't about science or this page, say kindly that you're a science cell, and suggest something on the page to try.
- If the question is about something scary or sad, like illness or death, answer calmly and gently, and suggest she talks with a grown-up she trusts.
- Never ask for, or repeat, her name, school, address, or any other personal detail. Don't mention other websites or apps.
- Use American spelling.`;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

// Lines Cello says when there's no real answer. Curly quotes: she reads these.
const SAY = {
  off: 'My thinking cap is off right now. Try exploring the page instead!',
  busy: 'Phew, so many questions! Let’s wait a minute, then ask again.',
  empty: 'Type a question first, then press Ask.',
  long: 'That’s a long one! Can you ask it in fewer words?',
  oops: 'Hmm, I can’t answer right now. Try again in a little while!',
  pass: 'That’s one for a grown-up you trust. Let’s get back to our science!',
};

async function ask(request, env) {
  const ready = Boolean(env.ANTHROPIC_API_KEY);
  if (request.method === 'GET') return json({ ready });
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!ready) return json({ answer: SAY.off }, 503);

  // Only the site's own pages may ask.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'origin' }, 403);

  const visitor = request.headers.get('CF-Connecting-IP') ?? 'local';
  const limits = [env.ASK_PER_VISITOR?.limit({ key: visitor }), env.ASK_SITE?.limit({ key: 'site' })];
  if ((await Promise.all(limits)).some((r) => r && !r.success)) return json({ answer: SAY.busy }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ answer: SAY.empty }, 400);
  }
  const question = String(body.question ?? '').trim();
  if (!question) return json({ answer: SAY.empty }, 400);
  if (question.length > MAX_QUESTION) return json({ answer: SAY.long }, 400);
  const topic = String(body.topic ?? '').slice(0, 100);
  const context = String(body.context ?? '').slice(0, MAX_CONTEXT);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `<page title="${topic.replace(/"/g, '')}">\n${context}\n</page>\n\n<question>${question}</question>`,
      }],
    });
    if (message.stop_reason === 'refusal') return json({ answer: SAY.pass });
    const answer = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return json({ answer: answer || SAY.oops });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ answer: SAY.busy }, 429);
    console.error('Ask Cello failed:', error instanceof Anthropic.APIError ? error.status : error.name);
    return json({ answer: SAY.oops }, 502);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/ask') return ask(request, env);
    if (pathname.startsWith('/api/')) return json({ error: 'not found' }, 404);
    return env.ASSETS.fetch(request);
  },
};

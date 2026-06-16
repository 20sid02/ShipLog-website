// Shiplog API Worker — deploy to Cloudflare Workers
// Keys are stored as Worker Secrets (Dashboard → Workers → Settings → Variables)
// Never hardcode keys here.
//
// Secrets to add:
//   GROQ_KEY   — from console.groq.com/keys
//   LOOPS_KEY  — from loops.so → Settings → API

const LOOPS_LIST_ID = 'cmqgtvwml02qu0j0o0sff0jk5';

const CORS = {
  'Access-Control-Allow-Origin': 'https://shiplogbeta.arksoft.xyz',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function preflight() {
  return new Response(null, { headers: CORS });
}

// ── /api/generate ────────────────────────────────────────────────────────────
async function handleGenerate(request, env) {
  const { title, body } = await request.json();
  if (!title) return json({ error: 'title is required' }, 400);

  const prompt = `You are a technical writer converting a GitHub pull request into a single customer-facing changelog entry.

PR Title: ${title}${body ? `\nPR Description:\n${body}` : ''}

Respond with ONLY a JSON object — no markdown, no code fences — with these exact keys:
- "category": one of "New", "Improved", "Fixed", "Infrastructure"
- "title": a short, punchy customer-facing headline (max 10 words, no "we" or "I")
- "body": 2–3 sentences explaining the benefit to the user in plain language. No jargon. No mention of PRs or internal details.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: err?.error?.message || `Groq error ${res.status}` }, 502);
  }

  let data = await res.json();
  if (typeof data === 'string') data = JSON.parse(data);

  const raw = data?.choices?.[0]?.message?.content || '';
  const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
  if (!match) return json({ error: 'Model did not return valid JSON' }, 502);

  const parsed = JSON.parse(match[0]);
  return json({
    category: parsed.category || 'New',
    title:    parsed.title    || parsed.headline    || '',
    body:     parsed.body     || parsed.description || '',
  });
}

// ── /api/signup ───────────────────────────────────────────────────────────────
async function handleSignup(request, env) {
  const { email, betaType } = await request.json();
  if (!email) return json({ error: 'email is required' }, 400);

  await fetch('https://app.loops.so/api/v1/contacts/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.LOOPS_KEY}`,
    },
    body: JSON.stringify({
      email,
      source: 'landing-page',
      userGroup: betaType,
      mailingLists: { [LOOPS_LIST_ID]: true },
    }),
  });

  return json({ ok: true });
}

// ── Router ───────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return preflight();

    const { pathname } = new URL(request.url);

    if (request.method === 'POST') {
      if (pathname === '/api/generate') return handleGenerate(request, env);
      if (pathname === '/api/signup')   return handleSignup(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

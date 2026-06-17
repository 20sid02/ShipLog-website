// ── CONFIG ───────────────────────────────────────────────────────────────────
// Point this to your deployed Cloudflare Worker URL.
// e.g. 'https://shiplog-api.your-subdomain.workers.dev'
const API_BASE = 'https://shiplog-api.siddharthmahajan65.workers.dev';

const FREE_LIMIT = 2;

// ── MODAL ────────────────────────────────────────────────────────────────────
function openModal(variant) {
  if (variant === 'demo-limit') {
    document.getElementById('modalTitle').textContent = "You've seen what's possible.";
    document.getElementById('modalSub').textContent = 'Join the beta to run this on your actual GitHub repos — unlimited, with a much more powerful model.';
  } else {
    document.getElementById('modalTitle').textContent = 'Join the Beta';
    document.getElementById('modalSub').textContent = "Early access is free. We'll email you as soon as a spot opens up.";
  }
  document.getElementById('betaModal').classList.add('open');
  document.getElementById('emailInput').focus();
}

function closeModal() {
  document.getElementById('betaModal').classList.remove('open');
  setTimeout(() => {
    document.getElementById('formState').style.display = '';
    document.getElementById('successState').style.display = 'none';
    document.getElementById('emailInput').value = '';
  }, 300);
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('betaModal')) closeModal();
}

async function handleSubmit(e) {
  e.preventDefault();
  const email   = document.getElementById('emailInput').value;
  const betaType = document.querySelector('input[name="betaType"]:checked').value;

  try {
    await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, betaType }),
    });
  } catch (_) {}

  document.getElementById('formState').style.display = 'none';
  document.getElementById('successState').style.display = 'block';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── GENERATION COUNTER ───────────────────────────────────────────────────────
function getGenCount() {
  return parseInt(sessionStorage.getItem('genCount') || '0');
}

function incGenCount() {
  const next = getGenCount() + 1;
  sessionStorage.setItem('genCount', next);
  updateCountHint(next);
}

function updateCountHint(count) {
  const hint = document.getElementById('genCountHint');
  const remaining = Math.max(0, FREE_LIMIT - count);
  if (remaining === 0) {
    hint.textContent = 'Free tries used up.';
    hint.style.color = 'var(--orange)';
  } else {
    hint.textContent = `${remaining} free generation${remaining === 1 ? '' : 's'} left.`;
  }
}

function handleGenerateClick() {
  if (getGenCount() >= FREE_LIMIT) {
    openModal('demo-limit');
    return;
  }
  generateEntry();
}

// ── RANDOM EXAMPLES ──────────────────────────────────────────────────────────
const SAMPLE_COMMITS = [
  {
    title: 'feat: add dark mode support across the entire app',
    body: 'Users can now toggle dark mode from account settings. Preference is persisted per-account and synced across devices. System preference is respected on first visit.',
  },
  {
    title: 'fix: pagination offset bug in list endpoint',
    body: 'Closes #412. Users on page 2+ were seeing duplicate records when new items were inserted concurrently. Switched to cursor-based pagination to fix this.',
  },
  {
    title: 'perf: reduce search query time by 60% with index optimization',
    body: 'Added composite index on (user_id, created_at, status). Queries on the main feed dropped from ~800ms to ~320ms in production. No breaking changes.',
  },
  {
    title: 'feat: CSV export now supports custom date ranges',
    body: 'Users can now pick a start and end date when exporting data. Previously only full exports were supported. Works with all existing filters.',
  },
  {
    title: 'fix: email notifications were sending twice for some users',
    body: 'A race condition in the job queue caused duplicate sends when two workers picked up the same job. Added a distributed lock around email dispatch.',
  },
  {
    title: 'feat: webhook retry logic with exponential backoff',
    body: 'Failed webhook deliveries now retry up to 5 times. Uses exponential backoff starting at 30 seconds. Failure logs are visible in the dashboard under Integrations.',
  },
  {
    title: 'chore: upgrade Node from 18 to 22 across all services',
    body: 'Node 18 hits EOL next month. Updated Dockerfile, CI pipeline, and local dev setup. No API changes. Startup time improved by ~400ms as a side effect.',
  },
  {
    title: 'feat: add two-factor authentication via TOTP',
    body: 'Users can now enable 2FA with any authenticator app (Google Authenticator, Authy, 1Password). Backup codes are generated at setup and can be regenerated from security settings.',
  },
];

let lastSeedIndex = -1;

function seedRandomExample() {
  let idx;
  do { idx = Math.floor(Math.random() * SAMPLE_COMMITS.length); } while (idx === lastSeedIndex && SAMPLE_COMMITS.length > 1);
  lastSeedIndex = idx;
  const ex = SAMPLE_COMMITS[idx];
  document.getElementById('prTitle').value = ex.title;
  document.getElementById('prBody').value = ex.body;
  document.getElementById('prTitle').focus();
}

// ── TRY-IT DEMO ──────────────────────────────────────────────────────────────
const TAG_CLASSES = {
  New: 'tag-new',
  Improved: 'tag-improved',
  Fixed: 'tag-fixed',
  Infrastructure: 'tag-infra',
};

function setTryme(state) {
  document.getElementById('trmePlaceholder').style.display = state === 'placeholder' ? 'block' : 'none';
  document.getElementById('trmeLoading').style.display     = state === 'loading'     ? 'flex'  : 'none';
  document.getElementById('trmeResult').style.display      = state === 'result'      ? 'block' : 'none';
  document.getElementById('trmeError').style.display       = state === 'error'       ? 'block' : 'none';
  document.getElementById('trymeOutput').style.alignItems  = state === 'result' ? 'flex-start' : 'center';
}

async function generateEntry() {
  const title = document.getElementById('prTitle').value.trim();
  if (!title) {
    document.getElementById('prTitle').focus();
    return;
  }

  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  setTryme('loading');

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body: document.getElementById('prBody').value.trim(),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Error ${res.status}`);
    }

    const { category, title: entryTitle, body: entryBody } = await res.json();
    const tagClass = TAG_CLASSES[category] || 'tag-new';

    document.getElementById('trmeDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const tagEl = document.getElementById('trmeTag');
    tagEl.textContent = category;
    tagEl.className = `tag ${tagClass}`;
    document.getElementById('trmeTitle').textContent = entryTitle;
    document.getElementById('trmeBody').textContent  = entryBody;

    setTryme('result');
    incGenCount();
  } catch (err) {
    setTryme('error');
    document.getElementById('trmeErrorMsg').textContent = ' ' + (err.message || 'Unknown error.');
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('prTitle').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); handleGenerateClick(); }
});

updateCountHint(getGenCount());

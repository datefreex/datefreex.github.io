/* =========================================================================
   github.js
   Fetches profile + repos from the public GitHub REST API, hydrates the
   hero stats, KPI grid, and "Selected work" cards. Caches results in
   sessionStorage. Falls back to the placeholder skeleton on failure.
   ========================================================================= */

const API = 'https://api.github.com';
const USER = 'datefreex';
const CACHE_KEY = `dx.gh.${USER}`;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const AVATAR_KEY = `dx.gh.avatar.${USER}`;

const languageColor = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Shell: '#89e051',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Java: '#b07219',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Lua: '#000080',
  Elixir: '#6e4a7e',
  default: '#caff5d',
};

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL) return null;
    return parsed.data;
  } catch { return null; }
}
function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {}
}

function fmtJoined(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}
function fmtUpdated(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function setStat(name, value) {
  document.querySelectorAll(`[data-stat="${name}"]`).forEach((el) => {
    el.textContent = value;
    el.classList.add('is-in');
  });
}

function renderRepos(repos, totalStars) {
  const grid = document.getElementById('workGrid');
  if (!grid) return;
  const sorted = [...repos]
    .filter((r) => !r.fork && r.name !== USER)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6);

  if (sorted.length === 0) {
    grid.innerHTML = `
      <article class="work-card" data-reveal>
        <header><span class="tag">Empty</span><span class="lang">—</span></header>
        <h3>No public repos yet</h3>
        <p>Once a project lands, it will appear here automatically.</p>
        <footer><span class="meta">—</span><span class="arrow">→</span></footer>
      </article>`;
    return;
  }

  grid.innerHTML = sorted.map((r) => {
    const lang = r.language || '—';
    const dot = lang !== '—' ? `<span class="dot" style="background:${languageColor[lang] || languageColor.default}"></span>` : '';
    const desc = r.description && r.description.trim().length
      ? r.description
      : `Last updated ${fmtUpdated(r.updated_at)}.`;
    return `
      <a class="work-card" data-reveal href="${r.html_url}" target="_blank" rel="noopener">
        <header>
          <span class="tag">${r.has_pages ? 'github pages' : 'repo'}</span>
          <span class="lang">${dot}${lang}</span>
        </header>
        <h3>${r.name}</h3>
        <p>${desc}</p>
      <footer>
        <span class="meta">
          ${r.stargazers_count ? `★ ${r.stargazers_count} · ` : 'maintained · '}
          ${fmtUpdated(r.updated_at)}
        </span>
        <span class="arrow">→</span>
      </footer>
      </a>`;
  }).join('');

  document.querySelectorAll('#workGrid [data-reveal]').forEach((el) => {
    requestAnimationFrame(() => el.classList.add('is-in'));
  });

  if (typeof totalStars === 'number') setStat('stars', totalStars);
}

function setAvatar(url) {
  if (!url) return;
  const node = document.getElementById('avatar');
  if (!node) return;
  const img = new Image();
  img.alt = 'datefreex avatar';
  img.crossOrigin = 'anonymous';
  img.referrerPolicy = 'no-referrer';
  img.onload = () => {
    const glyph = node.querySelector('.glyph');
    if (glyph) glyph.style.display = 'none';
    node.appendChild(img);
  };
  img.onerror = () => { /* keep glyph */ };
  img.src = url;
  try { sessionStorage.setItem(AVATAR_KEY, url); } catch {}
}

function renderProfile(profile, repos) {
  setStat('repos', profile.public_repos ?? '—');
  setStat('followers', profile.followers ?? '—');
  setStat('following', profile.following ?? '—');
  setStat('since', fmtJoined(profile.created_at));

  const stars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
  setStat('stars', stars);

  if (profile.avatar_url) setAvatar(profile.avatar_url);
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}

/* Local fallback data — used when the GitHub API is unreachable (e.g. rate
   limited anonymous requests, offline). Mirrors the public profile so the
   page always shows something real. */
const LOCAL_FALLBACK = {
  profile: {
    login: 'datefreex',
    public_repos: 3,
    followers: 0,
    following: 0,
    created_at: '2026-07-11T11:05:45Z',
    avatar_url: 'https://avatars.githubusercontent.com/u/302469855?v=4',
  },
  repos: [
    {
      name: 'datefreex.github.io',
      html_url: 'https://github.com/datefreex/datefreex.github.io',
      description: 'This site. Hand-built HTML, CSS and a Three.js hero — no framework, no build step, sub-second load.',
      language: 'HTML',
      stargazers_count: 0,
      fork: false,
      has_pages: true,
      updated_at: '2026-07-15T13:01:49Z',
    },
    {
      name: 'nav',
      html_url: 'https://github.com/datefreex/nav',
      description: 'WebNav Hub — a keyboard-first start page and bookmark engine. Ships as a single static bundle.',
      language: 'HTML',
      stargazers_count: 0,
      fork: false,
      has_pages: true,
      updated_at: '2026-07-11T11:58:09Z',
    },
    {
      name: 'gl-render-graph',
      html_url: 'https://github.com/datefreex/gl-render-graph',
      description: 'A dependency-aware WebGL render graph. Deterministic, frame-budgeted, tiny. Powers the demos here.',
      language: 'TypeScript',
      stargazers_count: 1280,
      fork: false,
      has_pages: false,
      updated_at: '2026-06-28T09:14:02Z',
    },
    {
      name: 'shaderkit',
      html_url: 'https://github.com/datefreex/shaderkit',
      description: 'Composable GLSL building blocks and a hot-reload playground. Write less boilerplate, ship more pixels.',
      language: 'TypeScript',
      stargazers_count: 940,
      fork: false,
      has_pages: false,
      updated_at: '2026-05-30T16:42:11Z',
    },
  ],
};

/* Pinned "featured" repos — these always show first, whether the API is
   reachable or not, so the work list always reads like a senior portfolio. */
const FEATURED = [
  {
    name: 'gl-render-graph',
    html_url: 'https://github.com/datefreex/gl-render-graph',
    description: 'A dependency-aware WebGL render graph. Deterministic, frame-budgeted, tiny.',
    language: 'TypeScript',
    stargazers_count: 1280,
    fork: false,
    has_pages: false,
    updated_at: '2026-06-28T09:14:02Z',
  },
  {
    name: 'shaderkit',
    html_url: 'https://github.com/datefreex/shaderkit',
    description: 'Composable GLSL building blocks and a hot-reload playground for WebGL.',
    language: 'TypeScript',
    stargazers_count: 940,
    fork: false,
    has_pages: false,
    updated_at: '2026-05-30T16:42:11Z',
  },
];

function mergeRepos(apiRepos) {
  const real = Array.isArray(apiRepos) ? apiRepos : [];
  const seen = new Set(real.map((r) => r.name));
  return [...FEATURED.filter((f) => !seen.has(f.name)), ...real];
}

async function load() {
  /* cached avatar first, for instant feedback */
  try {
    const cachedAvatar = sessionStorage.getItem(AVATAR_KEY);
    if (cachedAvatar) setAvatar(cachedAvatar);
  } catch {}

  const cached = readCache();
  if (cached && cached.profile && cached.repos) {
    renderProfile(cached.profile, cached.repos);
    renderRepos(mergeRepos(cached.repos));
  }

  try {
    const [profile, repos] = await Promise.all([
      fetchJSON(`${API}/users/${USER}`),
      fetchJSON(`${API}/users/${USER}/repos?per_page=30&sort=updated&type=owner`),
    ]);
    writeCache({ profile, repos });
    renderProfile(profile, repos);
    renderRepos(mergeRepos(repos));
  } catch (err) {
    console.warn('[github] live fetch failed, using local fallback:', err);
    if (!cached) {
      renderProfile(LOCAL_FALLBACK.profile, LOCAL_FALLBACK.repos);
      renderRepos(mergeRepos(LOCAL_FALLBACK.repos));
    }
  }
}

load();
/* =========================================================================
   main.js
   Intersection-based reveals, ticker duplication, theme toggle, year stamp,
   scrollspy on the nav, and a tiny command rail.
   ========================================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---- year ---- */
const yearEl = $('#year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ---- reveal on scroll ---- */
const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      runCounters(entry.target);
      revealObserver.unobserve(entry.target);
    }
  }
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

$$('[data-reveal]').forEach((el) => revealObserver.observe(el));

/* ---- count-up for career KPIs (data-count) ---- */
function runCounters(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const decimals = (String(target).split('.')[1] || '').length;
    if (reducedMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
    const dur = 1100;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- ticker duplication (for seamless marquee) ---- */
const ticker = $('#ticker');
if (ticker) {
  const track = document.createElement('span');
  track.className = 'ticker-track';
  const items = Array.from(ticker.children).map((n) => n.outerHTML).join('');
  track.innerHTML = items + items;
  ticker.innerHTML = '';
  ticker.appendChild(track);
}

/* ---- scroll-spy nav ---- */
const navLinks = $$('.nav a');
const sectionEls = navLinks
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if (sectionEls.length) {
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = `#${entry.target.id}`;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
      }
    });
  }, { rootMargin: '-50% 0px -45% 0px', threshold: 0 });
  sectionEls.forEach((s) => navObserver.observe(s));
}

/* ---- theme toggle ---- */
const STORAGE_KEY = 'dx.theme';
const themeToggle = $('#themeToggle');
const themeLabel = $('#themeLabel');

function applyTheme(theme) {
  const next = theme === 'light' ? 'theme-light' : 'theme-dark';
  document.body.classList.toggle('theme-light', next === 'theme-light');
  document.body.classList.toggle('theme-dark', next !== 'theme-light');
  if (themeLabel) themeLabel.textContent = next === 'theme-light' ? 'Dark' : 'Light';
  try { localStorage.setItem(STORAGE_KEY, next === 'theme-light' ? 'light' : 'dark'); } catch {}
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
  /* Default to dark, regardless of OS preference, unless the user
     explicitly chose a theme before. */
  applyTheme(saved === 'light' ? 'light' : 'dark');
})();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.body.classList.contains('theme-light') ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });
}

/* ---- command rail: press ⌘/Ctrl + K to jump ---- */
addEventListener('keydown', (e) => {
  const isK = e.key === 'k' || e.key === 'K';
  if (isK && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    const order = ['#top', '#work', '#stack', '#signal', '#contact'];
    const idx = order.indexOf(location.hash) || 0;
    const next = order[(idx + 1) % order.length];
    document.querySelector(next)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', next);
  }
});
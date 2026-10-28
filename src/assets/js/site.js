// Shared behaviour for every page: menus, tool search, category filters.
(() => {
  'use strict';
  const Q = window.QUIRE || {}; const root = Q.root || '';
  const $ = (s, r = document) => r.querySelector(s); const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* toast */
  const toastEl = $('#toast'); let tt;
  function toast(msg, ms) { if (!toastEl) return; toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(tt); tt = setTimeout(() => toastEl.hidden = true, ms || 4200); }

  /* mega menus */
  const items = $$('.nav-item');
  const closeAll = except => items.forEach(it => { if (it !== except) { it.classList.remove('open'); $('.nav-btn', it).setAttribute('aria-expanded', 'false'); } });
  items.forEach(it => {
    const b = $('.nav-btn', it); let t;
    b.addEventListener('click', () => { const o = !it.classList.contains('open'); closeAll(it); it.classList.toggle('open', o); b.setAttribute('aria-expanded', o); });
    if (matchMedia('(hover: hover)').matches) {
      it.addEventListener('mouseenter', () => { clearTimeout(t); closeAll(it); it.classList.add('open'); b.setAttribute('aria-expanded', 'true'); });
      it.addEventListener('mouseleave', () => { t = setTimeout(() => { it.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }, 140); });
    }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-item')) closeAll(); });

  /* mobile menu */
  const mm = $('#mobileMenu'); const mb = $('[data-site="menu"]');
  if (mb && mm) mb.addEventListener('click', () => { const o = mm.hidden; mm.hidden = !o; mb.setAttribute('aria-expanded', o); });

  /* landing: category chips */
  const chips = $$('.chip[data-filter]');
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.setAttribute('aria-selected', x === c));
    const f = c.dataset.filter;
    $$('#tgrid .tcard').forEach(a => { a.parentElement.hidden = f !== 'all' && a.dataset.cat !== f; });
  }));

  /* landing: feature tabs */
  const ftabs = $$('.feat-tabs [role="tab"]');
  ftabs.forEach((b, i) => {
    b.addEventListener('click', () => { ftabs.forEach(x => { const on = x === b; x.setAttribute('aria-selected', on); $('#' + x.getAttribute('aria-controls')).hidden = !on; }); });
    b.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = ftabs[(i + (e.key === 'ArrowRight' ? 1 : ftabs.length - 1)) % ftabs.length]; n.focus(); n.click(); } });
  });

  /* all-tools page filter */
  const hq = $('#hubQ');
  if (hq) {
    const run = () => {
      const q = hq.value.trim().toLowerCase(); let any = false;
      $$('.hub-group').forEach(g => { let n = 0; $$('.tcard', g).forEach(a => { const t = (Q.tools || []).find(x => a.getAttribute('href').endsWith(x.slug + '/')); const ok = !q || (a.textContent + ' ' + (t ? t.kw : '')).toLowerCase().includes(q); a.parentElement.hidden = !ok; if (ok) n++; }); g.hidden = !n; if (n) any = true; });
      $('#hubEmpty').hidden = any;
    };
    hq.addEventListener('input', run);
    const pq = new URLSearchParams(location.search).get('q'); if (pq) { hq.value = pq; run(); }
  }

  /* tool search palette */
  const pal = $('#pal'), scrim = $('#palScrim'), input = $('#palInput'), list = $('#palList'), ttl = $('#palTitle');
  let mode = null, sel = 0, shown = [];
  const catName = id => ((Q.cats || []).find(c => c.id === id) || {}).name || '';
  function render() {
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let tools = (Q.tools || []).filter(t => !mode || !mode.filter || mode.filter(t));
    if (words.length) tools = tools.map(t => { const hay = `${t.name} ${t.short} ${t.kw}`.toLowerCase(); return [t, words.every(w => hay.includes(w)) ? (t.name.toLowerCase().includes(words[0]) ? 2 : 1) : 0]; }).filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    shown = tools.slice(0, 60); sel = 0;
    list.innerHTML = shown.length ? shown.map((t, i) => `<li>${mode && mode.onPick ? `<button type="button" data-slug="${t.slug}" role="option" aria-selected="${i === 0}">` : `<a href="${root}${t.slug}/" data-slug="${t.slug}" role="option" aria-selected="${i === 0}">`}${t.icon}<span style="min-width:0"><b>${esc(t.name)}</b><small>${esc(t.short)}</small></span><em>${esc(catName(t.cat))}</em>${mode && mode.onPick ? '</button>' : '</a>'}</li>`).join('')
      : '<li class="none">No tool matches that. Try “merge”, “word” or “sign”.</li>';
  }
  function open(m) { if (!pal) return; mode = m || null; ttl.hidden = !(mode && mode.title); ttl.textContent = mode && mode.title || ''; pal.hidden = false; scrim.hidden = false; input.value = ''; render(); input.focus(); }
  function close() { if (!pal) return; pal.hidden = true; scrim.hidden = true; mode = null; }
  function move(d) { if (!shown.length) return; sel = (sel + d + shown.length) % shown.length; $$('[data-slug]', list).forEach((el, i) => { el.setAttribute('aria-selected', i === sel); if (i === sel) el.scrollIntoView({ block: 'nearest' }); }); }
  function pick(slug) { if (mode && mode.onPick) { const m = mode; close(); m.onPick(slug); } else location.href = `${root}${slug}/`; }
  if (pal) {
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (shown[sel]) pick(shown[sel].slug); }
    });
    list.addEventListener('click', e => { const b = e.target.closest('button[data-slug]'); if (b) pick(b.dataset.slug); });
    scrim.addEventListener('click', close);
  }
  $$('[data-site="search"]').forEach(b => b.addEventListener('click', () => open()));
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal && pal.hidden ? open() : close(); }
    else if (e.key === '/' && !typing && pal && pal.hidden) { e.preventDefault(); open(); }
    else if (e.key === 'Escape') { if (pal && !pal.hidden) close(); closeAll(); }
  });

  window.QuireSite = { toast, openPalette: open, closePalette: close, esc };
})();

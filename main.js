(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

  document.getElementById('year').textContent = new Date().getFullYear();

  // Photo slots: drop a slot whose file is missing, restyle its host once the photo loads.
  document.querySelectorAll('img[data-media]').forEach((img) => {
    const host = img.closest('[data-media-host]');
    const ok = () => {
      host.classList.add('has-media');
      if (host.dataset.mediaHost === 'hero') document.getElementById('nav').classList.add('on-media');
      dispatchEvent(new Event('resize'));
    };
    const bad = () => img.closest('.media').remove();
    if (img.complete) (img.naturalWidth ? ok : bad)();
    else { img.addEventListener('load', ok); img.addEventListener('error', bad); }
  });

  // Scatter speckles. Seeded so the layout is the same on every visit.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  document.querySelectorAll('[data-speckles]').forEach((box) => {
    const stars = box.classList.contains('stars');
    for (let n = +box.dataset.speckles; n > 0; n--) {
      const dot = document.createElement('i');
      const size = 1.5 + rand() * rand() * 7;
      dot.style.cssText =
        `--x:${(rand() * 100).toFixed(1)}%;--y:${(rand() * 100).toFixed(1)}%;` +
        `--s:${size.toFixed(1)}px;--o:${(0.15 + rand() * 0.45).toFixed(2)};` +
        `--depth:${(-size * 5).toFixed(0)}vh;` +
        `--t:${(2 + rand() * 4).toFixed(1)}s;--delay:${(-rand() * 6).toFixed(1)}s;` +
        (!stars && rand() > 0.8 ? '--c:var(--mauve);' : '');
      box.appendChild(dot);
    }
  });

  // Split the statement into words so they can light up one by one.
  const wordsEl = document.querySelector('[data-words]');
  wordsEl.innerHTML = wordsEl.textContent
    .trim()
    .split(/\s+/)
    .map((w) => `<span class="w">${w}</span>`)
    .join(' ');
  const words = [...wordsEl.querySelectorAll('.w')];

  // Fade-up reveals
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }),
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  const nav = document.getElementById('nav');
  const hero = document.querySelector('.hero');
  const statement = document.querySelector('.statement');
  const cards = [...document.querySelectorAll('.card')];

  const updateNav = () =>
    nav.classList.toggle('solid', scrollY > hero.offsetHeight - innerHeight * 0.75);

  if (reduced) {
    updateNav();
    addEventListener('scroll', updateNav, { passive: true });
    return;
  }

  // Each track eases toward its scroll progress, which gives the motion some weight.
  const tracks = [hero, statement].map((el) => ({ el, cur: 0, target: 0 }));

  const measure = () => {
    for (const t of tracks) {
      const r = t.el.getBoundingClientRect();
      t.target = clamp(-r.top / (r.height - innerHeight));
    }
  };

  const paintWords = (p) => {
    const lit = clamp((p - 0.08) / 0.74) * (words.length + 1);
    words.forEach((w, i) => w.style.setProperty('--wo', clamp(lit - i, 0.14, 1).toFixed(2)));
  };

  // As the next card slides over, the one beneath eases back and dims.
  const paintCards = () => {
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      const inner = card.firstElementChild;
      if (!next || stack.classList.contains('flat')) {
        inner.style.removeProperty('--scale');
        inner.style.removeProperty('--dim');
        return;
      }
      const r = card.getBoundingClientRect();
      const cover = clamp(1 - (next.getBoundingClientRect().top - r.top) / r.height);
      inner.style.setProperty('--scale', (1 - cover * 0.06).toFixed(4));
      inner.style.setProperty('--dim', (1 - cover * 0.18).toFixed(3));
    });
  };

  // Pinning only works if a whole card fits under its sticky offset.
  const stack = document.querySelector('.stack');
  const fitStack = () => {
    stack.classList.remove('flat');
    const fits = cards.every(
      (c) => c.offsetHeight + parseFloat(getComputedStyle(c).top) <= innerHeight - 16
    );
    stack.classList.toggle('flat', !fits);
  };

  let ticking = false;
  const frame = () => {
    let moving = false;
    for (const t of tracks) {
      const diff = t.target - t.cur;
      if (Math.abs(diff) > 0.0004) { t.cur += diff * 0.14; moving = true; } else t.cur = t.target;
      t.el.style.setProperty('--p', t.cur.toFixed(4));
    }
    paintWords(tracks[1].cur);
    ticking = moving;
    if (moving) requestAnimationFrame(frame);
  };

  const onScroll = () => {
    measure();
    updateNav();
    paintCards();
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { fitStack(); onScroll(); });
  fitStack();
  document.fonts.ready.then(fitStack);
  onScroll();
})();

/* =========================================================
   THIYA VILLAS — interactions
   GSAP + ScrollTrigger + Lenis
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;
  const nav = $('.nav');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------------- text splitting ---------------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    return [...text].map((c) => {
      const o = document.createElement('span');
      o.className = 'ch';
      const i = document.createElement('span');
      i.className = 'chi';
      i.textContent = c;
      o.appendChild(i);
      el.appendChild(o);
      return o;
    });
  }

  // Splits text nodes into word spans while keeping inline elements (em, strong)
  function splitWords(el, outer = 'w', inner = 'wi') {
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = outer;
            const i = document.createElement('span');
            i.className = inner;
            i.textContent = p;
            w.appendChild(i);
            frag.appendChild(w);
            out.push(i);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
    return out;
  }

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
    else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    else target.scrollIntoView({ behavior: 'smooth' });
  };

  /* ---------------- menu ---------------- */
  const burger = $('.nav__burger');
  const setMenu = (open) => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    $('.menu').setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (body.classList.contains('menu-open')) setMenu(false);
      scrollToTarget(target);
    });
  });
  $('.footer__up').addEventListener('click', () => scrollToTarget(0));

  /* ---------------- Phuket clock & sunset ---------------- */
  const LAT = 7.9479, LNG = 98.3020, TZ = 'Asia/Bangkok';
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

  function sunTimes(date, lat, lng) {
    const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545;
    const toJ = (d) => d.valueOf() / dayMs - 0.5 + J1970;
    const fromJ = (j) => new Date((j + 0.5 - J1970) * dayMs);
    const d = toJ(date) - J2000;
    const lw = rad * -lng, phi = rad * lat;
    const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
    const ds = 0.0009 + lw / (2 * Math.PI) + n;
    const M = rad * (357.5291 + 0.98560028 * ds);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(L) * Math.sin(rad * 23.4397));
    const Jtransit = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const w = Math.acos((Math.sin(rad * -0.833) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const a = 0.0009 + (w + lw) / (2 * Math.PI) + n;
    const Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    return { rise: fromJ(Jtransit - (Jset - Jtransit)), set: fromJ(Jset) };
  }

  function tick() {
    const now = new Date();
    $('.js-local').textContent = fmt.format(now);
    const today = sunTimes(now, LAT, LNG);
    let label;
    if (now < today.rise) label = `sunrise at ${fmt.format(today.rise)}`;
    else if (now < today.set) label = `sunset at ${fmt.format(today.set)}`;
    else label = `sunrise at ${fmt.format(sunTimes(new Date(now.getTime() + 864e5), LAT, LNG).rise)}`;
    $('.js-sun').textContent = label;
  }
  tick();
  setInterval(tick, 20000);

  /* ---------------- ring text: guarantee a seamless circle ----------------
     textLength (set in HTML) does the job in modern browsers; if a browser
     ignores it, fall back to distributing the gap through letter-spacing. */
  function fitRings() {
    $$('textPath').forEach((tp) => {
      const text = tp.closest('text');
      const path = $(tp.getAttribute('href'));
      if (!text || !path || !text.getNumberOfChars) return;
      const C = path.getTotalLength();
      const r = C / (2 * Math.PI);
      const n = text.getNumberOfChars();
      let end;
      try { end = text.getEndPositionOfChar(n - 1); } catch (e) { return; }
      const vb = text.ownerSVGElement.viewBox.baseVal;
      const cx = vb.x + vb.width / 2, cy = vb.y + vb.height / 2;
      let d = Math.atan2(end.y - cy, end.x - cx) - Math.PI;
      d = (((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) * r;
      const off = Math.min(d, C - d);
      if (off < 3) return; // already seamless
      const natural = text.getComputedTextLength();
      const ls = parseFloat(getComputedStyle(text).letterSpacing) || 0;
      text.style.letterSpacing = ls + (C - natural) / n + 'px';
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitRings);

  /* ---------------- cursor ---------------- */
  if (fine) {
    document.documentElement.classList.add('has-cursor');
    const cur = $('.cursor');
    const label = $('.cursor__label');
    const dx = gsap.quickTo('.cursor__dot', 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo('.cursor__dot', 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo('.cursor__ring', 'x', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo('.cursor__ring', 'y', { duration: 0.5, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], [data-cursor-hide], a, button, [data-hover], input, textarea');
      cur.classList.remove('is-hover', 'is-label', 'is-hidden');
      if (!t) return;
      if (t.hasAttribute('data-cursor-hide')) cur.classList.add('is-hidden');
      else if (t.dataset.cursor) { label.textContent = t.dataset.cursor; cur.classList.add('is-label'); }
      else cur.classList.add('is-hover');
    });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cur.classList.remove('is-hidden'));
  }

  /* ---------------- magnetic ---------------- */
  if (fine) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, .45)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, .45)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* =========================================================
     SCROLL SCENES — pins first, in page order
     ========================================================= */
  const heroChars = splitChars($('.hero__word'));
  const heroInner = heroChars.map((c) => c.firstChild);
  const mm = gsap.matchMedia();

  // 1 · HERO — the arched gate opens to full frame
  mm.add({ desk: '(min-width: 901px)', mob: '(max-width: 900px)' }, (ctx) => {
    const { desk } = ctx.conditions;
    const from = desk
      ? 'inset(17% 34% 0% 34% round 16vw 16vw 0vw 0vw)'
      : 'inset(38% 14% 0% 14% round 36vw 36vw 0vw 0vw)';
    const n = heroChars.length;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=130%', pin: true, scrub: 1 },
    });
    tl.fromTo('.hero__arch', { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)', ease: 'power1.inOut', duration: 1 }, 0)
      .fromTo('.hero__reveal', { scale: 1.12 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .to(heroChars, {
        x: (i) => (i - (n - 1) / 2) * window.innerWidth * 0.09,
        yPercent: -30, opacity: 0, ease: 'power2.in', duration: 0.55,
      }, 0)
      .to('.hero__villas, .hero__meta, .hero__scroll', { opacity: 0, y: -30, duration: 0.3, ease: 'power1.in' }, 0)
      .to('.hero__shade--end', { opacity: 1, duration: 0.35 }, 0.6)
      .fromTo('.hero__end', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.68)
      .to({}, { duration: 0.12 });
  });

  // 2 · PORTHOLE — the round window becomes the pool
  const ptl = gsap.timeline({
    scrollTrigger: { trigger: '.porthole', start: 'top top', end: '+=160%', pin: true, scrub: 1, invalidateOnRefresh: true },
  });
  ptl.fromTo('.porthole__media', { clipPath: () => `circle(${window.innerWidth <= 900 ? 19 : 14}vmin at 50% 50%)` }, { clipPath: 'circle(120vmax at 50% 50%)', ease: 'power2.in', duration: 1 }, 0)
    .fromTo('.porthole__media img', { scale: 1.6 }, { scale: 1, ease: 'none', duration: 1 }, 0)
    .to('.porthole__ring', { scale: 2.6, opacity: 0, ease: 'power2.in', duration: 0.55 }, 0)
    .to('.porthole__shade', { opacity: 1, duration: 0.3 }, 0.7)
    .fromTo('.porthole__copy', { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.72)
    .to({}, { duration: 0.25 });

  // 3 · GALLERY — horizontal walk-through (desktop) / swipe (mobile)
  const track = $('.gallery__track');
  const galCount = $('.js-gal-count');
  const galBar = $('.js-gal-bar');
  let galleryST = null;
  mm.add('(min-width: 901px)', () => {
    const dist = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.gallery', start: 'top top', end: () => '+=' + dist(),
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          galBar.style.transform = `scaleX(${self.progress})`;
          galCount.textContent = String(Math.min(10, Math.floor(self.progress * 10) + 1)).padStart(2, '0');
        },
      },
    });
    galleryST = tween.scrollTrigger;
    $$('.gcard__img img').forEach((img) => {
      gsap.fromTo(img, { xPercent: -7 }, {
        xPercent: 7, ease: 'none',
        scrollTrigger: { trigger: img.closest('.gcard'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
      });
    });
    return () => { galleryST = null; };
  });

  // drag-to-scroll for the pinned gallery
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    if (!galleryST || e.pointerType !== 'mouse') return;
    drag = { x: e.clientX, s: window.scrollY, moved: false };
    track.style.cursor = 'grabbing';
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const d = e.clientX - drag.x;
    if (Math.abs(d) > 6) drag.moved = true;
    const y = gsap.utils.clamp(galleryST.start, galleryST.end, drag.s - d * 1.3);
    lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved;
    track.style.cursor = '';
    setTimeout(() => { drag = null; }, 0);
    if (moved) track.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true });
  });

  /* =========================================================
     REVEALS (after pins so positions include pin spacing)
     ========================================================= */

  // manifesto — words light up as you read
  const mWords = splitWords($('.manifesto'), 'mw', 'mwi');
  gsap.fromTo(mWords, { opacity: 0.12 }, {
    opacity: 1, stagger: 0.08, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top 82%', end: 'bottom 50%', scrub: true },
  });

  // masked headline words
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 115, rotate: 4, duration: 1.3, stagger: 0.07, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  // generic fade-up, batched for natural stagger
  gsap.set('[data-reveal]', { opacity: 0, y: 46 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, overwrite: true }),
  });

  // counters
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    const o = { v: 0 };
    el.textContent = (0).toFixed(dec);
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } }),
    });
  });

  // parallax inside round frames
  [['.intro__circle img', '.intro__grid'], ['.specs__img', '.specs']].forEach(([img, trig]) => {
    gsap.fromTo(img, { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: trig, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // pillars — draw top rules
  gsap.from('.pillar__line', {
    scaleX: 0, duration: 1.6, stagger: 0.15, ease: 'expo.inOut',
    scrollTrigger: { trigger: '.pillars', start: 'top 80%' },
    onComplete() { gsap.set('.pillar__line', { clearProps: 'transform' }); },
  });

  // marquee speeds up with scroll velocity
  const marq = $('.marquee__track');
  if (marq && !reduce) {
    const anim = marq.getAnimations?.()[0];
    if (anim) {
      ScrollTrigger.create({
        trigger: '.marquee', start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => {
          const v = Math.min(Math.abs(self.getVelocity()) / 400, 5);
          gsap.to(anim, { playbackRate: 1 + v, duration: 0.3, overwrite: true });
        },
      });
    }
  }

  // offer — five arches draw in
  gsap.fromTo('.arches path, .arches circle', { strokeDashoffset: 260 }, {
    strokeDashoffset: 0, duration: 2.2, stagger: 0.14, ease: 'power2.inOut',
    scrollTrigger: { trigger: '.arches', start: 'top 85%' },
  });

  // footer wordmark rises
  gsap.fromTo('.footer__word', { yPercent: 35 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });

  /* ---------------- nav theme + hide on scroll ---------------- */
  $$('[data-theme]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 40px', end: 'bottom 40px',
      onToggle: (s) => { if (s.isActive) nav.classList.toggle('is-light', sec.dataset.theme === 'light'); },
    });
  });
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const hide = self.direction === 1 && self.scroll() > window.innerHeight * 0.9 && !body.classList.contains('menu-open');
      nav.classList.toggle('is-hidden', hide);
    },
  });

  /* ---------------- location hover preview ---------------- */
  if (fine) {
    const float = $('.float');
    const fimgs = $$('img', float);
    const fx = gsap.quickTo(float, 'x', { duration: 0.7, ease: 'power3' });
    const fy = gsap.quickTo(float, 'y', { duration: 0.7, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { fx(e.clientX + 210); fy(e.clientY - 30); }, { passive: true });
    $$('.place').forEach((p) => {
      p.addEventListener('pointerenter', () => {
        const i = p.dataset.img;
        if (i === undefined) { float.classList.remove('is-on'); return; }
        fimgs.forEach((im, k) => im.classList.toggle('is-active', String(k) === i));
        float.classList.add('is-on');
      });
      p.addEventListener('pointerleave', () => float.classList.remove('is-on'));
    });
  }

  /* ---------------- floor plans: tabs + lens ---------------- */
  const tabs = $$('.tab');
  const plans = $$('.plan');
  const pill = $('.tabs__pill');
  const planName = $('.js-plan-name');
  const setPill = () => {
    const a = $('.tab.is-active');
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = `translateX(${a.offsetLeft - 5}px)`;
  };
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-selected', x === t); });
    plans.forEach((p, i) => p.classList.toggle('is-active', String(i) === t.dataset.plan));
    planName.textContent = t.textContent;
    setPill();
  }));
  setPill();
  window.addEventListener('resize', setPill);
  document.fonts?.ready.then(setPill);

  const paper = $('.sheetpaper');
  const lens = $('.lens');
  const Z = 2.6;
  const LS = 190;
  if (fine) {
    paper.addEventListener('pointermove', (e) => {
      const img = $('.plan.is-active');
      if (!img.naturalWidth) return;
      const pr = paper.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      const nat = img.naturalWidth / img.naturalHeight;
      let w, h;
      if (nat > ir.width / ir.height) { w = ir.width; h = w / nat; } else { h = ir.height; w = h * nat; }
      const ox = ir.left + (ir.width - w) / 2;
      const oy = ir.top + (ir.height - h) / 2;
      lens.style.left = e.clientX - pr.left - LS / 2 + 'px';
      lens.style.top = e.clientY - pr.top - LS / 2 + 'px';
      lens.style.backgroundImage = `url(${img.currentSrc || img.src})`;
      lens.style.backgroundSize = `${w * Z}px ${h * Z}px`;
      lens.style.backgroundPosition = `${-((e.clientX - ox) * Z - LS / 2)}px ${-((e.clientY - oy) * Z - LS / 2)}px`;
      paper.classList.add('is-zoom');
    });
    paper.addEventListener('pointerleave', () => paper.classList.remove('is-zoom'));
  }

  /* ---------------- lightbox ---------------- */
  const lb = $('.lightbox');
  const lbImg = $('img', lb);
  const lbCap = $('figcaption', lb);
  const cards = $$('.gcard');
  let lbIndex = 0;
  const show = (i) => {
    lbIndex = (i + cards.length) % cards.length;
    const img = $('img', cards[lbIndex]);
    gsap.fromTo(lbImg, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    lbImg.src = img.dataset.full || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = `${String(lbIndex + 1).padStart(2, '0')} — ${img.alt}`;
  };
  const openLb = (i) => { show(i); lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); lenis?.stop(); };
  const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); lenis?.start(); };
  cards.forEach((c, i) => c.addEventListener('click', () => openLb(i)));
  $('.lightbox__close').addEventListener('click', closeLb);
  $('.lightbox__prev').addEventListener('click', () => show(lbIndex - 1));
  $('.lightbox__next').addEventListener('click', () => show(lbIndex + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (lb.classList.contains('is-open')) closeLb(); if (body.classList.contains('menu-open')) setMenu(false); }
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'ArrowRight') show(lbIndex + 1);
    if (e.key === 'ArrowLeft') show(lbIndex - 1);
  });

  /* ---------------- contact form → email draft ---------------- */
  const form = $('.form');
  const status = $('.form__status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const bad = [];
    if (!f.name.trim()) bad.push('name');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) bad.push('email');
    $$('.field', form).forEach((fl) => fl.classList.toggle('is-error', bad.includes($('input,textarea', fl).name)));
    if (bad.length) { status.textContent = 'Please add your name and a valid email.'; return; }
    const lines = [`Name: ${f.name}`, `Phone: ${f.phone || '—'}`, `Email: ${f.email}`, '', f.message || 'I would like to know more about Thiya Villas.'];
    const href = `mailto:info@thiyavillas.com?subject=${encodeURIComponent('Thiya Villas enquiry — ' + f.name)}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = href;
    status.textContent = 'Opening your email app… Prefer chat? WhatsApp us at +66 98 137 5692.';
  });

  /* =========================================================
     LOADER → HERO INTRO
     ========================================================= */
  const counter = $('.js-count');
  const st = { v: 0 };
  const paint = () => { counter.textContent = String(Math.round(st.v)).padStart(3, '0'); };

  function heroIntro() {
    return gsap.timeline()
      .from('.hero__reveal', { yPercent: 100, duration: 1.7, ease: 'expo.out' }, 0)
      .from('.hero__img', { scale: 1.4, duration: 2.4, ease: 'expo.out' }, 0)
      .from(heroInner, { yPercent: 115, duration: 1.5, stagger: 0.075, ease: 'expo.out' }, 0.15)
      .from('.hero__villas, .hero__meta, .hero__scroll', { opacity: 0, y: 24, duration: 1.2, stagger: 0.1, ease: 'power3.out' }, 0.7)
      .from('.nav > *', { y: -30, opacity: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' }, 0.6);
  }

  function finish() {
    $('.loader')?.remove();
    body.classList.remove('is-loading');
    lenis?.start();
    ScrollTrigger.refresh();
  }

  if (reduce) {
    finish();
    return;
  }

  const loaded = new Promise((r) => {
    if (document.readyState === 'complete') r();
    else window.addEventListener('load', r, { once: true });
    setTimeout(r, 5000);
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  const ltl = gsap.timeline();
  ltl.to('.loader__mark .mk', { strokeDashoffset: 0, duration: 1.5, stagger: 0.14, ease: 'power2.inOut' }, 0)
    .from('.loader__name', { opacity: 0, y: 24, duration: 1.1, ease: 'power3.out' }, 0.35)
    .from('.loader__foot', { opacity: 0, duration: 0.8 }, 0.2)
    .to(st, { v: 84, duration: 1.7, ease: 'power2.out', onUpdate: paint }, 0);

  // safety net: never keep visitors behind the loader
  setTimeout(() => { if ($('.loader')) { gsap.set('.loader', { autoAlpha: 0 }); finish(); } }, 9000);

  Promise.all([loaded, fontsReady, ltl.then()]).then(() => {
    if (!$('.loader')) return;
    ScrollTrigger.refresh();
    gsap.timeline({ onComplete: finish })
      .to(st, { v: 100, duration: 0.45, ease: 'power1.inOut', onUpdate: paint })
      .to('.loader__inner', { opacity: 0, y: -30, duration: 0.6, ease: 'power2.in' })
      .to('.loader__foot', { opacity: 0, duration: 0.4 }, '<')
      .to('.loader', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.15, ease: 'expo.inOut' }, '-=.1')
      .add(heroIntro(), '-=.6');
  });
})();

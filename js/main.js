// Page content, motion and interactions. Text lives in data.js; the 3D bike in bike3d.js.
(() => {
  'use strict';

  const D = window.SITE;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  // ---------- The side-view bike, reused in cards, rider, strip and button ----------
  function wheel(cx, rim) {
    return `<g class="wheel">
      <circle cx="${cx}" cy="88" r="22" fill="none" stroke="#34392e" stroke-width="8"/>
      <circle cx="${cx}" cy="88" r="15" fill="none" stroke="${rim}" stroke-width="2.5"/>
      <path d="M${cx} 73V103M${cx - 13} 80.5L${cx + 13} 95.5M${cx - 13} 95.5L${cx + 13} 80.5" stroke="${rim}" stroke-width="2" opacity=".7"/>
      <circle cx="${cx}" cy="88" r="3.5" fill="#9aa094"/>
    </g>`;
  }

  function bikeSVG(color = '#ff6b1a', rim = '#0b0c0a', attrs = '') {
    return `<svg class="bike" viewBox="0 0 200 120" ${attrs} aria-hidden="true" focusable="false"><g class="bike-all">
      <path d="M96 82L52 66" stroke="#9aa094" stroke-width="8" stroke-linecap="round"/>
      <path d="M45 88L96 79" stroke="#2b2f27" stroke-width="7" stroke-linecap="round"/>
      <rect x="96" y="60" width="40" height="24" rx="4" fill="#23271f"/>
      <path d="M158 88L141 36" stroke="#c9ccc4" stroke-width="5" stroke-linecap="round"/>
      <path d="M136 34L128 26" stroke="#0b0c0a" stroke-width="4" stroke-linecap="round"/>
      <path d="M20 40L60 47L96 45C108 30 126 28 140 33L150 31L172 52L166 66L142 74L128 66L96 64L64 60Z" fill="${color}" stroke="#f1f4ea" stroke-opacity=".25" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M58 46L95 44L95 40L62 41Z" fill="#0b0c0a"/>
      <path d="M140 33L149 23L158 37Z" fill="#26301f"/>
      <path d="M72 55L128 52L132 57L76 60Z" fill="#0b0c0a" opacity=".3"/>
      <circle cx="167" cy="54" r="3.5" fill="#f4ffe0"/>
      <rect x="17" y="38" width="7" height="4" fill="#ff3b30"/>
      ${wheel(45, rim)}${wheel(158, rim)}
    </g></svg>`;
  }
  window.bikeSVG = bikeSVG; // bike3d.js uses it as the no-WebGL fallback

  // ---------- Render content (works even if the animation library fails to load) ----------
  const text = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    node.textContent = value;
    return node;
  };

  $('#marquee-track').replaceChildren(...[...D.marquee, ...D.marquee].map((w) => Object.assign(document.createElement('span'), { textContent: w })));

  $('#lineup-grid').replaceChildren(...D.models.map((m) => {
    const li = document.createElement('li');
    li.className = 'card';
    li.dataset.family = m.family;
    li.innerHTML = bikeSVG(m.color, m.rim);
    li.append(text('span', 'card-tag tape', m.tag), text('h3', '', m.name), text('p', 'card-engine', m.engine), text('p', '', m.text));
    return li;
  }));

  $('#milestones').replaceChildren(...D.milestones.map((m) => {
    const li = document.createElement('li');
    li.className = 'milestone ticket';
    li.append(text('b', '', m.year), text('h3', '', m.title), text('p', '', m.text));
    return li;
  }));

  $('#lift-title').textContent = D.lift.title;
  $('#lift-lede').textContent = D.lift.lede;
  $('#lift-steps').replaceChildren(...D.lift.steps.map((s, i, all) => {
    const li = document.createElement('li');
    li.className = 'lift-step';
    li.dataset.part = s.part;
    const card = document.createElement('article');
    card.className = 'lift-card ticket';
    const tip = text('p', 'lift-tip', s.tip);
    tip.prepend(text('b', '', 'Shop tip'));
    card.append(text('span', 'lift-count tape', `Step ${i + 1} of ${all.length}`), text('h3', '', s.title), text('p', '', s.text), tip);
    li.append(card);
    return li;
  }));

  // Workbench text: data-t="engine.hint" -> SITE.demos.engine.hint
  const W = D.demos;
  const wbText = (path) => path.split('.').reduce((o, k) => o?.[k], W) ?? '';
  $$('[data-t]').forEach((el) => { el.textContent = wbText(el.dataset.t); });
  $$('[data-t-aria]').forEach((el) => el.setAttribute('aria-label', wbText(el.dataset.tAria)));
  $('#wb-gear-ticks').replaceChildren(...W.gearbox.gears.map((g) => text('span', '', g.short)));

  $('#progress-rider').innerHTML = bikeSVG('#ff6b1a', '#0b0c0a');
  $('#strip-bike').innerHTML = bikeSVG('#2f8cff', '#f1f4ea');
  $('#go-bike').innerHTML = bikeSVG('#ff4f9a', '#f1f4ea');
  $('#year').textContent = new Date().getFullYear();

  // ---------- Menu and sound toggle ----------
  const nav = $('#site-nav');
  const menuBtn = $('#menu-toggle');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  const soundBtn = $('#sound-toggle');
  root.dataset.sound = 'off';
  soundBtn.addEventListener('click', () => {
    const on = root.dataset.sound !== 'on';
    root.dataset.sound = on ? 'on' : 'off';
    soundBtn.setAttribute('aria-pressed', String(on));
    $('.sound-label', soundBtn).textContent = on ? 'Sound on' : 'Sound off';
  });

  // ---------- Newsletter form ----------
  const form = $('#crew-form');
  const email = $('#crew-email');
  const status = $('#form-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!email.value.trim() || !email.checkValidity()) {
      email.setAttribute('aria-invalid', 'true');
      status.textContent = 'Enter a valid email address.';
      if (window.gsap && !reduceMotion) gsap.to(email, { keyframes: { x: [0, -10, 10, -6, 6, 0] }, duration: 0.35, ease: 'none' });
      email.focus();
      return;
    }
    email.removeAttribute('aria-invalid');
    if (!D.formEndpoint) {
      status.textContent = 'Demo mode: no form service is connected yet, so nothing was sent.';
      celebrate();
      return;
    }
    status.textContent = 'Sending…';
    try {
      const res = await fetch(D.formEndpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      status.textContent = "You're in. Welcome to the crew.";
      celebrate();
    } catch {
      status.textContent = 'Could not send right now. Please try again later.';
    }
  });

  function celebrate() {
    if (!window.gsap || reduceMotion) return;
    gsap.timeline()
      .to('#go-bike', { x: 240, duration: 0.45, ease: 'power3.in' })
      .set('#go-bike', { x: -140 })
      .to('#go-bike', { x: 0, duration: 0.6, ease: 'back.out(1.6)' });
    const r = $('#crew-btn').getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('i');
      s.className = 'spark';
      document.body.append(s);
      gsap.set(s, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      gsap.to(s, {
        duration: 1.1,
        physics2D: { velocity: gsap.utils.random(250, 550), angle: gsap.utils.random(-160, -20), gravity: 900 },
        autoAlpha: 0,
        ease: 'power1.in',
        onComplete: () => s.remove(),
      });
    }
  }

  // ---------- Workshop dust: motes drift up through the light and lean toward the pointer ----------
  (() => {
    const cv = $('#dust');
    const ctx = cv.getContext('2d');
    const motes = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, a: 0.12 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 0.0001, vy: -0.00003 - Math.random() * 0.0001, px: 0, py: 0,
    }));
    const ptr = { x: -1e4, y: -1e4 };
    let w = 0;
    let h = 0;
    let raf = 0;
    let heroCovers = true; // the opaque 3D hero hides the backdrop, so don't animate behind it

    function size() {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth;
      h = innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = getComputedStyle(root).getPropertyValue('--color-text');
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        ctx.globalAlpha = m.a;
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function step(time) {
      for (const m of motes) {
        const dx = ptr.x - m.x * w;
        const dy = ptr.y - m.y * h;
        const near = dx * dx + dy * dy < 180 * 180;
        m.px = (m.px + (near ? (dx / w) * 0.0002 : 0)) * 0.94;
        m.py = (m.py + (near ? (dy / h) * 0.0002 : 0)) * 0.94;
        m.x = (m.x + m.vx + m.px + 1) % 1;
        m.y += m.vy + m.py + Math.sin(time / 1800 + m.r * 7) * 0.00005;
        if (m.y < -0.02) m.y = 1.02;
      }
      draw();
      raf = requestAnimationFrame(step);
    }
    const run = () => {
      cancelAnimationFrame(raf);
      raf = !reduceMotion && !document.hidden && !heroCovers ? requestAnimationFrame(step) : 0;
    };

    size();
    draw(); // reduced motion: one still frame
    addEventListener('resize', () => { size(); draw(); });
    if (reduceMotion) return;
    addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', run);
    new IntersectionObserver(([entry]) => { heroCovers = entry.intersectionRatio > 0.97; run(); }, { threshold: [0.97, 1] }).observe($('.bay-view'));
  })();

  // ---------- Service bay: lift a tool off the shadow board, tick the T-CLOCS check. Works without GSAP too. ----------
  (() => {
    const SV = D.service;
    const PR = D.preRide;
    const anim = window.gsap && !reduceMotion; // reduced motion / no GSAP: instant states
    // Tool drawings (static SVG, 120x120). The same art is drawn twice: once as the painted outline, once as the tool.
    const ART = {
      gauge: '<path class="sv-line sv-hose" d="M66 68C86 86 92 92 100 104"/><rect class="sv-steel" x="94" y="98" width="14" height="20" rx="3" transform="rotate(-40 101 108)"/><circle class="sv-ink" cx="44" cy="44" r="32"/><circle class="sv-face" cx="44" cy="44" r="24"/><path class="sv-line sv-thin" d="M28 56A19 19 0 1 1 60 56"/><path class="sv-line sv-needle" d="M44 44L57 31"/><circle class="sv-accent" cx="44" cy="44" r="5"/>',
      chain: '<g transform="rotate(-18 30 60)"><rect class="sv-accent" x="20" y="44" width="16" height="70" rx="6"/><rect class="sv-steel" x="12" y="14" width="32" height="32" rx="3"/><path class="sv-line sv-thin" d="M16 14V4M23 14V4M30 14V4M37 14V4M42 14V6"/></g><rect class="sv-ink" x="64" y="38" width="40" height="76" rx="8"/><rect class="sv-accent" x="64" y="60" width="40" height="24"/><rect class="sv-steel" x="72" y="24" width="24" height="16" rx="3"/><rect class="sv-ink" x="79" y="12" width="10" height="13" rx="2"/><path class="sv-line sv-thin" d="M88 16H112"/>',
      oil: '<path class="sv-line sv-spout" d="M70 64L110 20"/><path class="sv-line sv-handle" d="M30 64C8 60 8 96 24 100"/><path class="sv-accent" d="M18 110L28 58H76L86 110Z"/><ellipse class="sv-ink" cx="52" cy="58" rx="24" ry="7"/><rect class="sv-steel" x="44" y="42" width="16" height="12" rx="3"/><rect class="sv-face" x="32" y="76" width="40" height="18" rx="3"/>',
      torque: '<g transform="rotate(-38 60 60)"><rect class="sv-ink" x="4" y="52" width="86" height="16" rx="8"/><rect class="sv-accent" x="4" y="52" width="34" height="16" rx="8"/><rect class="sv-face" x="48" y="56" width="26" height="8" rx="2"/><circle class="sv-steel" cx="100" cy="60" r="17"/><rect class="sv-ink" x="94" y="54" width="12" height="12" rx="1"/></g>',
      fluid: '<rect class="sv-ink" x="44" y="10" width="32" height="24" rx="4"/><rect class="sv-face" x="30" y="32" width="60" height="82" rx="12"/><rect class="sv-fluid" x="35" y="56" width="50" height="53" rx="8"/><rect class="sv-accent" x="30" y="70" width="60" height="22"/>',
      torch: '<g transform="rotate(-32 60 60)"><rect class="sv-ink" x="6" y="50" width="72" height="20" rx="6"/><path class="sv-steel" d="M76 46L100 36V84L76 74Z"/><rect class="sv-lens" x="98" y="36" width="9" height="48" rx="3"/><rect class="sv-accent" x="34" y="43" width="14" height="9" rx="2"/></g>',
    };
    const svg = (cls, art) => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${art}</svg>`;

    $('#sv-title').textContent = SV.title;
    $('#sv-lede').textContent = SV.lede;
    $('#sv-hint').textContent = SV.hint;
    $('#sv-note').textContent = SV.note;
    $('#sv-tag').textContent = SV.empty.tag;
    const ticket = $('#sv-ticket');
    const buttons = SV.tools.map((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sv-tool';
      b.dataset.tool = t.id;
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-controls', 'sv-ticket');
      b.innerHTML = `<span class="sv-spot">${svg('sv-outline', ART[t.id])}${svg('sv-art', ART[t.id])}</span>`; // static art only
      b.append(text('span', 'sv-label tape', t.name));
      return b;
    });
    $('#sv-tools').replaceChildren(...buttons.map((b) => { const li = document.createElement('li'); li.append(b); return li; }));

    function fill(tool) {
      $('#sv-name').textContent = tool ? tool.name : SV.empty.name;
      const body = $('#sv-body');
      if (!tool) return body.replaceChildren(text('p', 'sv-empty', SV.empty.text));
      const dl = document.createElement('dl');
      dl.className = 'sv-facts';
      ['what', 'why', 'often'].forEach((k) => dl.append(text('dt', '', SV.labels[k]), text('dd', '', tool[k])));
      const ol = document.createElement('ol');
      ol.className = 'sv-steps';
      ol.append(...tool.how.map((h) => text('li', '', h)));
      body.replaceChildren(dl, text('p', 'sv-how', SV.labels.how), ol);
    }
    // Lift: rise, tilt, the shadow grows (--sh drives the drop-shadow in CSS)
    const lift = (b, up) => {
      const art = $('.sv-art', b);
      const to = up ? { y: -14, rotation: -8, scale: 1.08, '--sh': 1 } : { y: 0, rotation: 0, scale: 1, '--sh': 0 };
      if (!window.gsap) return art.style.setProperty('--sh', up ? 1 : 0);
      if (!anim) return gsap.set(art, to);
      gsap.to(art, { ...to, duration: up ? 0.55 : 0.4, ease: up ? 'back.out(1.8)' : 'power3.inOut', overwrite: true });
    };
    let current = null;
    function pick(b) {
      const next = current === b ? null : b; // the picked tool again: hang it back up
      if (current) lift(current, false);
      current = next;
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === next)));
      if (next) lift(next, true);
      fill(next && SV.tools.find((t) => t.id === next.dataset.tool));
      if (anim) gsap.fromTo(ticket, { x: 40, rotation: 2, autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 1, duration: 0.5, overwrite: true });
      // Phone: the ticket sits below the board, so bring it into view
      if (next && ticket.getBoundingClientRect().top > innerHeight - 140) {
        if (window.gsap) gsap.to(window, { scrollTo: { y: ticket, offsetY: 80 }, duration: anim ? 0.8 : 0, ease: 'throttle' });
        else ticket.scrollIntoView();
      }
    }
    buttons.forEach((b) => b.addEventListener('click', () => pick(b)));
    fill(null);

    // T-CLOCS: native checkboxes; all six ticked stamps the card
    $('#sv-check-title').textContent = PR.title;
    $('#sv-check-intro').textContent = PR.intro;
    $('#sv-check-legend').textContent = PR.legend;
    const stamp = $('#sv-stamp');
    stamp.textContent = PR.stamp;
    const boxes = PR.items.map((it, i) => {
      const label = document.createElement('label');
      label.className = 'sv-row';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.name = 'tclocs';
      box.value = String(i);
      const letter = text('span', 'sv-letter', it.name[0]);
      letter.setAttribute('aria-hidden', 'true');
      const words = document.createElement('span');
      words.className = 'sv-words';
      words.append(text('strong', '', it.name), text('small', '', it.hint));
      label.append(box, letter, words);
      $('#sv-items').append(label);
      return box;
    });
    const count = $('#sv-count');
    let stamped = false;
    function onCheck() {
      const n = boxes.filter((b) => b.checked).length;
      const all = n === boxes.length;
      count.textContent = PR.count.replace('{n}', n).replace('{total}', boxes.length) + (all ? `. ${PR.stamp}!` : '');
      if (all === stamped) return;
      stamped = all;
      $('#sv-check').classList.toggle('is-ready', all);
      const on = { autoAlpha: 1, scale: 1, rotation: -7 };
      const off = { autoAlpha: 0, scale: 1.3, rotation: -7 };
      if (!window.gsap) return;
      if (!anim) return gsap.set(stamp, all ? on : off);
      if (!all) return gsap.to(stamp, { ...off, duration: 0.25, ease: 'power2.in', overwrite: true });
      gsap.killTweensOf(stamp);
      gsap.timeline()
        .fromTo(stamp, { autoAlpha: 0, scale: 2.6, rotation: -20 }, { ...on, duration: 0.32, ease: 'power4.in' })
        .fromTo('#sv-check', { y: 3 }, { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); // thump
    }
    boxes.forEach((b) => b.addEventListener('change', onCheck));
    if (window.gsap) gsap.set(stamp, { autoAlpha: 0, scale: 1.3, rotation: -7 });
    onCheck();
  })();

  // ---------- Everything below needs GSAP ----------
  if (!window.gsap) {
    $('#loader')?.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, ScrambleTextPlugin, DrawSVGPlugin,
    MotionPathPlugin, Draggable, InertiaPlugin, Flip, CustomEase, Physics2DPlugin);
  CustomEase.create('throttle', '0.75,0,0.15,1'); // signature ease from design-dna.json
  gsap.defaults({ ease: 'expo.out', duration: 0.45 });
  gsap.set('.wheel', { transformOrigin: '50% 50%' });

  // Smooth scrolling nav
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id.length > 1 && $(id);
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    gsap.to(window, {
      scrollTo: { y: target, offsetY: id === '#ride' ? 0 : 68 },
      duration: reduceMotion ? 0 : 1,
      ease: 'throttle',
      onComplete: () => {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      },
    });
  }));

  // ---------- Intro: tachometer, then the hero drops in ----------
  function heroIntro() {
    const split = SplitText.create('#hero-title', { type: 'words,chars', mask: 'words' });
    gsap.timeline()
      .from(split.chars, { yPercent: 110, rotation: 6, stagger: 0.025, duration: 0.8 })
      .from('#hero-sub', { y: 20, autoAlpha: 0 }, '-=0.5')
      .from('.swatch', { scale: 0, stagger: 0.06, duration: 0.4, ease: 'back.out(1.7)' }, '-=0.3')
      .from('.throttle', { x: 40, autoAlpha: 0 }, '<');
  }

  const loader = $('#loader');
  if (reduceMotion) {
    loader.remove();
  } else {
    const needle = $('#tach-needle');
    const rpmEl = $('#loader-rpm');
    const rpm = { v: 0 };
    const showRpm = () => { rpmEl.textContent = rpm.v.toFixed(1); };
    gsap.set(needle, { rotation: -90, svgOrigin: '100 110' });
    gsap.timeline({ onComplete: () => loader.remove() })
      .to(needle, { rotation: 80, duration: 1, ease: 'power3.in' }, 0.2)
      .to(rpm, { v: 13.6, duration: 1, ease: 'power3.in', onUpdate: showRpm }, '<')
      .to(needle, { rotation: -60, duration: 0.5, ease: 'back.out(2)' })
      .to(rpm, { v: 2, duration: 0.5, ease: 'power2.out', onUpdate: showRpm }, '<')
      .to(loader, { yPercent: -100, duration: 0.8, ease: 'throttle' }, '+=0.1')
      .add(heroIntro, '-=0.35');
  }

  // ---------- Scroll progress bar with a rider on it ----------
  const rider = $('#progress-rider');
  const riderSvg = $('svg', rider);
  const riderWheels = $$('.wheel', rider);
  const riderX = gsap.quickTo(rider, 'x', { duration: 0.4, ease: 'power3' });
  gsap.set(rider, { transformOrigin: '0% 100%' });
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      gsap.set('#progress-fill', { scaleX: self.progress });
      riderX(self.progress * (innerWidth - rider.offsetWidth));
      if (reduceMotion) return;
      const v = self.getVelocity();
      gsap.set(riderSvg, { scaleX: self.direction });
      gsap.to(rider, { rotation: gsap.utils.clamp(-14, 0, -Math.abs(v) / 120), duration: 0.3, overwrite: 'auto' });
      gsap.to(riderWheels, { rotation: `+=${v / 8}`, duration: 0.3, overwrite: 'auto' });
    },
  });
  ScrollTrigger.addEventListener('scrollEnd', () => gsap.to(rider, { rotation: 0, duration: 0.5, ease: 'back.out(2)' }));

  // ---------- Lineup: Flip filter ----------
  const cards = $$('.card');
  const chips = $$('.chip');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    const state = Flip.getState(cards);
    cards.forEach((c) => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.family !== f));
    Flip.from(state, {
      duration: reduceMotion ? 0 : 0.6,
      ease: 'throttle',
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.4 }),
      onLeave: (els) => gsap.to(els, { autoAlpha: 0, scale: 0.9, duration: 0.25, ease: 'power2.in' }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  }));

  // ---------- Heritage road: markers are placed on the path itself ----------
  const road = $('#road-base');
  const roadLen = road.getTotalLength();
  const stops = [0.1, 0.38, 0.64, 0.9];
  const NS = 'http://www.w3.org/2000/svg';
  const marks = stops.map((t, i) => {
    const p = road.getPointAtLength(roadLen * t);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'road-mark');
    g.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="12"/><text x="${p.x}" y="${p.y - 34}" text-anchor="middle"></text>`;
    g.lastChild.textContent = D.milestones[i]?.year ?? '';
    $('#road-marks').append(g);
    return g;
  });
  const roadRider = $('#road-rider');
  roadRider.innerHTML = bikeSVG('#a07aff', '#f1f4ea', 'x="-60" y="-72" width="120" height="72"');
  const roadWheels = $$('.wheel', roadRider);
  const items = $$('.milestone');
  const placeRider = (at) => gsap.set(roadRider, {
    motionPath: { path: road, align: road, alignOrigin: [0.5, 0.85], autoRotate: true, start: at, end: at },
  });

  // ---------- On the lift: each step flies the 3D camera to its part; the gauge fills as you go ----------
  // Created before the heritage pin so ScrollTrigger measures in page order.
  const liftTour = (id) => {
    window.liftPart = id; // bike3d.js picks this up if it finishes loading later
    window.bike3d?.tour(id);
  };
  const liftRail = $('#lift-rail');
  ScrollTrigger.create({
    trigger: '#lift-steps',
    start: 'top 60%',
    end: 'bottom 60%',
    onUpdate: (self) => liftRail.style.setProperty('--lift', self.progress.toFixed(3)),
    onToggle: (self) => {
      liftRail.classList.toggle('is-on', self.isActive);
      if (!self.isActive) liftTour(null);
    },
  });
  $$('.lift-step').forEach((step) => ScrollTrigger.create({
    trigger: step,
    start: 'top 60%',
    end: 'bottom 60%',
    onToggle: (self) => { if (self.isActive) liftTour(step.dataset.part); },
  }));

  // ---------- Workbench: four "how it works" demos. Its ScrollTrigger is made before the heritage pin. ----------
  (() => {
    const css = getComputedStyle(root);
    const calm = reduceMotion ? 'power2.out' : null; // reduced motion: same moves, no overshoot or inertia
    let active = 'engine';
    const setCard = (demo, title, body, tag) => {
      const card = $(`#wb-card-${demo}`);
      if (tag !== undefined) $('.wb-tag', card).textContent = tag;
      $('h3', card).textContent = title;
      $('.wb-text', card).textContent = body;
    };

    // Tabs: click, or arrow keys / Home / End (selection follows focus)
    const tabs = $$('.wb-tab');
    function selectTab(tab, focus) {
      tabs.forEach((t) => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
      const panel = $('#' + tab.getAttribute('aria-controls'));
      $$('.wb-panel').forEach((p) => { p.hidden = p !== panel; });
      hold(false);
      active = tab.dataset.demo;
      if (focus) tab.focus();
      tab.parentElement.scrollTo({ left: tab.offsetLeft - 12, behavior: reduceMotion ? 'auto' : 'smooth' }); // phone: keep the tab in view
      if (!reduceMotion) gsap.fromTo(panel, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, overwrite: true });
    }
    tabs.forEach((t) => t.addEventListener('click', () => selectTab(t)));
    $('#wb-tabs').addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (i < 0 || to === undefined) return;
      e.preventDefault();
      selectTab(tabs[(to + tabs.length) % tabs.length], true);
    });

    // 1. Engine: the crank angle drives everything. 0° = piston at the top; one cycle = 720°.
    const E = W.engine;
    const engSvg = $('#wb-engine');
    const crank = $('#wb-crank');
    const rod = $('#wb-rod');
    const piston = $('#wb-piston');
    const gas = $('#wb-gas');
    const valveIn = $('#wb-valve-in');
    const valveEx = $('#wb-valve-ex');
    const spark = $('#wb-spark');
    const angleEl = $('#wb-angle');
    const CX = 160, CY = 290, THROW = 38, ROD = 100, PIN_TDC = 152;
    let stroke = -1;
    gsap.set(crank, { svgOrigin: `${CX} ${CY}` });

    function drawEngine() {
      const deg = gsap.getProperty(crank, 'rotation');
      const a = (deg * Math.PI) / 180;
      const px = CX + THROW * Math.sin(a);
      const py = CY - THROW * Math.cos(a);
      const pinY = py - Math.sqrt(ROD * ROD - (px - CX) ** 2); // piston pin stays on the cylinder axis
      gsap.set(piston, { y: pinY - PIN_TDC });
      rod.setAttribute('x1', px.toFixed(1));
      rod.setAttribute('y1', py.toFixed(1));
      rod.setAttribute('y2', pinY.toFixed(1));
      gas.setAttribute('height', Math.max(0, pinY - 20 - 116).toFixed(1));
      const ph = ((deg % 720) + 720) % 720;
      const lift = (from) => (ph >= from && ph < from + 180 ? Math.sin(((ph - from) / 180) * Math.PI) * 11 : 0);
      gsap.set(valveIn, { y: lift(0) }); // intake stroke 0-180°
      gsap.set(valveEx, { y: lift(540) }); // exhaust stroke 540-720°
      spark.setAttribute('opacity', ph > 348 && ph < 400 ? 1 : 0);
      const s = Math.floor(ph / 180);
      const shown = Math.round(ph);
      angleEl.textContent = `${shown}°`;
      engSvg.setAttribute('aria-valuenow', shown);
      engSvg.setAttribute('aria-valuetext', `${E.strokes[s].name}, ${shown}°`);
      if (s !== stroke) {
        stroke = s;
        engSvg.dataset.stroke = s;
        setCard('engine', E.strokes[s].name, E.strokes[s].text, E.step.replace('{n}', s + 1));
      }
    }
    let keyTurn = null;
    let turnTo = 0;
    // onPress: grabbing the crank stops a key turn, otherwise the tween and the drag fight over the angle
    const [crankDrag] = Draggable.create(crank, { type: 'rotation', inertia: !reduceMotion, onPress: () => { keyTurn?.kill(); keyTurn = null; }, onDrag: drawEngine, onThrowUpdate: drawEngine });
    engSvg.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 15, ArrowUp: 15, ArrowLeft: -15, ArrowDown: -15, PageUp: 180, PageDown: -180 }[e.key];
      if (!step) return;
      e.preventDefault();
      crankDrag.tween?.kill(); // stop a throw that is still spinning
      turnTo = (keyTurn && keyTurn.progress() < 1 ? turnTo : gsap.getProperty(crank, 'rotation')) + step; // not isActive(): it is false until the first frame, so fast presses would reset
      keyTurn = gsap.to(crank, { rotation: turnTo, duration: 0.35, ease: 'power2.out', overwrite: true, onUpdate: drawEngine, onComplete: () => crankDrag.update() });
    });
    drawEngine();

    // 2. Gearbox: teeth always add up to 50 (module 5), so the centres stay 125 apart and the gears stay meshed
    const G = W.gearbox;
    const gearIn = $('#wb-gear');
    const g1 = $('#wb-g1');
    const g2 = $('#wb-g2');
    const MOD = 5, GX = 88, GY = 125, DIST = 125;
    const gs = { n: 14, off: 16, a: 0, freeA: 0 };
    let gi = 1; // index in G.gears, 1 = neutral
    let lastA2 = 0;
    let drawn = '';
    function gearPath(n, r) {
      const rr = r - MOD;
      const ro = r + MOD * 0.9;
      const s = (Math.PI * 2) / n;
      let d = '';
      for (let i = 0; i < n; i++) {
        [[rr, -0.5], [rr, -0.27], [ro, -0.13], [ro, 0.13], [rr, 0.27]].forEach(([rad, f], k) => {
          const t = (i + f) * s;
          d += `${i || k ? 'L' : 'M'}${(rad * Math.cos(t)).toFixed(1)} ${(rad * Math.sin(t)).toFixed(1)}`;
        });
      }
      return `${d}Z`;
    }
    function drawGears() {
      const n1 = Math.round(gs.n);
      const n2 = 50 - n1;
      const r1 = (MOD * gs.n) / 2;
      const r2 = (MOD * (50 - gs.n)) / 2;
      const key = `${n1}|${r1.toFixed(2)}`;
      if (key !== drawn) {
        drawn = key;
        $('path', g1).setAttribute('d', gearPath(n1, r1));
        $('path', g2).setAttribute('d', gearPath(n2, r2));
        $('.wb-mark', g1).setAttribute('cx', (r1 * 0.6).toFixed(1));
        $('.wb-mark', g2).setAttribute('cx', (r2 * 0.6).toFixed(1));
      }
      // a driver tooth at 0 rad meets a driven gap at PI rad
      lastA2 = gi === 1 ? gs.freeA : -(n1 / n2) * gs.a + Math.PI - Math.PI / n2;
      g1.setAttribute('transform', `translate(${GX} ${GY}) rotate(${((gs.a * 180) / Math.PI).toFixed(2)})`);
      g2.setAttribute('transform', `translate(${(GX + DIST + gs.off).toFixed(2)} ${GY}) rotate(${((lastA2 * 180) / Math.PI).toFixed(2)})`);
    }
    function shift() {
      const i = +gearIn.value;
      const g = G.gears[i];
      if (i === 1) gs.freeA = lastA2; // the wheel-side gear stops where it is
      gi = i;
      gearIn.setAttribute('aria-valuetext', g.name);
      if (g.teeth) gsap.to(gs, { n: g.teeth[0], duration: 0.6, ease: calm || 'back.out(1.6)', overwrite: 'auto', onUpdate: drawGears });
      gsap.to(gs, { off: i === 1 ? 16 : 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto', onUpdate: drawGears });
      g2.classList.toggle('is-free', i === 1);
      setCard('gearbox', g.name, g.text, g.teeth ? `${G.ratio} ${(g.teeth[1] / g.teeth[0]).toFixed(2)} : 1` : G.free);
    }
    gearIn.addEventListener('input', shift);
    shift();
    drawGears();

    // 3. Brakes: hold to squeeze; the wheel slows, the disc heats, the fork dips while the bike decelerates
    const B = W.brakes;
    const brakeBtn = $('#wb-brake-btn');
    const disc = $('#wb-disc');
    const discs = $$('#wb-brakes .wb-disc');
    const padL = $('#wb-pad-l');
    const padR = $('#wb-pad-r');
    const upper = $('#wb-upper');
    const lever = $('#wb-lever');
    const hose = $('#wb-hose');
    const heatColor = gsap.utils.interpolate(css.getPropertyValue('--color-metal').trim(), css.getPropertyValue('--color-hot').trim());
    const bs = { p: 0, v: 1, heat: 0, dip: 0, ang: 0 };
    let held = false;
    let bState = '';
    let dipGoal = 0;
    function drawBrakes() {
      const fill = heatColor(gsap.utils.clamp(0, 1, bs.heat));
      discs.forEach((d) => { d.style.fill = fill; });
      gsap.set(padL, { x: -(1 - bs.p) * 7 });
      gsap.set(padR, { x: (1 - bs.p) * 7 });
      gsap.set(upper, { y: bs.dip });
      gsap.set(lever, { rotation: bs.p * 9, svgOrigin: '258 60' });
      gsap.set(disc, { rotation: bs.ang, svgOrigin: '290 222' });
      hose.setAttribute('d', `M266 ${(64 + bs.dip).toFixed(1)}C268 ${(110 + bs.dip).toFixed(1)} 268 140 262 172`);
    }
    const pTo = gsap.quickTo(bs, 'p', { duration: 0.25, ease: 'power2.out', onUpdate: drawBrakes });
    const dipTo = gsap.quickTo(bs, 'dip', { duration: reduceMotion ? 0.3 : 0.6, ease: calm || 'back.out(2.2)', onUpdate: drawBrakes });
    function hold(on) {
      if (held === on) return;
      held = on;
      brakeBtn.setAttribute('aria-pressed', String(on));
      hose.classList.toggle('is-on', on);
      pTo(on ? 1 : 0);
    }
    function brakeTick(dt) {
      bs.v = held ? Math.max(0, bs.v - dt * 0.55 * bs.p) : Math.min(1, bs.v + dt * 0.3);
      bs.heat = Math.min(1.3, Math.max(0, bs.heat + dt * (held ? bs.v * bs.p * 0.7 : 0) - dt * 0.05));
      if (!reduceMotion) bs.ang += bs.v * dt * 420;
      const goal = held ? (bs.v > 0.02 ? 14 : 4) : 0;
      if (goal !== dipGoal) dipTo((dipGoal = goal));
      const s = held ? (bs.v > 0.02 ? 'braking' : 'stopped') : bs.heat > 0.15 ? 'cooling' : 'rolling';
      if (s !== bState) {
        bState = s;
        setCard('brakes', B.states[s].name, B.states[s].text);
      }
      drawBrakes();
    }
    brakeBtn.addEventListener('pointerdown', (e) => { brakeBtn.setPointerCapture(e.pointerId); hold(true); });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach((t) => brakeBtn.addEventListener(t, () => hold(false)));
    brakeBtn.addEventListener('contextmenu', (e) => e.preventDefault()); // long press on touch
    brakeBtn.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (!e.repeat) hold(true);
    });
    brakeBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') hold(false); });
    brakeTick(0);

    // 4. Suspension: the wheel follows the bump fast; the body gets a jolt, then the damper settles it
    const S = W.suspension;
    const bump = $('#wb-bump');
    const swheel = $('#wb-swheel');
    const sbody = $('#wb-sbody');
    const spring = $('#wb-spring');
    const rod2 = $('#wb-rod2');
    const road = $('#wb-road');
    const ss = { w: 0, b: 0 };
    let level = null;
    function drawSusp() {
      const { w, b } = ss;
      gsap.set(swheel, { y: -w });
      gsap.set(sbody, { y: -b });
      const top = 116 - b;
      const bot = 214 - w;
      let d = `M170 ${top.toFixed(1)}`;
      for (let i = 1; i <= 12; i++) d += `L${i === 12 ? 170 : 170 + (i % 2 ? -20 : 20)} ${(top + ((bot - top) * i) / 12).toFixed(1)}`;
      spring.setAttribute('d', d);
      rod2.setAttribute('y1', top.toFixed(1));
      rod2.setAttribute('y2', (168 - w).toFixed(1));
      const y = (326 - w).toFixed(1);
      road.setAttribute('d', `M0 326H60C120 326 110 ${y} 170 ${y}C230 ${y} 220 326 280 326H340`);
    }
    const wTo = gsap.quickTo(ss, 'w', { duration: 0.45, ease: 'power3.out', onUpdate: drawSusp });
    function onBump() {
      const v = +bump.value;
      const lvl = S.levels.find((l) => v <= l.upTo);
      bump.setAttribute('aria-valuetext', lvl.name);
      if (lvl !== level) {
        level = lvl;
        setCard('suspension', lvl.name, lvl.text);
      }
      const w = v * 0.4; // up to 40 units of wheel travel
      const rest = v * 0.06; // the body ends up a little higher on a bump
      wTo(w);
      gsap.killTweensOf(ss, 'b');
      if (reduceMotion) gsap.to(ss, { b: rest, duration: 0.45, ease: calm, onUpdate: drawSusp });
      else {
        gsap.timeline({ onUpdate: drawSusp })
          .to(ss, { b: ss.b + (w - ss.w) * 0.5, duration: 0.18, ease: 'power2.out' })
          .to(ss, { b: rest, duration: 1.5, ease: 'elastic.out(1, 0.35)' });
      }
    }
    bump.addEventListener('input', onBump);
    onBump();
    drawSusp();

    // One ticker for the spinning parts, running only while the workbench is on screen
    function tick(time, dtMs) {
      const dt = Math.min(dtMs, 50) / 1000;
      if (active === 'gearbox' && !reduceMotion) {
        gs.a += dt * 1.8;
        drawGears();
      }
      if (active === 'brakes') brakeTick(dt);
    }
    ScrollTrigger.create({
      trigger: '#workbench',
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        if (self.isActive) gsap.ticker.add(tick);
        else {
          gsap.ticker.remove(tick);
          hold(false);
        }
      },
    });
  })();

  // ---------- Motion that is skipped entirely when reduced motion is on ----------
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    root.classList.add('motion');

    // Section titles rise out of a mask, line by line
    $$('.split').forEach((h) => SplitText.create(h, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 105, stagger: 0.08, duration: 0.9,
        scrollTrigger: { trigger: h, start: 'top 85%', once: true },
      }),
    }));

    gsap.set('.reveal', { autoAlpha: 0, y: 30 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.7, overwrite: true }),
    });
    gsap.set(cards, { autoAlpha: 0, y: 60 });
    ScrollTrigger.batch(cards, {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.8, overwrite: true }),
    });

    // Lift cards slide up into place as their step arrives
    $$('.lift-step').forEach((step) => gsap.from($('.lift-card', step), {
      y: 70, rotation: -2, autoAlpha: 0, duration: 0.8,
      scrollTrigger: { trigger: step, start: 'top 85%', toggleActions: 'play none none reverse' },
    }));

    // Lineup hover: wheelie, wheels spin, name scrambles
    cards.forEach((card) => {
      const title = $('h3', card);
      const name = title.textContent;
      const tl = gsap.timeline({ paused: true })
        .to($('.bike-all', card), { rotation: -14, svgOrigin: '45 110', duration: 0.45, ease: 'back.out(2)' })
        .to($$('.wheel', card), { rotation: 360, duration: 0.6, ease: 'power2.out' }, 0);
      card.addEventListener('pointerenter', () => {
        tl.play();
        gsap.to(title, { scrambleText: { text: name, chars: 'upperCase', speed: 0.6 }, duration: 0.5 });
      });
      card.addEventListener('pointerleave', () => tl.reverse());
    });

    // Marquee: speed and direction follow how fast you scroll
    const loop = gsap.to('#marquee-track', { xPercent: -50, ease: 'none', duration: 20, repeat: -1 });
    loop.totalTime(loop.duration() * 50); // room to run backwards
    let speed = 1;
    let target = 1;
    ScrollTrigger.create({
      onUpdate: (self) => { target = self.direction * gsap.utils.clamp(1, 6, Math.abs(self.getVelocity()) / 300); },
    });
    const tick = () => {
      speed += (target - speed) * 0.1;
      target += (Math.sign(target) - target) * 0.04;
      loop.timeScale(speed);
    };
    gsap.ticker.add(tick);

    // Heritage: pin the section, draw the road and ride it with the scroll
    let active = -1;
    const show = (i) => {
      if (i === active) return;
      active = i;
      items.forEach((el, j) => gsap.to(el, j === i
        ? { autoAlpha: 1, y: 0, duration: 0.5, overwrite: true }
        : { autoAlpha: 0, y: -20, duration: 0.25, ease: 'power2.in', overwrite: true }));
      marks.forEach((m, j) => gsap.to($('circle', m), { fill: j <= i ? '#a07aff' : '#f8f5ef', scale: j === i ? 1.4 : 1, transformOrigin: '50% 50%', duration: 0.3, ease: 'back.out(2)' }));
    };
    gsap.set(items, { autoAlpha: 0, y: 30 });
    show(0);
    placeRider(0);
    gsap.timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: {
        trigger: '#heritage',
        start: 'top top',
        end: '+=2400',
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => show(Math.max(0, stops.findLastIndex((t) => self.progress >= t - 0.05))),
      },
    })
      .fromTo(['#road-base', '#road-line'], { drawSVG: '0%' }, { drawSVG: '100%' }, 0)
      .to(roadRider, { motionPath: { path: road, align: road, alignOrigin: [0.5, 0.85], autoRotate: true } }, 0)
      .to(roadWheels, { rotation: 360 * 10 }, 0)
      // On narrow screens the road is wider than the view, so pan along with the rider
      .fromTo('.road', { x: 0 }, { x: () => Math.min(0, innerWidth - $('.road').clientWidth) }, 0);

    // Workshop backdrop: the roller-door light band slides down and the tyre tracks roll with the scroll
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { start: 0, end: 'max', scrub: 0.5, invalidateOnRefresh: true } })
      .fromTo('#door-light', { yPercent: 0 }, { yPercent: 320 }, 0)
      .fromTo('#tyre-track', { backgroundPositionY: '0px' }, { backgroundPositionY: () => `${-ScrollTrigger.maxScroll(window) * 0.5}px` }, 0);

    return () => {
      root.classList.remove('motion');
      gsap.ticker.remove(tick);
    };
  });

  mm.add('(prefers-reduced-motion: reduce)', () => placeRider(0.97));

  // Nav highlight. Created after the heritage pin so the pin's extra scroll length is counted.
  $$('.site-nav a').forEach((a) => ScrollTrigger.create({
    trigger: a.getAttribute('href'),
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => a.classList.toggle('is-active', self.isActive),
  }));

  // ---------- Garage: drag and throw the bike ----------
  const strip = $('#strip');
  const sb = $('#strip-bike');
  const sbBody = $('.bike-all', sb);
  const sbWheels = $$('.wheel', sb);
  const speedo = $('#speedo');
  const maxX = () => strip.clientWidth - sb.offsetWidth;
  const WHEEL_CIRCUMFERENCE = 163; // px, wheel radius about 26px at this size

  function syncStrip() {
    const x = gsap.getProperty(sb, 'x');
    gsap.set(sbWheels, { rotation: (x / WHEEL_CIRCUMFERENCE) * 360 });
    const v = Math.abs(InertiaPlugin.getVelocity(sb, 'x') || 0);
    speedo.textContent = Math.round(v / 20);
    if (!reduceMotion) gsap.to(sbBody, { rotation: v > 1500 ? -16 : 0, svgOrigin: '45 110', duration: 0.3, overwrite: 'auto' });
    sb.setAttribute('aria-valuenow', String(Math.round((x / (maxX() || 1)) * 100)));
  }

  const [dragger] = Draggable.create(sb, {
    type: 'x',
    bounds: strip,
    inertia: true,
    edgeResistance: 0.85,
    onDrag: syncStrip,
    onThrowUpdate: syncStrip,
    onThrowComplete() {
      gsap.to(sbBody, { rotation: 0, svgOrigin: '45 110', duration: 0.5, ease: 'back.out(2)' });
      gsap.to(speedo, { textContent: 0, snap: { textContent: 1 }, duration: 0.4 });
    },
  });

  sb.addEventListener('keydown', (e) => {
    const x = gsap.getProperty(sb, 'x');
    const to = { ArrowRight: x + 60, ArrowLeft: x - 60, Home: 0, End: maxX() }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    gsap.to(sb, { x: gsap.utils.clamp(0, maxX(), to), duration: 0.4, onUpdate: syncStrip, onComplete: () => dragger.update() });
  });

  // ---------- Wheel cursor (fine pointers only) ----------
  if (matchMedia('(pointer: fine)').matches && !reduceMotion) {
    const cur = $('#cursor');
    const curSvg = $('svg', cur);
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    let lastX = 0;
    addEventListener('pointermove', (e) => {
      xTo(e.clientX);
      yTo(e.clientY);
      gsap.set(curSvg, { rotation: `+=${(e.clientX - lastX) * 2}`, transformOrigin: '50% 50%' });
      lastX = e.clientX;
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      cur.classList.toggle('is-hot', !!e.target.closest('a, button, input, .card, .strip-bike, canvas'));
    });
  }

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
})();

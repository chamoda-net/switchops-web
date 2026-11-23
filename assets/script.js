// SwitchOps Tech — shared behavior

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------
  // Preloader ("system boot"): plays once per browser session, on the
  // visitor's very first page. The inline script in <head> already hides
  // it instantly on every page after that, so by the time we get here on a
  // repeat view there's nothing left to animate — we just no-op.
  // ---------------------------------------------------------------------
  // Hero animations wait for this so they play as the boot screen lifts,
  // not unseen behind it. On repeat visits there's no boot, so it fires at once.
  let pageReady = false;
  const readyQueue = [];
  const whenReady = (fn) => (pageReady ? fn() : readyQueue.push(fn));
  const markReady = () => {
    if (pageReady) return;
    pageReady = true;
    readyQueue.splice(0).forEach((fn) => fn());
  };

  const preloader = document.getElementById('preloader');
  if (!preloader || preloader.classList.contains('done')) markReady();
  if (preloader && !preloader.classList.contains('done')) {
    const finishBoot = () => {
      sessionStorage.setItem('switchops-booted', '1');
      preloader.classList.add('done');
      markReady();
      setTimeout(() => preloader.remove(), 600);
    };

    if (reduceMotion || !Element.prototype.animate) {
      // No motion wanted (or a very old browser): skip straight to done.
      finishBoot();
    } else {
      // Boot sequence on the native Web Animations API: bar and ring fill in three
      // steps while the log lines appear, the mark pops, then the panel lifts away.
      const lines = preloader.querySelectorAll('.preloader-line');
      const ring = preloader.querySelector('.preloader-ring .fill');
      const barFill = preloader.querySelector('.preloader-bar-fill');
      const mark = preloader.querySelector('.preloader-mark img');
      const inner = preloader.querySelector('.preloader-inner');
      const EASE_OUT = 'cubic-bezier(.25,.46,.45,.94)';
      const EASE_IN_OUT = 'cubic-bezier(.455,.03,.515,.955)';
      const step = (el, from, to, delay, duration, easing) =>
        el && el.animate([from, to], { delay, duration, easing, fill: 'forwards' });
      const steps = [[0, 0.35, 0, 250, EASE_OUT], [0.35, 0.72, 250, 320, EASE_IN_OUT], [0.72, 1, 570, 250, EASE_OUT]];
      steps.forEach(([a, b, delay, dur, ease], i) => {
        step(barFill, { transform: `scaleX(${a})` }, { transform: `scaleX(${b})` }, delay, dur, ease);
        step(ring, { strokeDashoffset: 208 - 208 * a }, { strokeDashoffset: 208 - 208 * b }, delay, dur, ease);
        setTimeout(() => lines[i] && lines[i].classList.add('show'), delay + dur);
      });
      step(mark, { transform: 'scale(1)' }, { transform: 'scale(1.15)' }, 920, 110, EASE_OUT);
      step(mark, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }, 1030, 210, 'cubic-bezier(.34,1.56,.64,1)');
      const exit = step(inner, { opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }, 1400, 250, 'cubic-bezier(.55,.085,.68,.53)');
      if (exit) exit.onfinish = finishBoot;

      // Safety net: never let a stalled animation trap a visitor behind the loader.
      setTimeout(() => { if (!preloader.classList.contains('done')) finishBoot(); }, 4000);
    }
  }

  // ---------------------------------------------------------------------
  // Mobile menu: full-height panel, page scroll locked while open.
  // ---------------------------------------------------------------------
  const burger = document.querySelector('.burger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (burger && mobileMenu) {
    const setMenu = (open) => {
      mobileMenu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.documentElement.classList.toggle('menu-open', open);
    };
    burger.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
    mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) { setMenu(false); burger.focus(); }
    });
    // Rotating a tablet / widening the window past the breakpoint must not leave the page scroll-locked.
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }


  // Film grain canvas
  const canvas = document.getElementById('grain');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.random() * 255;
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    // Repeat the 128px tile at its natural size (fine grain) instead of stretching
    // one tile across the screen, which turned each noise pixel into a visible block.
    const tile = canvas.toDataURL('image/png');
    canvas.width = 1;
    canvas.height = 1;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.background = `url(${tile}) repeat`;
  }

  // Hero beam generator
  document.querySelectorAll('.hero-beams').forEach(container => {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const beam = document.createElement('span');
      beam.style.left = (Math.random() * 100) + '%';
      beam.style.animationDelay = (Math.random() * 5) + 's';
      beam.style.animationDuration = (4 + Math.random() * 4) + 's';
      beam.style.opacity = (0.1 + Math.random() * 0.3).toString();
      container.appendChild(beam);
    }
  });

  // ---------------------------------------------------------------------
  // Scroll-driven effects on native APIs: an IntersectionObserver reveals
  // content as it enters view, and a single requestAnimationFrame-throttled
  // scroll handler drives the progress bar, header state and hero parallax.
  // With prefers-reduced-motion everything is simply shown.
  // ---------------------------------------------------------------------
  document.querySelectorAll('.reveal-stagger').forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty('--stagger-i', i);
      child.classList.add('reveal');
    });
  });
  const revealEls = Array.from(document.querySelectorAll('.reveal'));

  const reveal = (el) => {
    el.classList.add('in');
    // Clear the cascade delay once the entrance has played, so later hover
    // transitions on the same element respond instantly.
    if (el.parentElement && el.parentElement.classList.contains('reveal-stagger')) {
      setTimeout(() => { el.style.transitionDelay = '0s'; }, 1200);
    }
  };
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in'));
  } else {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // A stagger group reveals all its children together as a cascade.
        if (el.classList.contains('reveal-stagger')) Array.from(el.children).forEach(reveal);
        else reveal(el);
        revealIO.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    const groups = Array.from(document.querySelectorAll('.reveal-stagger'));
    groups.forEach((g) => revealIO.observe(g));
    revealEls.filter((el) => !el.parentElement || !el.parentElement.classList.contains('reveal-stagger'))
      .forEach((el) => whenReady(() => revealIO.observe(el)));
  }

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);
  const header = document.querySelector('header.site');
  const parallax = reduceMotion ? [] : [
    ...Array.from(document.querySelectorAll('.hero-beams')).map((el) => ({ el, section: el.closest('section'), from: 0, to: 60 })),
    ...Array.from(document.querySelectorAll('.page-hero-photo')).map((el) => ({ el, section: el.closest('section'), from: -30, to: 40 }))
  ].filter((p) => p.section);
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (header) header.classList.toggle('scrolled', y > 80);
    parallax.forEach(({ el, section, from, to }) => {
      const r = section.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const t = Math.min(1, Math.max(0, -r.top / r.height));
      el.style.transform = `translate3d(0, ${(from + (to - from) * t).toFixed(1)}px, 0)`;
    });
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  // Jump links: sections below the fold render lazily (content-visibility), so
  // their real height is only known once reached and a smooth jump can land a
  // little off. When the scroll ends, settle exactly on the target.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    const id = link && link.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    const settle = () => {
      const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const delta = target.getBoundingClientRect().top - offset;
      if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: 'instant' });
    };
    const done = () => { settle(); setTimeout(settle, 250); };
    if ('onscrollend' in window) window.addEventListener('scrollend', done, { once: true });
    else setTimeout(done, 1000);
  });

  // Back-to-top button, fades in once you've scrolled a bit
  const toTop = document.createElement('button');
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 5l-7 7h4v7h6v-7h4z"/></svg>';
  document.body.appendChild(toTop);
  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  const toggleToTop = () => toTop.classList.toggle('show', window.scrollY > 600);
  document.addEventListener('scroll', toggleToTop, { passive: true });
  toggleToTop();

  // Inline YouTube-style video thumbnails: click swaps our thumbnail + play
  // button for YouTube's own standard embed <iframe>, so the video plays
  // right here in the card. This is a genuine click (user gesture), so
  // autoplay works with sound — no need to force mute.
  document.querySelectorAll('.video-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const id = thumb.dataset.ytId;
      if (!id) {
        console.warn('No YouTube video ID set — add one via data-yt-id="VIDEO_ID" on this .video-thumb element.');
        return;
      }
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&color=white`;
      iframe.title = 'YouTube video player';
      iframe.setAttribute('frameborder', '0');
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      thumb.innerHTML = '';
      thumb.appendChild(iframe);
    });
  });

  // Runs fn once, when el's top edge enters the lower part of the viewport.
  // Deliberately not a "% visible" threshold: a tall element in a short
  // viewport (landscape phone) can never reach 50%, which would leave its
  // content hidden forever. Edge-entry triggers for any element height.
  const onceVisible = (el, fn) => {
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
  };

  // ---------------------------------------------------------------------
  // Cursor spotlight: one delegated, rAF-throttled listener feeds --mx/--my
  // to whichever .spot element the pointer is over (vendor tiles are .spot
  // from vendors.js). Touch devices skip it entirely.
  // ---------------------------------------------------------------------
  document.querySelectorAll('.card, .security-cell').forEach((el) => el.classList.add('spot'));
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let frame = 0, lastEvent = null;
    document.addEventListener('pointermove', (e) => {
      lastEvent = e;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = lastEvent.target.closest && lastEvent.target.closest('.spot');
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${lastEvent.clientX - r.left}px`);
        el.style.setProperty('--my', `${lastEvent.clientY - r.top}px`);
      });
    }, { passive: true });
  }

  // ---------------------------------------------------------------------
  // Numbers count up; short codes "decode" like a terminal readout.
  // ---------------------------------------------------------------------
  const GLYPHS = '01#%&*+=<>ABCDEFHKLMNPRSTVXZ';
  const scramble = (el) => {
    const final = el.textContent, start = performance.now(), dur = 700;
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - start) / dur)); // rAF stamps can predate start
      const settled = Math.floor(p * final.length);
      el.textContent = [...final].map((ch, i) =>
        i < settled || /[\s/·.]/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      ).join('');
      if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };
  const countUp = (el) => {
    const raw = el.dataset.count, target = parseFloat(raw);
    const decimals = (raw.split('.')[1] || '').length, pad = +(el.dataset.pad || 0);
    const suffix = el.dataset.suffix || '';
    const start = performance.now(), dur = 900;
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - start) / dur)); // rAF stamps can predate start
      const eased = 1 - Math.pow(1 - p, 3); // ease-out: fast start, gentle landing
      el.textContent = (target * eased).toFixed(decimals).padStart(pad, '0') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!reduceMotion) {
    document.querySelectorAll('[data-count], [data-scramble]').forEach((el) => {
      const run = () => (el.hasAttribute('data-count') ? countUp(el) : scramble(el));
      onceVisible(el, () => whenReady(run));
    });
  }

  // ---------------------------------------------------------------------
  // Terminals type in line by line; mock dashboards fill their bars.
  // Both classes are added here, so without JS everything shows complete.
  // ---------------------------------------------------------------------
  if (!reduceMotion) {
    document.querySelectorAll('.terminal').forEach((term) => {
      term.classList.add('type-in');
      term.querySelectorAll('.t-line, .t-confidence').forEach((line, i) => line.style.setProperty('--i', i));
      onceVisible(term, () => term.classList.add('typed'));
    });
    document.querySelectorAll('.mock-app').forEach((app) => {
      app.classList.add('bars-armed');
      onceVisible(app, () => app.classList.add('is-visible'));
    });
  }

  // ---------------------------------------------------------------------
  // Live topology (homepage hero): packets flow continuously (SMIL), and a
  // scripted incident plays on a loop: ap-12 degrades → SwitchOps AI
  // diagnoses → config push → healthy. Runs only while the panel is on
  // screen and the tab is visible.
  // ---------------------------------------------------------------------
  const topoPanel = document.querySelector('.topo-panel');
  if (topoPanel) {
    const svg = topoPanel.querySelector('svg.topo');
    const log = topoPanel.querySelector('[data-topo-log]');
    const stateEl = topoPanel.querySelector('[data-topo-state]');
    const node = (id) => svg.querySelector(`[data-node="${id}"]`);
    const MAX_LINES = 4;
    let timers = [], cycle = 0, running = false;

    const wait = (ms) => new Promise((resolve) => timers.push(setTimeout(resolve, ms)));
    const addLine = (html, cls = '') => {
      log.querySelectorAll('.caret').forEach((c) => c.remove());
      const line = document.createElement('div');
      line.className = 'tl' + (cls ? ' ' + cls : '');
      line.innerHTML = html;
      log.appendChild(line);
      while (log.children.length > MAX_LINES) log.firstElementChild.remove();
      return line;
    };
    const typeCommand = (text) => new Promise((resolve) => {
      const line = addLine('', 'prompt');
      let i = 0;
      const step = () => {
        line.textContent = text.slice(0, ++i);
        const caret = document.createElement('span');
        caret.className = 'caret';
        line.appendChild(caret);
        if (i < text.length) timers.push(setTimeout(step, 26 + Math.random() * 38));
        else resolve();
      };
      step();
    });
    const setFault = (on) => {
      const ap = node('ap12');
      ap.classList.remove('fixed');
      ap.classList.toggle('warn', on);
      svg.querySelector('#lk-dista-ap12').classList.toggle('warn', on);
      svg.querySelectorAll('.pkt[data-link="dista-ap12"]').forEach((p) => p.classList.toggle('warn', on));
      topoPanel.classList.toggle('alert', on);
      stateEl.textContent = on ? '1 alert · diagnosing' : 'all systems operational';
    };

    const story = async (id) => {
      const live = () => id === cycle;
      await wait(2400); if (!live()) return;
      setFault(true);
      addLine('<span class="warn">! ap-12 · latency 480ms · loss 12%</span>');
      await wait(1300); if (!live()) return;
      await typeCommand('switchops diagnose ap-12'); if (!live()) return;
      await wait(450); if (!live()) return;
      addLine('&gt; correlating telemetry · history · baseline');
      await wait(1300); if (!live()) return;
      addLine('&gt; root cause: <span class="acc">PoE budget on dist-a/7</span> · 0.91');
      await wait(1500); if (!live()) return;
      await typeCommand('switchops config-push dist-a --poe'); if (!live()) return;
      await wait(600); if (!live()) return;
      addLine('&gt; pre-change backup committed · pushing');
      await wait(1200); if (!live()) return;
      setFault(false);
      void node('ap12').getBoundingClientRect(); // restart the flash animation
      node('ap12').classList.add('fixed');
      addLine('<span class="ok">✓ ap-12 healthy · resolved in 6.4s</span>');
      await wait(4200); if (!live()) return;
      await typeCommand('switchops status --all'); if (!live()) return;
      addLine('→ 10 devices · 9 links · <span class="ok">0 alerts</span>');
      story(id);
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      if (svg.unpauseAnimations) svg.unpauseAnimations();
      story(++cycle);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cycle++;
      timers.forEach(clearTimeout);
      timers = [];
      if (svg.pauseAnimations) svg.pauseAnimations();
      setFault(false);
    };

    if (reduceMotion) {
      if (svg.pauseAnimations) svg.pauseAnimations();
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? whenReady(start) : stop()));
      }, { threshold: 0.25 }).observe(topoPanel);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else if (topoPanel.getBoundingClientRect().top < window.innerHeight) whenReady(start);
      });
    } else {
      whenReady(start);
    }
  }

  // traininghub.lk hub (homepage Education): entrance once, then packets
  // stream and the tagline types through who it's for, only while on screen.
  const th = document.querySelector('[data-th-hub]');
  if (th) {
    const svg = th.querySelector('svg');
    const word = th.querySelector('.th-word');
    const WORDS = ['students.', 'working professionals.', 'career changers.', 'everyone willing to learn.'];
    const FINAL = WORDS[WORDS.length - 1];
    let running = false;
    let cycle = 0;
    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    const typeWord = (id, w) => {
      const text = WORDS[w];
      const last = w === WORDS.length - 1;
      let n = 0;
      const type = () => {
        if (id !== cycle) return;
        word.textContent = text.slice(0, ++n);
        if (n < text.length) later(type, 55);
        else later(erase, last ? 3800 : 1500);
      };
      const erase = () => {
        if (id !== cycle) return;
        word.textContent = text.slice(0, --n);
        if (n > 0) later(erase, 26);
        else later(() => typeWord(id, (w + 1) % WORDS.length), 260);
      };
      type();
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      if (svg.unpauseAnimations) svg.unpauseAnimations();
      const id = ++cycle;
      // The final phrase is already showing, so hold it, then erase into the loop.
      let n = word.textContent.length;
      const erase = () => {
        if (id !== cycle) return;
        word.textContent = FINAL.slice(0, --n);
        if (n > 0) later(erase, 26);
        else later(() => typeWord(id, 0), 260);
      };
      later(erase, 2600);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cycle++;
      timers.forEach(clearTimeout);
      timers = [];
      if (svg.pauseAnimations) svg.pauseAnimations();
      word.textContent = FINAL;
    };

    if (reduceMotion) {
      if (svg.pauseAnimations) svg.pauseAnimations();
    } else {
      th.classList.add('th-armed');
      if (svg.pauseAnimations) svg.pauseAnimations();
      onceVisible(th, () => whenReady(() => th.classList.add('is-in')));
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          entries.forEach((e) => (e.isIntersecting ? whenReady(start) : stop()));
        }, { threshold: 0.25 }).observe(th);
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) stop();
          else if (th.getBoundingClientRect().top < window.innerHeight) whenReady(start);
        });
      } else {
        th.classList.add('is-in');
        whenReady(start);
      }
    }
  }

  // DIMIC loop (homepage SwitchOps AI): the arc steps round the five stages.
  // The CSS timer bar is the clock: its animationend advances the stage, so
  // pausing the bar (hover, focus, off-screen, hidden tab) pauses the loop.
  const dm = document.querySelector('[data-dimic]');
  if (dm) {
    const svg = dm.querySelector('svg');
    const nodes = [...dm.querySelectorAll('.dm-node')];
    const spokes = [...dm.querySelectorAll('.dm-spoke')];
    const arc = dm.querySelector('.dm-arc');
    const ripple = dm.querySelector('.dm-ripple');
    const timerBar = dm.querySelector('.dm-timer i');
    const numEl = dm.querySelector('[data-dm-num]');
    const nameEl = dm.querySelector('[data-dm-name]');
    const valueEl = dm.querySelector('[data-dm-value]');
    const N = nodes.length;
    let turn = 0; // unbounded step count, so the arc always rotates the short way
    let swapTimer;
    const pause = { hover: false, focus: false, offscreen: true };

    const syncPause = () => {
      const away = pause.offscreen || document.hidden;
      dm.classList.toggle('is-paused', away || pause.hover || pause.focus);
      // Orbit packets keep moving while hovered; they only stop when nobody can see them.
      if (svg.pauseAnimations && !reduceMotion) (away ? svg.pauseAnimations() : svg.unpauseAnimations());
    };
    // Restarts a CSS animation by toggling a class (SVG) or the inline animation (HTML).
    const restart = (el, cls) => {
      if (cls) { el.classList.remove(cls); void dm.offsetWidth; el.classList.add(cls); return; }
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    };
    const select = (i) => {
      const cur = ((turn % N) + N) % N;
      if (i === cur) return;
      let delta = i - cur;
      if (delta > N / 2) delta -= N;
      if (delta < -N / 2) delta += N;
      turn += delta;
      arc.style.transform = `rotate(${72 * turn - 162}deg)`;
      nodes.forEach((n, k) => {
        n.classList.toggle('is-active', k === i);
        n.setAttribute('aria-pressed', String(k === i));
        spokes[k].classList.toggle('is-active', k === i);
      });
      numEl.textContent = String(i + 1).padStart(2, '0');
      nameEl.textContent = nodes[i].dataset.name.toUpperCase();
      clearTimeout(swapTimer);
      if (reduceMotion) {
        valueEl.textContent = nodes[i].dataset.value;
      } else {
        valueEl.classList.add('swap');
        swapTimer = setTimeout(() => { valueEl.textContent = nodes[i].dataset.value; valueEl.classList.remove('swap'); }, 180);
        restart(ripple, 'is-on');
      }
      restart(timerBar);
    };

    nodes.forEach((node, i) => {
      node.addEventListener('click', () => select(i));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
      });
      node.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') select(i); });
    });
    dm.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { pause.hover = true; syncPause(); } });
    dm.addEventListener('pointerleave', () => { pause.hover = false; syncPause(); });
    dm.addEventListener('focusin', () => { pause.focus = true; syncPause(); });
    dm.addEventListener('focusout', (e) => { if (!dm.contains(e.relatedTarget)) { pause.focus = false; syncPause(); } });

    if (reduceMotion) {
      if (svg.pauseAnimations) svg.pauseAnimations();
    } else {
      timerBar.addEventListener('animationend', () => select((((turn % N) + N) % N + 1) % N));
      document.addEventListener('visibilitychange', syncPause);
      syncPause();
      onceVisible(dm, () => whenReady(() => dm.classList.add('is-playing')));
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          entries.forEach((e) => { pause.offscreen = !e.isIntersecting; syncPause(); });
        }).observe(dm);
      } else {
        pause.offscreen = false; syncPause();
      }
    }
  }

  // Legal pages: the contents list follows the section being read, collapses on
  // small screens, and the print button opens the browser's print / PDF dialog.
  const legalToc = document.querySelector('.legal-toc');
  if (legalToc) {
    const details = legalToc.querySelector('details');
    const small = window.matchMedia('(max-width: 900px)');
    if (details && small.matches) details.open = false;
    const tocLinks = new Map(Array.from(legalToc.querySelectorAll('a[href^="#"]')).map((a) => [a.getAttribute('href').slice(1), a]));
    tocLinks.forEach((a) => a.addEventListener('click', () => { if (details && small.matches) details.open = false; }));
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          tocLinks.forEach((a) => a.classList.remove('active'));
          const link = tocLinks.get(e.target.id);
          if (link) link.classList.add('active');
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      document.querySelectorAll('.legal-sec').forEach((s) => spy.observe(s));
    }
    const printBtn = legalToc.querySelector('[data-print]');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  }

  // Network & Infrastructure: photo pins light up with their list item, the jump links
  // follow the section on screen, and the audio visual rooms become tabs (all rooms
  // stay visible when JavaScript is off).
  document.querySelectorAll('.sol-grid, .av-panel').forEach((group) => {
    group.querySelectorAll('[data-pin]').forEach((el) => {
      const mark = (on) => group.querySelectorAll('.pin[data-pin="' + el.dataset.pin + '"]').forEach((p) => p.classList.toggle('on', on));
      el.addEventListener('pointerenter', () => mark(true));
      el.addEventListener('pointerleave', () => mark(false));
    });
  });

  const solNav = document.querySelector('.sol-nav');
  if (solNav && 'IntersectionObserver' in window) {
    const bar = solNav.querySelector('ul');
    const solLinks = new Map(Array.from(solNav.querySelectorAll('a')).map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const link = solLinks.get(e.target.id);
        link.classList.toggle('active', e.isIntersecting);
        if (e.isIntersecting) bar.scrollTo({ left: link.offsetLeft - bar.offsetLeft - 24, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }, { rootMargin: '-30% 0px -69% 0px' });
    solLinks.forEach((a, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  const av = document.querySelector('[data-av]');
  if (av) {
    const list = av.querySelector('.av-tabs');
    const tabs = Array.from(av.querySelectorAll('.av-tab'));
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const select = (i, animate) => tabs.forEach((t, n) => {
      const on = n === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[n].hidden = !on;
      panels[n].classList.toggle('enter', on && animate);
    });
    av.classList.add('av-ready');
    list.hidden = false;
    panels.forEach((p, i) => {
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', tabs[i].id);
    });
    select(0, false);
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, true));
      t.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = (i + step + tabs.length) % tabs.length;
        select(next, true);
        tabs[next].focus();
      });
    });
    // Links such as #led-walls open the right room, then scroll to it.
    const openFromHash = () => {
      const i = panels.findIndex((p) => '#' + p.id === location.hash);
      if (i < 0) return;
      select(i, false);
      panels[i].scrollIntoView({ behavior: 'auto', block: 'start' });
      list.scrollTo({ left: tabs[i].offsetLeft - list.offsetLeft - 24 });
    };
    window.addEventListener('hashchange', openFromHash);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', () => {
      if (a.hash === location.hash) openFromHash();   // same link twice: no hashchange fires
    }));
    openFromHash();
  }

  // User guide: search filters the chapters (and highlights every match where the
  // browser supports the CSS Highlight API), "/" focuses search, and each command
  // block has a copy button.
  const guide = document.querySelector('[data-guide]');
  if (guide) {
    const input = guide.querySelector('#g-search');
    const status = guide.querySelector('.g-search-status');
    const empty = guide.querySelector('.g-empty');
    const quick = guide.querySelector('.g-quick');
    const details = guide.querySelector('.legal-toc details');
    const chapters = Array.from(guide.querySelectorAll('.g-chap'));
    const texts = chapters.map((c) => c.textContent.toLowerCase());
    const items = new Map(Array.from(guide.querySelectorAll('.legal-toc a[href^="#"]')).map((a) => [a.getAttribute('href').slice(1), a.parentElement]));
    const canHighlight = window.CSS && CSS.highlights && typeof Highlight === 'function';
    let timer;
    const run = () => {
      const typed = input.value.trim();
      const q = typed.toLowerCase();
      let hits = 0;
      chapters.forEach((c, i) => {
        const match = !q || texts[i].includes(q);
        c.hidden = !match;
        if (items.has(c.id)) items.get(c.id).hidden = !match;
        if (q && match) hits++;
      });
      if (quick) quick.hidden = !!q;
      empty.hidden = !q || hits > 0;
      empty.querySelector('span').textContent = typed;
      status.textContent = !q ? '' : hits ? `${hits} chapter${hits > 1 ? 's' : ''} mention “${typed}”` : 'No matches';
      if (q && details) details.open = true;
      if (!canHighlight) return;
      CSS.highlights.delete('g-hit');
      if (q.length < 2) return;
      const ranges = [];
      chapters.forEach((c) => {
        if (c.hidden) return;
        const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const t = n.nodeValue.toLowerCase();
          for (let i = t.indexOf(q); i > -1; i = t.indexOf(q, i + q.length)) {
            const r = new Range();
            r.setStart(n, i);
            r.setEnd(n, i + q.length);
            ranges.push(r);
          }
        }
      });
      if (ranges.length) CSS.highlights.set('g-hit', new Highlight(...ranges));
    };
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
    input.addEventListener('search', run);   // the field's own clear (×) button
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = chapters.find((c) => !c.hidden);
        if (first) { input.blur(); first.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
      } else if (e.key === 'Escape') { input.value = ''; run(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(input|textarea|select)$/i.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
      e.preventDefault();
      input.focus();
    });
    guide.querySelectorAll('.g-copy').forEach((btn) => btn.addEventListener('click', async () => {
      const codeEl = btn.closest('.g-code').querySelector('code');
      try {
        await navigator.clipboard.writeText(codeEl.innerText);
        btn.textContent = 'Copied';
      } catch (_) {
        window.getSelection().selectAllChildren(codeEl);   // no clipboard access: select it for Ctrl+C
        btn.textContent = 'Selected';
      }
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    }));
  }

  // Product tour: screenshot tabs (click, or arrow keys between tabs).
  document.querySelectorAll('[data-tour]').forEach((tour) => {
    const tabs = Array.from(tour.querySelectorAll('.tour-tab'));
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !on;
        panel.classList.toggle('active', on);
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        select(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length], true);
      });
    });
  });

  // Analytics (Google Analytics 4), loaded only after the visitor opts in, as the
  // Privacy Policy (section 12) describes. Paste the Measurement ID ("G-XXXXXXX")
  // to switch it on; while it is empty no banner shows and nothing is loaded.
  const GA_MEASUREMENT_ID = 'G-4D6GZ91PVE';
  if (GA_MEASUREMENT_ID) {
    const CONSENT_KEY = 'switchops-analytics-consent';
    const getChoice = () => { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } };
    const setChoice = (v) => { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* storage blocked */ } };
    const loadAnalytics = () => {
      window['ga-disable-' + GA_MEASUREMENT_ID] = false;
      if (window.gtag) return;
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID); // GA4 never stores full IP addresses
    };
    // Declining (or withdrawing consent later) also removes any analytics cookies already set.
    const clearAnalyticsCookies = () => {
      document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga/.test(n)).forEach((n) => {
        ['', '; domain=.' + location.hostname, '; domain=' + location.hostname].forEach((d) => {
          document.cookie = n + '=; Max-Age=0; path=/' + d;
        });
      });
    };
    const banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie preferences');
    banner.innerHTML = '<p>We use optional analytics cookies to understand how visitors use this site. Strictly necessary cookies are always on. <a href="/privacy#p-12">Cookie details</a></p>'
      + '<div class="consent-actions"><button type="button" class="btn btn-outline" data-consent="denied">Decline</button>'
      + '<button type="button" class="btn btn-primary" data-consent="granted">Accept analytics</button></div>';
    const showBanner = () => {
      if (!banner.isConnected) document.body.appendChild(banner);
      requestAnimationFrame(() => banner.classList.add('show'));
    };
    banner.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-consent]');
      if (!btn) return;
      setChoice(btn.dataset.consent);
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 300);
      if (btn.dataset.consent === 'granted') loadAnalytics();
      else { window['ga-disable-' + GA_MEASUREMENT_ID] = true; clearAnalyticsCookies(); }
    });
    const choice = getChoice();
    if (choice === 'granted') loadAnalytics();
    else if (!choice) showBanner();
    // "Cookie settings" in the footer's Legal column lets visitors change their mind.
    document.querySelectorAll('.footer-grid h4').forEach((h4) => {
      if (h4.textContent.trim() !== 'Legal') return;
      const li = document.createElement('li');
      li.innerHTML = '<a href="#" data-cookie-settings>Cookie settings</a>';
      h4.nextElementSibling.appendChild(li);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-cookie-settings]')) return;
      e.preventDefault();
      showBanner();
    });
  }

  // Tabs (solutions showcase)
  document.querySelectorAll('.tabs-widget').forEach(widget => {
    const btns = widget.querySelectorAll('.tab-btn');
    const panels = widget.querySelectorAll('.tab-panel');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = widget.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"]`);
        panel.classList.add('active');
        // Replay the bar fill each time a tab is opened.
        const app = panel.querySelector('.mock-app.bars-armed');
        if (app) {
          app.classList.remove('is-visible');
          void app.offsetWidth;
          requestAnimationFrame(() => app.classList.add('is-visible'));
        }
      });
    });
  });

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    q.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      item.closest('.faq-list').querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // Contact form: posts to send.php (PHP mail() on Hostinger) and shows the
  // result inline. Without JavaScript the form still posts normally and
  // send.php redirects back to #sent or #send-failed.
  const form = document.getElementById('contact-form');
  if (form) {
    const submitBtn = form.querySelector('[type="submit"]');
    const okBox = document.getElementById('sent');
    const errBox = document.getElementById('send-failed');
    const errDefault = errBox.innerHTML;
    const started = form.querySelector('[name="started"]');
    const stamp = () => { if (started) started.value = String(Date.now()); };
    stamp();

    // "Book a demo" links pass ?interest=… so the right option is pre-selected.
    const wanted = new URLSearchParams(location.search).get('interest');
    const select = form.querySelector('[name="interest"]');
    if (wanted && select) {
      const match = Array.from(select.options).find((o) => o.value === wanted);
      if (match) select.value = match.value;
    }

    const show = (box, text) => {
      okBox.classList.remove('show');
      errBox.classList.remove('show');
      if (text) box.textContent = text;
      else if (box === errBox) box.innerHTML = errDefault;
      box.classList.add('show');
      box.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitBtn.disabled) return;
      const label = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = 'Sending…';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => null);
        if (res.ok && data && data.ok) {
          show(okBox, data.message);
          form.reset();
          stamp();
        } else {
          show(errBox, data && data.message);
        }
      } catch (err) {
        show(errBox);
      } finally {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        submitBtn.textContent = label;
      }
    });
  }
});

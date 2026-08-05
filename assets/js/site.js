/* Protégé site behavior. No dependencies, no scroll listeners. */
(function () {
  "use strict";

  /* Tell the inline head script we made it. If this file never runs, that
     script drops the .js flag and every .reveal ships visible. */
  window.__protegeReady = true;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Nav hairline: the sentinel is 96px tall so it stays taller than the
     observer's negative rootMargin. A shorter sentinel can never intersect,
     which leaves the nav stuck in its scrolled state from first paint. */
  var sentinel = document.getElementById("navSentinel");
  var nav = document.querySelector(".nav");
  if (sentinel && nav && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        nav.classList.toggle("is-stuck", !entries[0].isIntersecting);
      },
      { rootMargin: "-60px 0px 0px 0px" }
    ).observe(sentinel);
  }

  /* Logo marquee: WCAG 2.2.2 wants a real control, not just :hover. */
  var marquee = document.querySelector(".logo-marquee");
  var toggle = document.querySelector("[data-marquee-toggle]");
  if (marquee && toggle) {
    toggle.addEventListener("click", function () {
      var paused = marquee.classList.toggle("is-paused");
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.textContent = paused ? "Play" : "Pause";
    });
    if (reduce) {
      marquee.classList.add("is-paused");
      toggle.setAttribute("aria-pressed", "true");
      toggle.textContent = "Play";
    }
  }

  /* Interactive dot field.
     Ported from the React/GSAP DotGrid behaviour without the libraries: dots
     tint toward heat inside `proximity`, a fast pointer shoves the ones it
     passes, and a click sends a shockwave. Instead of GSAP's inertia plugin
     each dot is a damped spring integrated per frame, which gives the same
     throw-and-settle for a few lines of arithmetic.

     Two things keep it cheap: untinted dots are drawn as ONE path with a
     single fill, and the loop parks itself when every dot is at rest and the
     pointer has left. */
  var canvas = document.querySelector(".hero .field");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d", { alpha: true });

    var GAP = 22;          // lattice pitch, css px
    var DOT = 1.6;         // dot radius at rest
    var PROXIMITY = 130;   // tint + shove radius around the pointer
    var SPEED_TRIGGER = 90;
    var MAX_SPEED = 4200;
    var SHOCK_RADIUS = 260;
    var SHOCK_STRENGTH = 6;
    var STIFF = 0.055;     // spring back toward home
    var DAMP = 0.86;       // velocity retained per frame

    var dots = [];         // flat: x, y, ox, oy, vx, vy
    var STRIDE = 6;
    var w = 0, h = 0, dpr = 1, raf = null, live = false;
    var ptr = { x: -9999, y: -9999, vx: 0, vy: 0, speed: 0, t: 0, lx: 0, ly: 0, inside: false };

    function build() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      if (!w || !h) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots.length = 0;
      var cols = Math.floor(w / GAP), rows = Math.floor(h / GAP);
      var padX = (w - (cols - 1) * GAP) / 2, padY = (h - (rows - 1) * GAP) / 2;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          dots.push(padX + c * GAP, padY + r * GAP, 0, 0, 0, 0);
        }
      }
      return true;
    }

    function shove(cx, cy, radius, strength, vx, vy) {
      var r2 = radius * radius;
      for (var i = 0; i < dots.length; i += STRIDE) {
        var dx = dots[i] - cx, dy = dots[i + 1] - cy;
        var d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        var d = Math.sqrt(d2) || 0.001;
        var falloff = 1 - d / radius;
        var f = falloff * falloff * strength;
        dots[i + 4] += (dx / d) * f + (vx || 0) * 0.00035 * falloff;
        dots[i + 5] += (dy / d) * f + (vy || 0) * 0.00035 * falloff;
      }
      wake();
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      var px = ptr.x, py = ptr.y, prox2 = PROXIMITY * PROXIMITY;
      var moving = false;
      var tinted = [];

      ctx.beginPath();
      for (var i = 0; i < dots.length; i += STRIDE) {
        // damped spring back to the lattice position
        var ox = dots[i + 2], oy = dots[i + 3];
        var vx = (dots[i + 4] - ox * STIFF) * DAMP;
        var vy = (dots[i + 5] - oy * STIFF) * DAMP;
        ox += vx; oy += vy;
        dots[i + 2] = ox; dots[i + 3] = oy; dots[i + 4] = vx; dots[i + 5] = vy;
        if (!moving && (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02 ||
                        Math.abs(ox) > 0.05 || Math.abs(oy) > 0.05)) moving = true;

        var x = dots[i] + ox, y = dots[i + 1] + oy;
        var ddx = dots[i] - px, ddy = dots[i + 1] - py;
        var d2 = ddx * ddx + ddy * ddy;

        if (ptr.inside && d2 <= prox2) {
          tinted.push(x, y, 1 - Math.sqrt(d2) / PROXIMITY);
        } else {
          ctx.moveTo(x + DOT, y);
          ctx.arc(x, y, DOT, 0, 6.2832);
        }
      }
      ctx.fillStyle = "rgba(38,38,38,0.16)";
      ctx.fill();

      for (var k = 0; k < tinted.length; k += 3) {
        var t = tinted[k + 2];
        ctx.beginPath();
        ctx.arc(tinted[k], tinted[k + 1], DOT + t * 1.6, 0, 6.2832);
        ctx.fillStyle = "rgba(250,93,25," + (0.16 + t * 0.72).toFixed(3) + ")";
        ctx.fill();
      }

      return moving || ptr.inside;
    }

    function loop() {
      var busy = frame();
      if (busy) { raf = requestAnimationFrame(loop); }
      else { raf = null; live = false; }
    }

    function wake() {
      if (reduce) { frame(); return; }
      if (!raf) { live = true; raf = requestAnimationFrame(loop); }
    }

    function start() {
      if (!build()) return;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      frame();
      if (!reduce) wake();
    }

    start();

    if (!reduce && !window.matchMedia("(pointer: coarse)").matches) {
      window.addEventListener("pointermove", function (ev) {
        var rect = canvas.getBoundingClientRect();
        var now = ev.timeStamp || performance.now();
        var dt = ptr.t ? now - ptr.t : 16;
        var dx = ev.clientX - ptr.lx, dy = ev.clientY - ptr.ly;
        var vx = (dx / dt) * 1000, vy = (dy / dt) * 1000;
        var speed = Math.hypot(vx, vy);
        if (speed > MAX_SPEED) { var s = MAX_SPEED / speed; vx *= s; vy *= s; speed = MAX_SPEED; }
        ptr.t = now; ptr.lx = ev.clientX; ptr.ly = ev.clientY;
        ptr.vx = vx; ptr.vy = vy; ptr.speed = speed;
        ptr.x = ev.clientX - rect.left;
        ptr.y = ev.clientY - rect.top;
        ptr.inside = ptr.x > -PROXIMITY && ptr.x < w + PROXIMITY &&
                     ptr.y > -PROXIMITY && ptr.y < h + PROXIMITY;
        if (ptr.inside && speed > SPEED_TRIGGER) {
          shove(ptr.x, ptr.y, PROXIMITY, 0.55, vx, vy);
        } else if (ptr.inside) wake();
      }, { passive: true });

      window.addEventListener("pointerdown", function (ev) {
        var rect = canvas.getBoundingClientRect();
        var cx = ev.clientX - rect.left, cy = ev.clientY - rect.top;
        if (cy < -SHOCK_RADIUS || cy > h + SHOCK_RADIUS) return;
        shove(cx, cy, SHOCK_RADIUS, SHOCK_STRENGTH * 0.9, 0, 0);
      }, { passive: true });
    }

    /* ResizeObserver, not a window resize listener: if the hero is laid out at
       zero width when this runs (hidden tab, a collapsed pane, a slow font),
       build() bails and a window resize may never come. The observer fires as
       soon as the box has a real size, so the field always recovers. */
    var rt;
    function reflow() { clearTimeout(rt); rt = setTimeout(start, 150); }
    if ("ResizeObserver" in window) {
      new ResizeObserver(reflow).observe(canvas);
    } else {
      window.addEventListener("resize", reflow, { passive: true });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) {
          if (raf) { cancelAnimationFrame(raf); raf = null; live = false; }
          ptr.inside = false;
        }
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; live = false; }
    });
  }

  /* Tilted card.
     The TiltedCard behaviour without motion/react: track the pointer inside
     the figure, convert its offset from centre into rotateX/rotateY, and ease
     toward that target each frame. The spring is a plain lerp, which is
     indistinguishable at these amplitudes and costs nothing. */
  var tiltEl = document.querySelector(".hero-fig");
  if (tiltEl && !reduce && !window.matchMedia("(pointer: coarse)").matches) {
    var AMP = 9;           // max degrees
    var LIFT = 1.014;      // scale on hover
    var cur = { rx: 0, ry: 0, s: 1 };
    var tgt = { rx: 0, ry: 0, s: 1 };
    var tRaf = null;

    function tiltStep() {
      cur.rx += (tgt.rx - cur.rx) * 0.12;
      cur.ry += (tgt.ry - cur.ry) * 0.12;
      cur.s += (tgt.s - cur.s) * 0.12;
      tiltEl.style.transform =
        "perspective(900px) rotateX(" + cur.rx.toFixed(3) + "deg) rotateY(" +
        cur.ry.toFixed(3) + "deg) scale(" + cur.s.toFixed(4) + ")";
      var settled = Math.abs(tgt.rx - cur.rx) < 0.01 && Math.abs(tgt.ry - cur.ry) < 0.01 &&
                    Math.abs(tgt.s - cur.s) < 0.0005;
      if (settled) { tRaf = null; } else { tRaf = requestAnimationFrame(tiltStep); }
    }
    function tiltWake() { if (!tRaf) tRaf = requestAnimationFrame(tiltStep); }

    tiltEl.addEventListener("pointermove", function (ev) {
      var r = tiltEl.getBoundingClientRect();
      var ox = ev.clientX - r.left - r.width / 2;
      var oy = ev.clientY - r.top - r.height / 2;
      tgt.rx = (oy / (r.height / 2)) * -AMP;
      tgt.ry = (ox / (r.width / 2)) * AMP;
      tgt.s = LIFT;
      tiltWake();
    }, { passive: true });

    tiltEl.addEventListener("pointerleave", function () {
      tgt.rx = 0; tgt.ry = 0; tgt.s = 1;
      tiltWake();
    }, { passive: true });
  }

  /* Scroll reveals. */
  var targets = document.querySelectorAll(".reveal");
  if (targets.length && !reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    targets.forEach(function (el) {
      io.observe(el);
    });
  } else {
    targets.forEach(function (el) {
      el.classList.add("in");
    });
  }
})();

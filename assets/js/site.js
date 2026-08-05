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

  /* Distortion field.
     A dot lattice pushed around by three slow lenses. Each dot is displaced
     radially away from a lens centre, falling off with distance, and tinted
     warm in proportion to how far it moved. Canvas, because 1,800 nodes of
     SVG re-laid-out every frame is a different and worse problem. */
  var canvas = document.querySelector(".hero .field");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d", { alpha: true });
    var SPACING = 21;      // lattice pitch in CSS px
    var RADIUS = 1.5;      // dot radius
    var dots = [];
    var w = 0, h = 0, dpr = 1, raf = null, t = 0;

    var lenses = [
      { x: 0.16, y: 0.24, r: 0.36, k: 40, sx: 0.00019, sy: 0.00013 },
      { x: 0.30, y: 0.82, r: 0.32, k: 32, sx: -0.00015, sy: 0.00021 },
      { x: 0.86, y: 0.62, r: 0.30, k: 26, sx: 0.00012, sy: -0.00024 }
    ];

    function build() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      if (!w || !h) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots.length = 0;
      for (var y = SPACING; y < h; y += SPACING) {
        for (var x = SPACING; x < w; x += SPACING) dots.push(x, y);
      }
      return true;
    }

    function frame(now) {
      t = now || 0;
      ctx.clearRect(0, 0, w, h);
      var i, L, lx, ly, lr, dx, dy, d, push, ox, oy, warp;

      for (i = 0; i < dots.length; i += 2) {
        ox = 0; oy = 0; warp = 0;

        for (var n = 0; n < lenses.length; n++) {
          L = lenses[n];
          lx = (L.x + Math.sin(t * L.sx) * 0.12) * w;
          ly = (L.y + Math.cos(t * L.sy) * 0.12) * h;
          lr = L.r * Math.min(w, h) * 1.6;

          dx = dots[i] - lx;
          dy = dots[i + 1] - ly;
          d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
          if (d > lr) continue;

          // smooth falloff, strongest at the lens edge rather than its centre
          push = (1 - d / lr);
          push = push * push * (3 - 2 * push) * L.k;
          ox += (dx / d) * push;
          oy += (dy / d) * push;
          warp += push / L.k;
        }

        if (warp > 0.04) {
          ctx.fillStyle = "rgba(250,93,25," + Math.min(0.62, 0.14 + warp * 0.5).toFixed(3) + ")";
        } else {
          ctx.fillStyle = "rgba(38,38,38,0.17)";
        }
        ctx.beginPath();
        ctx.arc(dots[i] + ox, dots[i + 1] + oy, RADIUS + Math.min(warp, 1) * 1.1, 0, 6.2832);
        ctx.fill();
      }
    }

    function loop(now) { frame(now); raf = requestAnimationFrame(loop); }

    function start() {
      if (!build()) return;
      if (raf) cancelAnimationFrame(raf);
      if (reduce) frame(0); else raf = requestAnimationFrame(loop);
    }

    start();

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(start, 180);
    }, { passive: true });

    /* Stop drawing when the hero is off screen or the tab is hidden. */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var visible = entries[0].isIntersecting;
        if (!visible && raf) { cancelAnimationFrame(raf); raf = null; }
        else if (visible && !raf && !reduce) raf = requestAnimationFrame(loop);
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
      else if (!document.hidden && !raf && !reduce) raf = requestAnimationFrame(loop);
    });
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

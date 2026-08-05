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

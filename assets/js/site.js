/* Protégé site behavior. No dependencies, no scroll listeners. */
(function () {
  "use strict";

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

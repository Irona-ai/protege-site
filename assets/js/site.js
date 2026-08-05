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

  /* Audit request form. Validates locally, then hands off to mail. */
  var form = document.getElementById("auditForm");
  if (form) {
    var input = form.querySelector("input[type=email]");
    var err = form.querySelector(".err");
    var ok = form.querySelector(".form-ok");
    var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") !== "true") return;
      input.setAttribute("aria-invalid", "false");
      err.textContent = "";
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = input.value.trim();

      if (!value) {
        input.setAttribute("aria-invalid", "true");
        err.textContent = "Enter your work email so we can send the audit back.";
        input.focus();
        return;
      }
      if (!valid.test(value)) {
        input.setAttribute("aria-invalid", "true");
        err.textContent = "That address is missing an @ or a domain.";
        input.focus();
        return;
      }

      input.setAttribute("aria-invalid", "false");
      err.textContent = "";
      ok.textContent = "Opening your mail client. If nothing happens, write to tushar@protege.sh.";

      var subject = encodeURIComponent("Route audit request");
      var body = encodeURIComponent(
        "Work email: " +
          value +
          "\n\nWhat we need to run the audit:\n" +
          "1. Two months of inference spend, by model.\n" +
          "2. A rough breakdown of which workflows generate the calls.\n" +
          "3. What currently counts as a correct answer for those workflows.\n"
      );
      window.location.href =
        "mailto:tushar@protege.sh?subject=" + subject + "&body=" + body;
    });
  }
})();

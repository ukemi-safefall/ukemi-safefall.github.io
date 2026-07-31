(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Reveal on scroll ----
     Elements start fully visible (see CSS): only elements this loop
     successfully arms with "pre-reveal" ever get hidden, and the
     observer is what un-hides them. A JS error here can never leave
     content permanently invisible. */
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove("pre-reveal");
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("pre-reveal");
      io.observe(el);
    });
  }

  /* ---- Scroll progress + safebar shadow ---- */
  const progressBar = document.getElementById("scroll-progress");
  const safebarEl = document.querySelector(".safebar");
  if (progressBar || safebarEl) {
    const onScroll = function () {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      if (progressBar) progressBar.style.transform = "scaleX(" + pct + ")";
      if (safebarEl) safebarEl.classList.toggle("scrolled", doc.scrollTop > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  /* ---- Cursor-spotlight hover on cards ---- */
  document.querySelectorAll(".info-card, .stat, .video-card").forEach(function (el) {
    el.addEventListener("mousemove", function (e) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - rect.left) + "px");
      el.style.setProperty("--my", (e.clientY - rect.top) + "px");
    });
  });

  /* ---- Count-up stats ----
     The DOM already holds the correct final value (progressive
     enhancement): this only animates from 0 up to it once the stat
     scrolls into view. If it never runs, the static number is already
     right. */
  if ("IntersectionObserver" in window && !reduceMotion) {
    function animateCount(el) {
      const raw = el.getAttribute("data-count-to");
      const target = parseFloat(raw);
      if (isNaN(target)) return;
      const decimals = (raw.split(".")[1] || "").length;
      const duration = 1100;
      const startTime = performance.now();

      function tick(now) {
        const p = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = target.toFixed(decimals);
        }
      }
      requestAnimationFrame(tick);
    }

    const countIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    document.querySelectorAll("[data-count-to]").forEach(function (el) {
      countIo.observe(el);
    });
  }

  /* ---- Scrollspy ---- */
  const navLinks = document.querySelectorAll(".safebar-links a");
  const sections = Array.prototype.map.call(navLinks, function (a) {
    return document.querySelector(a.getAttribute("href"));
  }).filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
          });
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- Lightbox ---- */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  if (lightbox && lightboxImg) {
    document.querySelectorAll("[data-lightbox]").forEach(function (img) {
      img.addEventListener("click", function () {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add("open");
        document.body.style.overflow = "hidden";
      });
    });

    function closeLightbox() {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
    }

    lightbox.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
    });
  }

  /* ---- BibTeX copy ---- */
  const copyBtn = document.getElementById("copy-bib");
  const bibText = document.getElementById("bib-text");
  if (copyBtn && bibText) {
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(bibText.textContent).then(function () {
        copyBtn.textContent = "Copied ✓";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 2000);
      }).catch(function () {
        copyBtn.textContent = "Select & copy manually";
      });
    });
  }

  /* ---- Video autoplay, muted and locked silent ---- */
  function lockVideoSilent(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");

    video.addEventListener("volumechange", function () {
      video.muted = true;
      video.volume = 0;
    });
  }

  function tryPlay(video) {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function setupVideoAutoplay(video) {
    lockVideoSilent(video);
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");

    /* Large hardware clips (24-54MB) opt out via data-no-autoplay: no
       forced autoplay, no eager preload, no scroll-triggered play —
       they only load when the visitor presses play. */
    if (video.hasAttribute("data-no-autoplay")) return;

    video.setAttribute("autoplay", "");
    tryPlay(video);

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            tryPlay(video);
          }
        });
      }, { threshold: 0.25 });

      observer.observe(video);
    }
  }

  document.querySelectorAll("video.paper-video").forEach(setupVideoAutoplay);
})();

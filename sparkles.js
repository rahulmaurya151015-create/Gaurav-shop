/* =========================================================
   Sree Shiv Alankar Mandir — Gold Sparkle Effects
   Elegant, subtle gold particles for a luxury jewelry feel
   ========================================================= */

(function () {
  "use strict";

  // ---- Configuration ----
  const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (REDUCED_MOTION) return; // respect accessibility

  const BG_SPARKLE_INTERVAL = IS_MOBILE ? 1200 : 700;   // background spawn rate (ms)
  const MAX_BG_SPARKLES = IS_MOBILE ? 12 : 25;           // max on screen at once
  const MAX_BURST_SPARKLES = IS_MOBILE ? 6 : 10;         // per burst

  let bgSparkleCount = 0;
  let bgSparkleTimer = null;

  // ---- Create a single sparkle element ----
  function createSparkle(opts) {
    const sp = document.createElement("span");
    sp.className = "gold-sparkle";

    const size = opts.size || (2 + Math.random() * 3);       // 2-5 px
    const lifetime = opts.lifetime || (2.5 + Math.random() * 2); // 2.5-4.5s
    const color = opts.color || pickGold();

    // position
    sp.style.left = opts.x + "px";
    sp.style.top = opts.y + "px";
    sp.style.width = size + "px";
    sp.style.height = size + "px";
    sp.style.background = color;
    sp.style.boxShadow = `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}aa`;
    sp.style.animationDuration = lifetime + "s";

    // random horizontal drift
    const drift = (Math.random() - 0.5) * 80;
    sp.style.setProperty("--drift", drift + "px");

    document.body.appendChild(sp);

    // remove after animation
    setTimeout(() => {
      if (sp.parentNode) sp.parentNode.removeChild(sp);
      if (opts.isBackground) bgSparkleCount = Math.max(0, bgSparkleCount - 1);
    }, lifetime * 1000 + 200);

    return sp;
  }

  // ---- Gold color variations ----
  function pickGold() {
    const golds = [
      "#FFD700",  // bright gold
      "#F5C451",  // warm gold
      "#D9B45E",  // champagne gold
      "#CBA55A",  // light bronze
      "#FFE082",  // pale gold
      "#FFF8C4"   // almost white gold
    ];
    return golds[Math.floor(Math.random() * golds.length)];
  }

  // ---- BACKGROUND SPARKLES ----
  function spawnBackgroundSparkle() {
    if (bgSparkleCount >= MAX_BG_SPARKLES) return;
    if (document.hidden) return;

    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight - 20 + Math.random() * 20; // spawn near bottom
    const size = 2 + Math.random() * 3;

    bgSparkleCount++;
    createSparkle({
      x: x,
      y: y,
      size: size,
      lifetime: 3 + Math.random() * 3,
      isBackground: true
    });
  }

  function startBackgroundSparkles() {
    if (bgSparkleTimer) clearInterval(bgSparkleTimer);
    bgSparkleTimer = setInterval(spawnBackgroundSparkle, BG_SPARKLE_INTERVAL);
    // spawn a few immediately on load
    setTimeout(spawnBackgroundSparkle, 100);
    setTimeout(spawnBackgroundSparkle, 400);
    setTimeout(spawnBackgroundSparkle, 900);
  }

  // ---- SPARKLE BURST (for clicks/hovers) ----
  function sparkleBurst(targetEl, count) {
    const rect = targetEl.getBoundingClientRect();
    const n = count || MAX_BURST_SPARKLES;

    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const x = rect.left + rect.width * (0.2 + Math.random() * 0.6);
        const y = rect.top + rect.height * (0.2 + Math.random() * 0.6);

        createSparkle({
          x: x,
          y: y,
          size: 3 + Math.random() * 4,
          lifetime: 1.5 + Math.random() * 1.5
        });
      }, i * 60);
    }
  }

  // ---- WATCH FOR INTERACTIONS ----

  // Product cards hover
  function attachProductCardSparkles() {
    document.querySelectorAll(".product-card").forEach((card) => {
      if (card.dataset.sparkleAttached === "1") return;
      card.dataset.sparkleAttached = "1";

      card.addEventListener("mouseenter", () => {
        // 2 sparkles on hover
        sparkleBurst(card, 3);
      });

      card.addEventListener("click", () => {
        sparkleBurst(card, 5);
      });
    });
  }

  // "Add to Enquiry" button burst
  function attachButtonSparkles() {
    const btn = document.getElementById("pmAddEnquiry");
    if (btn && btn.dataset.sparkleAttached !== "1") {
      btn.dataset.sparkleAttached = "1";
      btn.addEventListener("click", () => {
        sparkleBurst(btn, 8);
      });
    }
  }

  // Brand name shimmer — CSS handles this, but sparkle burst on hover
  function attachBrandSparkles() {
    const brand = document.getElementById("brandName");
    if (brand && brand.dataset.sparkleAttached !== "1") {
      brand.dataset.sparkleAttached = "1";
      brand.addEventListener("mouseenter", () => {
        sparkleBurst(brand, 4);
      });
    }
  }

  // ---- OBSERVER for dynamically created cards (Firebase loads them async) ----
  function attachAllSparkles() {
    attachProductCardSparkles();
    attachButtonSparkles();
    attachBrandSparkles();
  }

  const observer = new MutationObserver(() => {
    attachAllSparkles();
  });

  // ---- PAUSE WHEN TAB HIDDEN ----
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (bgSparkleTimer) clearInterval(bgSparkleTimer);
    } else {
      startBackgroundSparkles();
    }
  });

  // ---- INIT ----
  function init() {
    startBackgroundSparkles();
    attachAllSparkles();

    // Watch for new elements (Firebase async rendering)
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Re-attach sparkles when product cards load
    setTimeout(attachAllSparkles, 1000);
    setTimeout(attachAllSparkles, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

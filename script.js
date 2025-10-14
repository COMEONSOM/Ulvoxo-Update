// ============================================================
// ULVOXO UPDATES SCRIPT — Performance-first edition
// VERSION 1.1.4
// ============================================================

(function () {
  "use strict";

  // -------------------------
  // Lightweight localStorage wrapper (safe)
  // -------------------------
  const Storage = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // ignore quota errors silently for low-end devices
      }
    },
  };

  // -------------------------
  // Config
  // -------------------------
  const MAX_STARS = 5;
  const STORAGE_KEY = "starredCardsV1";
  const CONTAINER = document.getElementById("cardContainer") || document.body;

  // -------------------------
  // Efficient data structures
  // -------------------------
  const starredSet = new Set(Storage.get(STORAGE_KEY, []));
  const cardSegmentMap = new Map();

  // -------------------------
  // Utility helpers
  // -------------------------
  const $qAll = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const closestCard = (el) =>
    el && (el.closest(".card") || el.closest(".job-card"));
  const updateStarAttr = (btn, isStarred) => {
    btn.classList.toggle("starred", isStarred);
    btn.setAttribute("aria-pressed", isStarred ? "true" : "false");
  };

  // -------------------------
  // DOM Initialization
  // -------------------------
  (function initCards() {
    // Handle both normal and job grids
    const segments = $qAll(".card-grid[data-segment], .card-grid, .job-grid");
    segments.forEach((segment) => {
      const cards = $qAll(".card, .job-card", segment);
      cards.forEach((card, idx) => {
        const id = card.dataset.id;
        if (id) {
          card.dataset.origIndex = idx;
          cardSegmentMap.set(id, segment);
        }
      });
    });

    // Mark starred UI
    $qAll(".card, .job-card").forEach((card) => {
      const id = card.dataset.id;
      const btn =
        card.querySelector(".star-btn") || card.querySelector(".job-star-btn");
      if (!btn) return;
      const isStar = id && starredSet.has(id);
      updateStarAttr(btn, isStar);
    });

    // Reorder each segment initially
    segments.forEach(reorderSegment);
  })();

  // -------------------------
  // Reordering helpers
  // -------------------------
  function reorderSegment(segment) {
    const cards = $qAll(".card, .job-card", segment);
    const frag = document.createDocumentFragment();
    const starred = [];
    const unstarredByOrigIndex = [];

    cards.forEach((c) => {
      const id = c.dataset.id;
      if (id && starredSet.has(id)) starred.push(c);
      else unstarredByOrigIndex.push(c);
    });

    unstarredByOrigIndex.sort(
      (a, b) =>
        (Number(a.dataset.origIndex) || 0) -
        (Number(b.dataset.origIndex) || 0)
    );
    starred.concat(unstarredByOrigIndex).forEach((c) => frag.appendChild(c));
    segment.appendChild(frag);
  }

  function repositionCard(card) {
    const id = card.dataset.id;
    const segment = cardSegmentMap.get(id);
    if (!segment) return;
    const cards = $qAll(".card, .job-card", segment);
    const isStarred = starredSet.has(id);

    if (isStarred) {
      const firstUn = cards.find((c) => !starredSet.has(c.dataset.id));
      firstUn ? segment.insertBefore(card, firstUn) : segment.appendChild(card);
    } else {
      const lastStarIdx = cards.reduce(
        (acc, c, idx) => (starredSet.has(c.dataset.id) ? idx : acc),
        -1
      );
      const origIndex = Number(card.dataset.origIndex) || 0;
      let beforeNode = null;
      for (let i = lastStarIdx + 1; i < cards.length; i++) {
        if ((Number(cards[i].dataset.origIndex) || 0) > origIndex) {
          beforeNode = cards[i];
          break;
        }
      }
      beforeNode ? segment.insertBefore(card, beforeNode) : segment.appendChild(card);
    }
  }

  // -------------------------
  // Event delegation (stars + cards)
  // -------------------------
  CONTAINER.addEventListener(
    "click",
    (ev) => {
      const starBtn =
        ev.target.closest(".star-btn") ||
        ev.target.closest(".job-star-btn");
      if (starBtn) {
        ev.stopPropagation();
        const card = closestCard(ev.target);
        if (!card) return;
        const id = card.dataset.id;
        if (!id) return;

        if (!starredSet.has(id)) {
          if (starredSet.size >= MAX_STARS) {
            const prev = window.confirm(
              `You can only star up to ${MAX_STARS} cards. Remove one to add a new one?`
            );
            if (!prev) return;
          } else {
            starredSet.add(id);
            updateStarAttr(starBtn, true);
          }
        } else {
          starredSet.delete(id);
          updateStarAttr(starBtn, false);
        }

        Storage.set(STORAGE_KEY, Array.from(starredSet));
        repositionCard(card);
        return;
      }

      const card = closestCard(ev.target);
      if (card) {
        const url = (card.dataset.url || "").trim();
        if (url) {
          try {
            window.open(url, "_blank", "noopener");
          } catch (e) {}
        }
      }
    },
    { passive: true }
  );

  // Keyboard accessibility
  CONTAINER.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        const el = ev.target;
        if (el.classList && (el.classList.contains("star-btn") || el.classList.contains("job-star-btn"))) {
          el.click();
          ev.preventDefault();
        } else {
          const card = closestCard(el);
          if (card && !el.classList.contains("star-btn") && !el.classList.contains("job-star-btn")) {
            const url = (card.dataset.url || "").trim();
            if (url) {
              try {
                window.open(url, "_blank", "noopener");
              } catch (e) {}
              ev.preventDefault();
            }
          }
        }
      }
    },
    { passive: true }
  );

  // -------------------------
  // Job filter logic
  // -------------------------
  (function initJobFilters() {
    const filterContainer = document.querySelector(".job-filters");
    if (!filterContainer) return;
    const filterButtons = $qAll(".filter-btn");
    const jobCards = $qAll(".job-card");

    filterContainer.addEventListener(
      "click",
      (ev) => {
        const btn = ev.target.closest(".filter-btn");
        if (!btn) return;
        const filter = btn.dataset.filter;
        if (!filter) return;

        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        jobCards.forEach((card) => {
          const type = card.dataset.type;
          const hide = !(filter === "all" || type === filter);
          card.classList.toggle("hidden", hide);
        });
      },
      { passive: true }
    );
  })();

  // -------------------------
  // Canvas background (optimized)
  // -------------------------
  (function advancedCanvasBg() {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.zIndex = "-2";
    canvas.style.pointerEvents = "none";
    canvas.style.opacity = "0.22";
    document.body.prepend(canvas);

    let resizePending = false;
    let lastW = 0;
    let lastH = 0;
    const DPR = Math.max(1, window.devicePixelRatio || 1);

    function setCanvasSize() {
      const w = Math.max(300, window.innerWidth);
      const h = Math.max(300, window.innerHeight);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
      bgGradient.addColorStop(0, "#03030c");
      bgGradient.addColorStop(0.4, "#060621");
      bgGradient.addColorStop(0.75, "#0a0a26");
      bgGradient.addColorStop(1, "#000000");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      const spacing = 45;
      const maxLines = Math.ceil(w / spacing) + 2;
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += spacing) {
        const opacity = x % (spacing * 5) === 0 ? 0.18 : 0.1;
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += spacing) {
        const opacity = y % (spacing * 5) === 0 ? 0.18 : 0.1;
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }

      const accentCount = Math.min(6, Math.max(3, Math.round(w / 300)));
      for (let i = 0; i < accentCount; i++) {
        const x = Math.round((w / accentCount) * i + Math.sin(i * 12.345) * 12);
        const grad = ctx.createLinearGradient(x, 0, x, h);
        grad.addColorStop(0, "rgba(100,180,255,0.08)");
        grad.addColorStop(0.6, "rgba(140,120,255,0.06)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }

      const glow1 = ctx.createRadialGradient(
        w * 0.22,
        h * 0.28,
        0,
        w * 0.22,
        h * 0.28,
        Math.min(500, Math.max(w, h) * 0.35)
      );
      glow1.addColorStop(0, "rgba(0,180,255,0.12)");
      glow1.addColorStop(1, "transparent");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, w, h);

      const glow2 = ctx.createRadialGradient(
        w * 0.78,
        h * 0.38,
        0,
        w * 0.78,
        h * 0.38,
        Math.min(500, Math.max(w, h) * 0.38)
      );
      glow2.addColorStop(0, "rgba(180,0,255,0.1)");
      glow2.addColorStop(1, "transparent");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, w, h);

      const fadeStart = h * 0.75;
      const fadeGrad = ctx.createLinearGradient(0, fadeStart, 0, h);
      fadeGrad.addColorStop(0, "rgba(0,0,0,0)");
      fadeGrad.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, fadeStart, w, h - fadeStart);
    }

    function scheduleResizeDraw() {
      if (resizePending) return;
      resizePending = true;
      window.requestAnimationFrame(() => {
        setCanvasSize();
        draw();
        resizePending = false;
      });
    }

    setCanvasSize();
    draw();

    let resizeTimer = null;
    window.addEventListener(
      "resize",
      () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(scheduleResizeDraw, 120);
      },
      { passive: true }
    );
    window.addEventListener(
      "orientationchange",
      () => {
        setTimeout(scheduleResizeDraw, 150);
      },
      { passive: true }
    );
  })();

  // -------------------------
  // END
  // -------------------------
})();

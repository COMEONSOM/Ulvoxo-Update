// ============================================================
// 🚀 ULVOXO UPDATES SCRIPT (OCTOBER 2025 VERSION 1.1.4)
// STARRED CARD LOGIC + GOVT JOB FILTERING
// ✨ ADVANCED FUTURE-TECH STATIC BACKGROUND
// (No animation | Subtle 3D depth | Fades after 75% height)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // 🔹 GLOBAL CONSTANTS & CONFIGURATION
  // ============================================================
  const MAX_STARS = 5;
  const STORAGE_KEY = "starredCards";
  const segments = document.querySelectorAll(".section-container .card-grid");

  // ============================================================
  // 🎨 FUTURE-TECH STATIC BACKGROUND (NO ANIMATION)
  // ============================================================

  (function createAdvancedBackground() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // --- STYLE CONFIG ---
    canvas.style.position = "fixed";
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.zIndex = "-1";
    canvas.style.pointerEvents = "none";
    canvas.style.opacity = "0.22"; // slightly visible for depth
    document.body.prepend(canvas);

    // --- HANDLE CANVAS RESIZE ---
    function resizeCanvas() {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      drawFuturisticGrid();
    }
    window.addEventListener("resize", resizeCanvas);

    // --- DRAW MODERN GRID ---
    function drawFuturisticGrid() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // BACKGROUND BASE FILL (deep bluish-black)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
      bgGradient.addColorStop(0, "#03030c");
      bgGradient.addColorStop(0.4, "#060621");
      bgGradient.addColorStop(0.75, "#0a0a26");
      bgGradient.addColorStop(1, "#000000");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      // GRID CONFIG
      const spacing = 45; // smaller = denser squares
      const mainColor = "rgba(180, 210, 255, 0.14)";
      const accentColor = "rgba(120, 180, 255, 0.08)";
      const fadeStart = h * 0.75; // dark fade after 75%
      const fadeEnd = h;

      // --- DRAW SUB-GRID (fine tech lines) ---
      ctx.lineWidth = 1;
      ctx.strokeStyle = mainColor;

      for (let x = 0; x <= w; x += spacing) {
        const opacityFactor = x % (spacing * 5) === 0 ? 0.18 : 0.12;
        ctx.strokeStyle = `rgba(255,255,255,${opacityFactor})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let y = 0; y <= h; y += spacing) {
        const opacityFactor = y % (spacing * 5) === 0 ? 0.18 : 0.12;
        ctx.strokeStyle = `rgba(255,255,255,${opacityFactor})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // --- ACCENT CIRCUIT LINES (subtle vertical glow lines) ---
      const accentCount = 6;
      for (let i = 0; i < accentCount; i++) {
        const x = (w / accentCount) * i + Math.random() * 20;
        const grad = ctx.createLinearGradient(x, 0, x, h);
        grad.addColorStop(0, "rgba(100,180,255,0.1)");
        grad.addColorStop(0.6, "rgba(140,120,255,0.07)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // --- TOP-LAYER GLOW PATCHES (tech aura) ---
      const glowGrad1 = ctx.createRadialGradient(w * 0.25, h * 0.3, 0, w * 0.25, h * 0.3, 400);
      glowGrad1.addColorStop(0, "rgba(0,180,255,0.15)");
      glowGrad1.addColorStop(1, "transparent");

      const glowGrad2 = ctx.createRadialGradient(w * 0.75, h * 0.4, 0, w * 0.75, h * 0.4, 450);
      glowGrad2.addColorStop(0, "rgba(180,0,255,0.12)");
      glowGrad2.addColorStop(1, "transparent");

      ctx.fillStyle = glowGrad1;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = glowGrad2;
      ctx.fillRect(0, 0, w, h);

      // --- DARK FADE LAYER AFTER 75% HEIGHT ---
      const fadeGrad = ctx.createLinearGradient(0, fadeStart, 0, fadeEnd);
      fadeGrad.addColorStop(0, "rgba(0,0,0,0)");
      fadeGrad.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, fadeStart, w, fadeEnd - fadeStart);
    }

    // INITIAL RENDER
    resizeCanvas();
  })();

  // ============================================================
  // 🌟 STARRED CARD LOGIC (UNCHANGED)
  // ============================================================
  if (segments.length > 0) {
    let starredIds = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const cardSegmentMap = new Map();

    segments.forEach((segment) => {
      segment.querySelectorAll(".card").forEach((card, index) => {
        card.dataset.origIndex = index;
        cardSegmentMap.set(card.dataset.id, segment);
      });
    });

    starredIds.forEach((id) => {
      const card = document.querySelector(`.card[data-id="${id}"]`);
      if (card) card.querySelector(".star-btn")?.classList.add("starred");
    });

    function reorderSegment(segment) {
      const cards = Array.from(segment.querySelectorAll(".card"));
      const starred = cards.filter((c) => starredIds.includes(c.dataset.id));
      const unstarred = cards.filter((c) => !starredIds.includes(c.dataset.id));
      [...starred, ...unstarred].forEach((c) => segment.appendChild(c));
    }

    function repositionCard(card) {
      const segment = cardSegmentMap.get(card.dataset.id);
      if (!segment) return;

      const isStarred = starredIds.includes(card.dataset.id);
      const cards = Array.from(segment.querySelectorAll(".card"));

      if (isStarred) {
        const firstUn = cards.find((c) => !starredIds.includes(c.dataset.id));
        firstUn ? segment.insertBefore(card, firstUn) : segment.appendChild(card);
      } else {
        const origIndex = Number(card.dataset.origIndex);
        const startIndex = cards.findIndex((c) => !starredIds.includes(c.dataset.id));
        let beforeNode = null;
        for (let i = startIndex; i < cards.length; i++) {
          if (Number(cards[i].dataset.origIndex) > origIndex) {
            beforeNode = cards[i];
            break;
          }
        }
        beforeNode ? segment.insertBefore(card, beforeNode) : segment.appendChild(card);
      }
    }

    segments.forEach(reorderSegment);

    document.querySelectorAll(".card").forEach((card) => {
      const id = card.dataset.id;
      const starBtn = card.querySelector(".star-btn");
      if (!starBtn) return;

      card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("star-btn")) {
          const url = card.dataset.url?.trim();
          if (url) window.open(url, "_blank");
        }
      });

      starBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = starredIds.indexOf(id);
        if (index === -1) {
          if (starredIds.length < MAX_STARS) {
            starredIds.push(id);
            starBtn.classList.add("starred");
          } else {
            alert(`You can only star up to ${MAX_STARS} cards.`);
            return;
          }
        } else {
          starredIds.splice(index, 1);
          starBtn.classList.remove("starred");
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(starredIds));
        repositionCard(card);
      });
    });
  }

  // ============================================================
  // 🔹 GOVT JOB FILTERING (UNCHANGED)
  // ============================================================
  const filterButtons = document.querySelectorAll(".filter-btn");
  const jobCards = document.querySelectorAll(".job-card");

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      jobCards.forEach((card) => {
        card.style.display =
          filter === "all" || card.dataset.type === filter ? "block" : "none";
      });
    });
  });

  // ============================================================
  // ✅ END OF SCRIPT
  // ============================================================
});

// ============================================================
// OPENROOT HH SCRIPT — Performance-first edition
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
  const closestCard = (el) => el && (el.closest(".card") || el.closest(".job-card"));
  const updateStarAttr = (btn, isStarred) => {
    btn.classList.toggle("starred", isStarred);
    btn.setAttribute("aria-pressed", isStarred ? "true" : "false");
  };

  // -------------------------
  // DOM Initialization
  // -------------------------
  (function initCards() {
    // segments include normal and job grids
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

    // Mark starred UI once
    $qAll(".card, .job-card").forEach((card) => {
      const id = card.dataset.id;
      const btn = card.querySelector(".star-btn") || card.querySelector(".job-star-btn");
      if (!btn) return;
      const isStar = id && starredSet.has(id);
      updateStarAttr(btn, isStar);
    });

    // Reorder each segment initially — perform on next rAF to avoid blocking initial paint
    requestAnimationFrame(() => segments.forEach(reorderSegment));
  })();

  // -------------------------
  // Reordering helpers
  // -------------------------
  function reorderSegment(segment) {
    const cards = $qAll(".card, .job-card", segment);
    if (!cards.length) return;
    const frag = document.createDocumentFragment();
    const starred = [];
    const unstarredByOrigIndex = [];

    cards.forEach((c) => {
      const id = c.dataset.id;
      if (id && starredSet.has(id)) starred.push(c);
      else unstarredByOrigIndex.push(c);
    });

    unstarredByOrigIndex.sort(
      (a, b) => (Number(a.dataset.origIndex) || 0) - (Number(b.dataset.origIndex) || 0)
    );
    starred.concat(unstarredByOrigIndex).forEach((c) => frag.appendChild(c));
    segment.appendChild(frag);
  }

  function repositionCard(card) {
    // Do DOM mutation inside rAF to batch layouts
    requestAnimationFrame(() => {
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
    });
  }

  // -------------------------
  // Event delegation (stars + cards)
  // -------------------------
  CONTAINER.addEventListener(
    "click",
    (ev) => {
      const starBtn = ev.target.closest(".star-btn") || ev.target.closest(".job-star-btn");
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
    { passive: true } // passive used; ok for modern browsers
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

        // DOM changes batched naturally (few nodes) — still fast
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
})();

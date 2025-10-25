// ============================================================
// OPENROOT HH SCRIPT — MODERN, PRODUCTION-READY (ES2023+)
// VERSION: 1.1.5
// ============================================================

/* GLOBALS: LIMIT STARRED CARDS AND STORAGE KEY */
const MAX_STARS = 5;
const STORAGE_KEY = "starredCardsV1";

/* STORAGE HELPER (ASYNC-FRIENDLY, SAFE) */
/* ALL CAPS COMMENTS BELOW EXPLAIN LOGIC */
const Storage = {
  // GET ITEM ASYNC-LIKE (WRAPS LOCALSTORAGE ACCESS)
  async get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      // ON PARSE OR ACCESS ERROR, RETURN FALLBACK
      console.error("STORAGE.GET ERROR", err);
      return fallback;
    }
  },

  // SET ITEM (STRINGIFY SAFELY)
  async set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // IGNORE QUOTA OR OTHER ERRORS, LOG FOR DEBUG
      console.warn("STORAGE.SET ERROR", err);
    }
  },
};

/* MAIN APPLICATION CLASS */
/* RESPONSIBILITIES:
   - INITIALIZE DOM
   - MANAGE STARRED SET (O(1) OPERATIONS)
   - HANDLE REORDERING (O(n) PER SEGMENT)
   - MANAGE FILTERS + NAVIGATION */
class OpenrootApp {
  constructor(root = document) {
    // CACHE ROOTS AND STATE
    this.root = root;
    this.container = root.querySelector("main.container") ?? document.body;
    this.starredSet = new Set();
    this.cardSegmentMap = new Map();
    this.initialized = false;

    // BIND HANDLERS FOR LATER REMOVAL IF NEEDED
    this.onContainerClick = this.onContainerClick.bind(this);
    this.onContainerKeydown = this.onContainerKeydown.bind(this);
  }

  /* INITIALIZE APP (ASYNC TO ALLOW FUTURE AWAIT) */
  async init() {
    if (this.initialized) return;
    this.initialized = true;

    // LOAD STARRED FROM STORAGE (O(k) WHERE k = SAVED STARS)
    const saved = await Storage.get(STORAGE_KEY, []);
    if (Array.isArray(saved)) {
      for (const id of saved) this.starredSet.add(id);
    }

    // SETUP CARDS AND SEGMENTS
    this.setupCards();

    // INITIAL UI STATE: APPLY STARRED UI, REORDER
    this.applyInitialStarState();

    // ADD EVENT LISTENERS (DELEGATED)
    this.container.addEventListener("click", this.onContainerClick, { passive: true });
    this.container.addEventListener("keydown", this.onContainerKeydown, { passive: true });

    // INIT FILTER BUTTONS AND MENU
    this.initJobFilters();
    this.initMenu();

    // FORCE INITIAL REORDER AFTER FIRST PAINT (BATCH DOM CHANGES)
    requestAnimationFrame(() => {
      const segments = Array.from(new Set(this.cardSegmentMap.values()));
      segments.forEach((seg) => this.reorderSegment(seg));
    });
  }

  /* ASSIGN UNIQUE IDS, MAP CARDS -> THEIR SEGMENTS & STORE ORIGINAL INDEX */
  setupCards() {
    // SELECT ALL CARDS (REGULAR + JOB)
    const cards = Array.from(this.root.querySelectorAll(".card, .job-card"));
    let autoId = 0;

    // MAP SEGMENTS (CARD GRID ELEMENTS)
    const segments = Array.from(this.root.querySelectorAll(".card-grid, .job-grid"));

    // ASSIGN IDS AND ORIG INDEXES (O(n))
    for (const seg of segments) {
      const segCards = Array.from(seg.querySelectorAll(".card, .job-card"));
      segCards.forEach((card, idx) => {
        if (!card.dataset.id) card.dataset.id = `card-${++autoId}`;
        // STORE ORIGINAL INDEX FOR STABLE SORT
        card.dataset.origIndex = idx.toString();
        // MAP CARD ID -> SEGMENT ELEMENT
        this.cardSegmentMap.set(card.dataset.id, seg);
      });
    }
  }

  /* APPLY STAR UI ACCORDING TO STARRED SET */
  applyInitialStarState() {
    const allCards = Array.from(this.root.querySelectorAll(".card, .job-card"));
    for (const card of allCards) {
      const id = card.dataset.id;
      const btn = card.querySelector(".star-btn");
      if (!btn || !id) continue;
      const isStarred = this.starredSet.has(id);
      this.updateStarAttr(btn, isStarred);
    }
  }

  /* UPDATE STAR BUTTON ATTRIBUTES (A11Y) */
  updateStarAttr(btn, isStarred) {
    btn.classList.toggle("starred", Boolean(isStarred));
    btn.setAttribute("aria-pressed", isStarred ? "true" : "false");
    btn.setAttribute("aria-label", isStarred ? "Unstar card" : "Star card");
  }

  /* EVENT DELEGATION: CLICK HANDLER (STAR BUTTONS + CARD OPEN) */
  onContainerClick(ev) {
    const starBtn = ev.target.closest(".star-btn");
    if (starBtn) {
      ev.stopPropagation();
      this.toggleStar(starBtn).catch((err) => console.error("TOGGLE STAR ERROR", err));
      return;
    }

    // OPEN CARD URL IF CLICKED OUTSIDE STAR
    const card = ev.target.closest(".card, .job-card");
    if (card) {
      const url = (card.dataset.url || "").trim();
      if (url) {
        try {
          window.open(url, "_blank", "noopener");
        } catch (err) {
          // SILENT FAIL FOR POPUP BLOCKERS
          console.warn("OPEN URL ERROR", err);
        }
      }
    }
  }

  /* KEYBOARD ACCESSIBILITY: ENTER/SPACE SUPPORT */
  onContainerKeydown(ev) {
    const key = ev.key;
    if (key !== "Enter" && key !== " ") return;
    const el = ev.target;
    if (el.classList.contains("star-btn")) {
      // SIMULATE CLICK FOR KEYBOARD USERS
      el.click();
      ev.preventDefault();
      return;
    }

    // IF FOCUSED ELEMENT IS INSIDE A CARD, OPEN THE CARD (NOT THE STAR)
    const card = el.closest?.(".card, .job-card");
    if (card && !el.classList.contains("star-btn")) {
      const url = (card.dataset.url || "").trim();
      if (url) {
        try {
          window.open(url, "_blank", "noopener");
          ev.preventDefault();
        } catch (err) {
          console.warn("OPEN URL VIA KEY ERROR", err);
        }
      }
    }
  }

  /* TOGGLE STAR: ADD/REMOVE FROM SET, UPDATE STORAGE, REPOSITION CARD */
  async toggleStar(starBtn) {
    // FIND CARD FOR THIS STAR BUTTON
    const card = starBtn.closest(".card, .job-card");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    // IF ADDING STAR BUT MAX REACHED -> PROMPT TO REMOVE
    if (!this.starredSet.has(id) && this.starredSet.size >= MAX_STARS) {
      const confirmRemove = window.confirm(
        `YOU CAN ONLY STAR UP TO ${MAX_STARS} CARDS. REMOVE ONE TO ADD A NEW ONE?`
      );
      if (!confirmRemove) return;
      // IF USER CONFIRMS, REMOVE THE OLDEST STAR (ARBITRARY CHOICE: FIRST IN SET)
      const oldest = this.starredSet.values().next().value;
      if (oldest) this.starredSet.delete(oldest);
    }

    // TOGGLE IN SET
    if (this.starredSet.has(id)) {
      this.starredSet.delete(id);
      this.updateStarAttr(starBtn, false);
    } else {
      this.starredSet.add(id);
      this.updateStarAttr(starBtn, true);
    }

    // PERSIST STATE (ASYNC-LIKE)
    await Storage.set(STORAGE_KEY, Array.from(this.starredSet));

    // REPOSITION CARD IN ITS SEGMENT (DEFERRED TO RAF)
    this.repositionCard(card);
  }

  /* REORDER A SEGMENT: STARRED FIRST, OTHERS PRESERVE ORIGINAL ORDER
     TIME COMPLEXITY: O(n) FOR SCANNING CARDS IN SEGMENT */
  reorderSegment(segmentEl) {
    if (!segmentEl) return;
    const cards = Array.from(segmentEl.querySelectorAll(".card, .job-card"));
    if (cards.length <= 1) return;

    // SEPARATE STARRED vs UNSTARRED
    const starred = [];
    const unstarred = [];

    for (const c of cards) {
      const id = c.dataset.id;
      if (id && this.starredSet.has(id)) starred.push(c);
      else unstarred.push(c);
    }

    // STABLE SORT: UNSTARRED ALREADY HAVE origIndex
    unstarred.sort((a, b) => (Number(a.dataset.origIndex) || 0) - (Number(b.dataset.origIndex) || 0));

    // BATCH DOM WRITE VIA FRAGMENT (MINIMIZE LAYOUT THRASH)
    const frag = document.createDocumentFragment();
    for (const item of starred) frag.appendChild(item);
    for (const item of unstarred) frag.appendChild(item);

    // RENDER UNDER requestAnimationFrame FOR SMOOTHNESS
    requestAnimationFrame(() => {
      try {
        segmentEl.appendChild(frag);
      } catch (err) {
        console.warn("REORDER SEGMENT ERROR", err);
      }
    });
  }

  /* REPOSITION A SINGLE CARD BASED ON STARRED STATE
     MINIMIZES MOVES: INSERT BEFORE FIRST UNSTARRED / AFTER LAST STARRED */
  repositionCard(card) {
    requestAnimationFrame(() => {
      try {
        const id = card.dataset.id;
        const segment = this.cardSegmentMap.get(id);
        if (!segment) return;

        const cards = Array.from(segment.querySelectorAll(".card, .job-card"));
        const isStarred = this.starredSet.has(id);

        if (isStarred) {
          // PLACE BEFORE FIRST UNSTARRED
          const firstUn = cards.find((c) => !this.starredSet.has(c.dataset.id));
          firstUn ? segment.insertBefore(card, firstUn) : segment.appendChild(card);
        } else {
          // PLACE AFTER LAST STARRED, BUT PRESERVE ORIGINAL ORDER FOR UNSTARRED
          const lastStarIdx = cards.reduce((acc, c, idx) => (this.starredSet.has(c.dataset.id) ? idx : acc), -1);
          const origIndex = Number(card.dataset.origIndex) || 0;

          let beforeNode = null;
          for (let i = lastStarIdx + 1; i < cards.length; i++) {
            const cur = cards[i];
            if ((Number(cur.dataset.origIndex) || 0) > origIndex) {
              beforeNode = cur;
              break;
            }
          }

          beforeNode ? segment.insertBefore(card, beforeNode) : segment.appendChild(card);
        }
      } catch (err) {
        console.warn("REPOSITION CARD ERROR", err);
      }
    });
  }

  /* INITIALIZE JOB FILTERS (DELEGATED) */
  initJobFilters() {
    const filterContainer = document.querySelector(".job-filters");
    if (!filterContainer) return;

    const filterButtons = Array.from(filterContainer.querySelectorAll(".filter-btn"));
    const jobCards = Array.from(document.querySelectorAll(".job-card"));

    filterContainer.addEventListener(
      "click",
      (ev) => {
        const btn = ev.target.closest(".filter-btn");
        if (!btn) return;
        const filter = btn.dataset.filter ?? "all";

        // VISUAL STATE (O(m) WHERE m = NUMBER OF FILTER BUTTONS)
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // SHOW/HIDE JOB CARDS (O(n) WHERE n = JOB CARDS)
        for (const card of jobCards) {
          const type = card.dataset.type || "";
          const hide = !(filter === "all" || type === filter);
          card.classList.toggle("hidden", hide);
        }
      },
      { passive: true }
    );
  }

  /* SECTION MENU AND BACK BUTTONS */
  initMenu() {
    const buttons = Array.from(document.querySelectorAll(".menu-btn"));
    const sections = Array.from(document.querySelectorAll(".section-container"));
    const menuSection = document.getElementById("mainSectionMenu");

    for (const btn of buttons) {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const target = document.getElementById(targetId);
        if (!target) return;

        // HIDE MENU, SHOW SECTION
        menuSection.classList.add("hidden");
        sections.forEach((sec) => sec.classList.add("hidden"));
        target.classList.remove("hidden");

        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // BACK BUTTONS
    document.querySelectorAll(".back-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll(".section-container").forEach((sec) => sec.classList.add("hidden"));
        menuSection.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
    );
  }

  /* CLEANUP: REMOVE EVENT LISTENERS (IF NEEDED) */
  destroy() {
    this.container.removeEventListener("click", this.onContainerClick);
    this.container.removeEventListener("keydown", this.onContainerKeydown);
    this.initialized = false;
  }
}

/* BOOTSTRAP THE APP (IMMEDIATELY INVOKED ASYNC) */
(async function bootstrap() {
  try {
    const app = new OpenrootApp(document);
    await app.init();
    // EXPOSE APP FOR DEBUGGING (DEV ONLY - REMOVE IN PRODUCTION IF DESIRED)
    window.__openrootApp = app;
  } catch (err) {
    console.error("APP INIT ERROR", err);
  }
})();

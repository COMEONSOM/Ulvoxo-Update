document.addEventListener('DOMContentLoaded', () => {
  const maxStars   = 5;
  const storageKey = 'starredCards';
  let starredIds   = JSON.parse(localStorage.getItem(storageKey)) || [];
  const cardSegmentMap = new Map();

  /* ───────────── STAR BUTTON / ORDERING LOGIC ───────────── */
  if (document.querySelector('.segment')) {
    function reorderSegment(segment) {
      const cards     = Array.from(segment.querySelectorAll('.card'));
      const starred   = cards
        .filter(c => starredIds.includes(c.dataset.id))
        .sort((a, b) => starredIds.indexOf(a.dataset.id) - starredIds.indexOf(b.dataset.id));
      const unstarred = cards
        .filter(c => !starredIds.includes(c.dataset.id))
        .sort((a, b) => Number(a.dataset.origIndex) - Number(b.dataset.origIndex));
      [...starred, ...unstarred].forEach(c => segment.appendChild(c));
    }

    function repositionCard(card) {
      const segment = cardSegmentMap.get(card.dataset.id);
      if (!segment) return;
      const isStarred = starredIds.includes(card.dataset.id);
      const cards     = Array.from(segment.children).filter(el => el.matches('.card'));

      if (isStarred) {
        const firstUn = cards.find(c => !starredIds.includes(c.dataset.id));
        firstUn ? segment.insertBefore(card, firstUn) : segment.appendChild(card);
      } else {
        const origIdx = Number(card.dataset.origIndex);
        const start   = cards.findIndex(c => !starredIds.includes(c.dataset.id));
        let beforeNode = null;
        for (let i = start; i < cards.length; i++) {
          if (Number(cards[i].dataset.origIndex) > origIdx) {
            beforeNode = cards[i];
            break;
          }
        }
        beforeNode ? segment.insertBefore(card, beforeNode) : segment.appendChild(card);
      }
    }

    document.querySelectorAll('.segment').forEach(segment => {
      segment.querySelectorAll('.card').forEach((card, idx) => {
        card.dataset.origIndex = idx;
        cardSegmentMap.set(card.dataset.id, segment);
      });
    });

    starredIds.forEach(id => {
      const card = document.querySelector(`.card[data-id="${id}"]`);
      card?.querySelector('.star-btn')?.classList.add('starred');
    });

    document.querySelectorAll('.segment').forEach(reorderSegment);
  }

  /* ───────────── CARD CLICK / STAR LOGIC ───────────── */
  document.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const starBtn = card.querySelector('.star-btn');
    const url = card.dataset.url?.trim();

    // Prevent redirection on star button
    if (starBtn) {
      starBtn.addEventListener('click', e => {
        e.stopPropagation(); // 👈 prevents propagation to card
        const idx = starredIds.indexOf(id);

        if (idx === -1) {
          if (starredIds.length < maxStars) {
            starredIds.push(id);
            starBtn.classList.add('starred');
          } else {
            alert(`You can only star up to ${maxStars} cards.`);
            return;
          }
        } else {
          starredIds.splice(idx, 1);
          starBtn.classList.remove('starred');
        }

        localStorage.setItem(storageKey, JSON.stringify(starredIds));
        repositionCard(card);
      });
    }

    // Card redirection
    if (
      !card.classList.contains('expandable-card') &&
      !card.classList.contains('job-card')
    ) {
      card.addEventListener('click', () => {
        if (url) window.open(url, '_blank');
      });
    }
  });

  /* ───────────── GOVT JOBS ───────────── */
  const expandableCard = document.querySelector('.expandable-card');
  const subCardContainers = Array.from(expandableCard?.querySelectorAll('.expandable-sub-card') || []);

  expandableCard?.addEventListener('click', async e => {
    if (e.target.closest('.star-btn') || e.target.closest('.toggle-sub')) return;

    // Overlay
    const overlay = document.createElement('div');
    overlay.classList.add('popup-overlay');
    const popup = document.createElement('div');
    popup.classList.add('popup-content');
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.classList.add('popup-close-btn');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', closePopup);
    overlay.appendChild(closeBtn);

    // Step 1: Sub-categories
    const step1 = document.createElement('div');
    step1.classList.add('popup-step1');
    subCardContainers.forEach(sub => {
      const title = sub.querySelector('.toggle-sub').textContent;
      const btn = document.createElement('button');
      btn.classList.add('popup-step1-btn');
      btn.textContent = title;
      btn.addEventListener('click', () => showNested(sub));
      step1.appendChild(btn);
    });
    popup.appendChild(step1);

    const step2 = document.createElement('div');
    step2.classList.add('popup-step2', 'hidden');
    popup.appendChild(step2);

    // Animate In
    await overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      fill: 'forwards'
    }).finished;
    await popup.animate([{ transform: 'scale(0.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
      duration: 400,
      easing: 'ease-out',
      fill: 'forwards'
    }).finished;

    // Show nested jobs
    async function showNested(subSection) {
      step1.classList.add('hidden');
      step2.innerHTML = '';
      step2.classList.remove('hidden');

      const back = document.createElement('button');
      back.classList.add('popup-back-btn');
      back.textContent = '← Back';
      back.addEventListener('click', () => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
      });
      step2.appendChild(back);

      subSection.querySelectorAll('.job-card').forEach((job, index) => {
        const clone = job.cloneNode(true);
        clone.classList.add('popup-card');

        // Make it look like a card
        clone.style.border = '1px solid #ccc';
        clone.style.padding = '1rem';
        clone.style.borderRadius = '8px';
        clone.style.margin = '1rem 0';
        clone.style.cursor = 'pointer';
        clone.style.background = '#fff';

        const url = clone.dataset.url;
        if (url) {
          clone.addEventListener('click', ev => {
            if (!ev.target.closest('.star-btn')) {
              window.open(url, '_blank');
            }
          });
        }

        step2.appendChild(clone);

        clone.animate(
          [{ transform: 'scale(0.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
          {
            duration: 400,
            delay: index * 100,
            fill: 'forwards',
            easing: 'cubic-bezier(.5,1.5,.5,1)'
          }
        );
      });
    }

    async function closePopup() {
      await popup.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.8)', opacity: 0 }], {
        duration: 300,
        fill: 'forwards'
      }).finished;
      await overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: 'forwards'
      }).finished;
      overlay.remove();
    }

    overlay.addEventListener('click', ev => {
      if (ev.target === overlay) closePopup();
    });
  });
  // ========== FILTER JOB CARDS ==========
const filterButtons = document.querySelectorAll('.filter-btn');
const allSubSections = document.querySelectorAll('.expandable-sub-card');

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;

    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    allSubSections.forEach(sub => {
      const type = sub.dataset.type;
      if (filter === 'all' || type === filter) {
        sub.style.display = 'block';
      } else {
        sub.style.display = 'none';
      }
    });
  });
});

  /* ───────────── EXPANDABLE TOGGLE (if needed) ───────────── */
  document.querySelectorAll('.toggle-sub').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const container = toggle.closest('.expandable-sub-card');
      const nested = container.querySelector('.nested-job-cards');
      if (nested) nested.classList.toggle('hidden');
    });
  });
});

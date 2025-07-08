document.addEventListener('DOMContentLoaded', () => {
  const maxStars = 5;
  const storageKey = 'starredCards';
  let starredIds = JSON.parse(localStorage.getItem(storageKey)) || [];
  const cardSegmentMap = new Map();

  /* ───────────── STAR BUTTON / ORDERING LOGIC ───────────── */
  function reorderSegment(segment) {
    const cards = Array.from(segment.querySelectorAll('.card'));
    const starred = cards
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
    const cards = Array.from(segment.children).filter(el => el.matches('.card'));

    if (isStarred) {
      const firstUn = cards.find(c => !starredIds.includes(c.dataset.id));
      firstUn ? segment.insertBefore(card, firstUn) : segment.appendChild(card);
    } else {
      const origIdx = Number(card.dataset.origIndex);
      const start = cards.findIndex(c => !starredIds.includes(c.dataset.id));
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

  /* ───────────── CARD CLICK / STAR LOGIC ───────────── */
  document.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const starBtn = card.querySelector('.star-btn');
    const url = card.dataset.url?.trim();

    // Prevent redirection on star button
    if (starBtn) {
      starBtn.addEventListener('click', e => {
        e.stopPropagation();
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
    card.addEventListener('click', () => {
      if (url) window.open(url, '_blank');
    });
  });

  /* ───────────── GOVT JOBS FILTERING ───────────── */
  const filterButtons = document.querySelectorAll('.filter-btn');
  const jobCards = document.querySelectorAll('.job-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      jobCards.forEach(card => {
        if (filter === 'all' || card.dataset.type === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
});

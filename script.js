document.addEventListener('DOMContentLoaded', () => {
  // STAR BUTTON LOGIC
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card = btn.closest('.card');
      const container = card.parentElement;
      const isStarred = btn.classList.toggle('starred');
      const starredCards = container.querySelectorAll('.star-btn.starred');

      if (isStarred) {
        if (starredCards.length > 5) {
          btn.classList.remove('starred');
          alert('You can only star up to 5 cards.');
          return;
        }
        container.insertBefore(card, container.firstChild);
      } else {
        container.appendChild(card);
      }
    });
  });

  // REDIRECT ON MAIN CARDS (EXCEPT expandable)
  document.querySelectorAll('.card[data-url]').forEach(card => {
    if (!card.classList.contains('expandable-card') && !card.classList.contains('job-card')) {
      card.addEventListener('click', () => {
        window.open(card.dataset.url, '_blank');
      });
    }
  });

  // EXPAND/COLLAPSE TOGGLE INSIDE expandable-sub-card
  document.querySelectorAll('.toggle-sub').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const container = toggle.closest('.expandable-sub-card');
      const nested = container.querySelector('.nested-job-cards');
      if (nested) {
        nested.classList.toggle('hidden');
      }
    });
  });

  // POPUP FOR expandable-card (two‐step chooser)
const expandableCard = document.querySelector('.expandable-card');
const subCardContainers = Array.from(
  expandableCard.querySelectorAll('.expandable-sub-card')
);

expandableCard.addEventListener('click', async e => {
  if (e.target.closest('.star-btn') || e.target.closest('.toggle-sub')) return;

  // create overlay and popup shell
  const overlay = document.createElement('div');
  overlay.classList.add('popup-overlay');
  const popup = document.createElement('div');
  popup.classList.add('popup-content');
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // CLOSE BUTTON
  const closeBtn = document.createElement('button');
  closeBtn.classList.add('popup-close-btn');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', closePopup);
  overlay.appendChild(closeBtn);

  // First step: show the two sub‐card titles as buttons
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

  // Container for step2 content
  const step2 = document.createElement('div');
  step2.classList.add('popup-step2', 'hidden');
  popup.appendChild(step2);

  // Animate overlay+popup in
  await overlay.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: 300, fill: 'forwards' }
  ).finished;
  await popup.animate(
    [{ transform: 'scale(0.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
    { duration: 400, easing: 'ease-out', fill: 'forwards' }
  ).finished;

  // function to show nested job cards for one sub‐section
  async function showNested(subSection) {
    // hide step1 and clear any previous step2 content
    step1.classList.add('hidden');
    step2.innerHTML = '';
    step2.classList.remove('hidden');

    // back button
    const back = document.createElement('button');
    back.classList.add('popup-back-btn');
    back.textContent = '← Back';
    back.addEventListener('click', () => {
      step2.classList.add('hidden');
      step1.classList.remove('hidden');
    });
    step2.appendChild(back);

    // clone and append only that section’s job‐cards
    subSection.querySelectorAll('.job-card').forEach(job => {
      const clone = job.cloneNode(true);
      clone.classList.add('popup-card');
      const url = clone.dataset.url;
      if (url) {
        clone.addEventListener('click', ev => {
          if (!ev.target.closest('.star-btn')) {
            window.open(url, '_blank');
          }
        });
      }
      step2.appendChild(clone);

      // stagger animation
      clone.animate(
        [{ transform: 'scale(0.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: 400, delay: Array.from(step2.children).indexOf(clone) * 100, fill: 'forwards', easing: 'cubic-bezier(.5,1.5,.5,1)' }
      );
    });
  }

  // close function
  async function closePopup() {
    await popup.animate(
      [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.8)', opacity: 0 }],
      { duration: 300, fill: 'forwards' }
    ).finished;
    await overlay.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 200, fill: 'forwards' }
    ).finished;
    overlay.remove();
  }

  // allow clicking outside popup to close
  overlay.addEventListener('click', ev => {
    if (ev.target === overlay) closePopup();
  });
});

});

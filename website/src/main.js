// Website-only demo data. No imports from the Expo application.
const scenarioIcons = {
  expense:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>',
  transfer:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14l-3-3" /><path d="M20 16H6l3 3" /></svg>',
  commitment:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>',
};

const scenarios = {
  expense: {
    icon: 'expense',
    title: 'Coffee on the way.',
    description: 'You spend ₹180 from everyday cash. Your cash balance goes down, and the expense has a place in your history.',
    label: 'Everyday cash', value: '₹3,200 → ₹3,020',
    footnote: 'Spending is recorded once, against the right source.',
  },
  transfer: {
    icon: 'transfer',
    title: 'Same money. A different pocket.',
    description: 'You withdraw ₹2,000 from your bank account. Your bank balance goes down and your cash goes up. Your total stays the same.',
    label: 'Total tracked balance', value: '₹45,700 → ₹45,700',
    footnote: 'Moving your own money is a transfer, not an expense.',
  },
  commitment: {
    icon: 'commitment',
    title: 'Keep a little room for later.',
    description: 'A ₹4,000 laptop EMI is due in the next 30 days. See it as an upcoming commitment; record an expense when payment is made.',
    label: 'Available after this commitment · next 30 days', value: '₹41,700',
    footnote: 'Illustration: ₹45,700 tracked balance minus this ₹4,000 commitment.',
  },
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canAnimate = () => !reduceMotion.matches && typeof Element.prototype.animate === 'function';

function animateIn(element, { distance = 12, duration = 550, delay = 0 } = {}) {
  if (!element || !canAnimate()) return;
  element.animate(
    [
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'none' },
    ],
    { duration, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }
  );
}

function animateScenarioChange() {
  if (!canAnimate()) return;
  const card = document.querySelector('.scenario-card');
  if (!card) return;
  const parts = [
    card.querySelector('.scenario-symbol'),
    card.querySelector('#scenario-title'),
    card.querySelector('#scenario-description'),
    card.querySelector('.scenario-detail'),
    card.querySelector('#scenario-footnote'),
  ];
  parts.forEach((part, index) => {
    if (!part) return;
    part.animate(
      [
        { opacity: .35, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 320, delay: index * 25, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }
    );
  });
}

function animateAmounts() {
  if (!canAnimate()) return;
  for (const amount of document.querySelectorAll('[data-amount]')) {
    amount.animate(
      [
        { opacity: .35, transform: 'translateY(2px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' }
    );
  }
}

for (const button of document.querySelectorAll('[data-scenario]')) {
  button.addEventListener('click', () => {
    const example = scenarios[button.dataset.scenario];
    for (const choice of document.querySelectorAll('[data-scenario]')) {
      choice.setAttribute('aria-pressed', String(choice === button));
    }
    document.getElementById('scenario-symbol').innerHTML = scenarioIcons[example.icon];
    document.getElementById('scenario-title').textContent = example.title;
    document.getElementById('scenario-description').textContent = example.description;
    document.getElementById('scenario-detail-label').textContent = example.label;
    document.getElementById('scenario-detail-value').textContent = example.value;
    document.getElementById('scenario-footnote').textContent = example.footnote;
    animateScenarioChange();
  });
}

const privacyButton = document.querySelector('.privacy-toggle');
privacyButton.addEventListener('click', () => {
  const hidden = privacyButton.getAttribute('aria-pressed') !== 'true';
  privacyButton.setAttribute('aria-pressed', String(hidden));
  privacyButton.setAttribute('aria-label', `${hidden ? 'Show' : 'Hide'} sample balances`);
  privacyButton.textContent = hidden ? 'Show balances' : 'Hide balances';
  for (const amount of document.querySelectorAll('[data-amount]')) {
    const value = Number(amount.dataset.amount).toLocaleString('en-IN');
    amount.textContent = hidden ? '••••••' : `₹${value}`;
    if (!hidden && amount.classList.contains('big-balance')) {
      const decimals = document.createElement('span');
      decimals.textContent = '.00';
      amount.append(decimals);
    }
  }
  animateAmounts();
});

document.getElementById('download-button').addEventListener('click', () => {
  document.getElementById('download-status').textContent = 'Still in development. A download link will appear here when an APK is released.';
});
document.getElementById('year').textContent = String(new Date().getFullYear());

// Keep the sample commitment date plausible without changing the illustrated day.
const today = new Date();
today.setHours(0, 0, 0, 0);
let commitmentDate = new Date(today.getFullYear(), today.getMonth(), 28);
if (commitmentDate < today) {
  commitmentDate = new Date(today.getFullYear(), today.getMonth() + 1, 28);
}
const commitmentDay = document.getElementById('commitment-day');
const commitmentMonth = document.getElementById('commitment-month');
if (commitmentDay && commitmentMonth) {
  commitmentDay.textContent = String(commitmentDate.getDate());
  commitmentMonth.textContent = commitmentDate
    .toLocaleString('en-US', { month: 'short' })
    .toUpperCase();
}

// Compact mobile navigation: close on link choice, outside click, or Escape.
const navMenu = document.querySelector('.nav-menu');
if (navMenu) {
  navMenu.addEventListener('click', (event) => {
    if (event.target.closest('a')) navMenu.open = false;
  });
  document.addEventListener('click', (event) => {
    if (navMenu.open && !navMenu.contains(event.target)) navMenu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navMenu.open) {
      navMenu.open = false;
      navMenu.querySelector('summary').focus();
    }
  });
}

function initReveals() {
  if (!canAnimate() || !('IntersectionObserver' in window)) return;
  const groups = [
    ['.idea-margin', '.idea-story > *'],
    ['.closer-copy > *', '.scenario-card'],
    ['.footer-intro', '.release-note', '.footer-signature svg'],
  ];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        animateIn(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  for (const group of groups) {
    for (const element of document.querySelectorAll(group.join(','))) {
      observer.observe(element);
    }
  }
}

initReveals();

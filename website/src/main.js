// Website-only demo data. No imports from the Expo application.
const scenarios = {
  expense: {
    symbol: '−', title: 'Coffee on the way.',
    description: 'You spend ₹180 from everyday cash. Your cash balance goes down, and the expense has a place in your history.',
    label: 'Everyday cash', value: '₹3,200 → ₹3,020',
    footnote: 'Spending is recorded once, against the right source.',
  },
  transfer: {
    symbol: '⇄', title: 'Same money. A different pocket.',
    description: 'You withdraw ₹2,000 from your bank account. Your bank balance goes down and your cash goes up. Your total stays the same.',
    label: 'Total tracked balance', value: '₹45,700 → ₹45,700',
    footnote: 'Moving your own money is a transfer, not an expense.',
  },
  commitment: {
    symbol: '◷', title: 'Keep a little room for later.',
    description: 'A ₹4,000 laptop EMI is due in the next 30 days. See it as an upcoming commitment; record an expense when payment is made.',
    label: 'Available after this commitment · next 30 days', value: '₹41,700',
    footnote: 'Illustration: ₹45,700 tracked balance minus this ₹4,000 commitment.',
  },
};

for (const button of document.querySelectorAll('[data-scenario]')) {
  button.addEventListener('click', () => {
    const example = scenarios[button.dataset.scenario];
    for (const choice of document.querySelectorAll('[data-scenario]')) {
      choice.setAttribute('aria-pressed', String(choice === button));
    }
    for (const key of ['symbol', 'title', 'description']) {
      document.getElementById(`scenario-${key}`).textContent = example[key];
    }
    document.getElementById('scenario-detail-label').textContent = example.label;
    document.getElementById('scenario-detail-value').textContent = example.value;
    document.getElementById('scenario-footnote').textContent = example.footnote;
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
});

document.getElementById('download-button').addEventListener('click', () => {
  document.getElementById('download-status').textContent = 'Still in development. A download link will appear here when an APK is released.';
});
document.getElementById('year').textContent = String(new Date().getFullYear());

let lastEscrowID = null;

// ── Toast ──
function toast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-title">${title}</div><div>${message}</div>`;
  container.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity 0.3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
}

// ── Create Escrow ──
async function createEscrow() {
  const buyer = document.getElementById('buyer').value.trim();
  const seller = document.getElementById('seller').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);

  if (!buyer || !seller || isNaN(amount) || amount <= 0) {
    toast('Validation', 'All fields are required and amount must be > 0', 'error');
    return;
  }

  const btn = document.getElementById('create-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing...';

  try {
    const res = await fetch('/escrow/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer, seller, amount })
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'Unknown error');

    lastEscrowID = data.escrowID;

    // Update state panel
    const stateEl = document.getElementById('escrow-state');
    stateEl.classList.remove('hidden');
    document.getElementById('s-id').textContent = data.escrowID;
    document.getElementById('s-buyer').textContent = buyer;
    document.getElementById('s-seller').textContent = seller;
    document.getElementById('s-amount').textContent = amount.toLocaleString();
    document.getElementById('s-status').innerHTML = '<span class="badge badge-held">Held</span>';

    toast('Success', `Escrow created — ${data.escrowID.slice(0, 8)}...`, 'success');
    refreshLedger();

  } catch (e) {
    toast('Error', e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>→</span> Lock Funds';
  }
}

// ── Release Escrow ──
async function releaseEscrow() {
  const escrowID = document.getElementById('release-id').value.trim();
  if (!escrowID) { toast('Validation', 'Escrow ID is required', 'error'); return; }

  try {
    const res = await fetch('/escrow/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escrowID })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    if (lastEscrowID === escrowID) {
      document.getElementById('s-status').innerHTML = '<span class="badge badge-released">Released</span>';
    }

    toast('Released', `Funds sent to seller — ${escrowID.slice(0, 8)}...`, 'success');
    refreshLedger();
  } catch (e) {
    toast('Error', e.message, 'error');
  }
}

// ── Refund Escrow ──
async function refundEscrow() {
  const escrowID = document.getElementById('refund-id').value.trim();
  if (!escrowID) { toast('Validation', 'Escrow ID is required', 'error'); return; }

  try {
    const res = await fetch('/escrow/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escrowID })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    if (lastEscrowID === escrowID) {
      document.getElementById('s-status').innerHTML = '<span class="badge badge-refunded">Refunded</span>';
    }

    toast('Refunded', `Funds returned to buyer — ${escrowID.slice(0, 8)}...`, 'success');
    refreshLedger();
  } catch (e) {
    toast('Error', e.message, 'error');
  }
}

// ── Auto fill ──
function autoFillLastEscrow() {
  if (!lastEscrowID) { toast('Info', 'No escrow created yet', 'info'); return; }
  document.getElementById('release-id').value = lastEscrowID;
  document.getElementById('refund-id').value = lastEscrowID;
}

// ── Refresh Ledger ──
async function refreshLedger() {
  const btn = document.getElementById('refresh-btn');
  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;

  try {
    const res = await fetch('/ledger');
    const data = await res.json();

    // Balances
    const balances = data.balances || {};
    const grid = document.getElementById('balances-grid');
    const entries = Object.entries(balances);

    if (entries.length === 0) {
      grid.innerHTML = '<div class="balance-card"><div class="balance-account">No balances yet</div><div class="balance-amount" style="color:var(--muted)">—</div></div>';
    } else {
      grid.innerHTML = entries.map(([account, amount]) => {
        const num = typeof amount === 'number' ? amount : 0;
        const cls = num < 0 ? 'negative' : '';
        return `<div class="balance-card">
              <div class="balance-account">${account}</div>
              <div class="balance-amount ${cls}">${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>`;
      }).join('');
    }

    // Transactions
    const txs = (data.transactions || []).slice().reverse();
    const tbody = document.getElementById('tx-body');
    if (txs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No transactions yet</td></tr>';
    } else {
      tbody.innerHTML = txs.map(tx => {
        const amtClass = tx.fromAccountID === 'escrow_pool' ? 'credit' : 'debit';
        return `<tr>
              <td class="tx-id" title="${tx.transactionID}">${tx.transactionID ? tx.transactionID.slice(0, 12) + '...' : '—'}</td>
              <td>${tx.fromAccountID || '—'}</td>
              <td>${tx.toAccountID || '—'}</td>
              <td class="tx-amount ${amtClass}">${typeof tx.amount === 'number' ? tx.amount.toLocaleString() : '—'}</td>
              <td class="tx-type">${tx.type || '—'}</td>
            </tr>`;
      }).join('');
    }

  } catch (e) {
    toast('Error', 'Could not fetch ledger: ' + e.message, 'error');
  } finally {
    btn.innerHTML = '↻ Refresh';
    btn.disabled = false;
  }
}

  async function topup() {
    const userID = document.getElementById("topup-user").value
    const amount = document.getElementById("topup-amount").value

    await fetch("/ledger/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userID, amount })
    })

    refreshLedger()
  }

// Auto-refresh on load
refreshLedger();
// Poll every 5 seconds
setInterval(refreshLedger, 5000);

// Enter key support
['buyer', 'seller', 'amount'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') createEscrow();
  });
});

document.getElementById('release-id').addEventListener('keydown', e => {
  if (e.key === 'Enter') releaseEscrow();
});
document.getElementById('refund-id').addEventListener('keydown', e => {
  if (e.key === 'Enter') refundEscrow();
});
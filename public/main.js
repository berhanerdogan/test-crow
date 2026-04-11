// ── State ──
let currentRole = 'buyer'
let lastEscrowID = null
let lastEscrowStatus = null

// ── Role ──
function setRole(role) {
  currentRole = role
  document.getElementById('btn-buyer').classList.toggle('active', role === 'buyer')
  document.getElementById('btn-seller').classList.toggle('active', role === 'seller')
  document.getElementById('current-user-label').textContent = role === 'buyer' ? 'buyer001' : 'seller001'

  const buyerPanels = ['panel-buyer-left', 'panel-buyer-right']
  const sellerPanels = ['panel-seller-left', 'panel-seller-right']

  buyerPanels.forEach(id => document.getElementById(id).classList.toggle('hidden', role !== 'buyer'))
  sellerPanels.forEach(id => document.getElementById(id).classList.toggle('hidden', role !== 'seller'))

  if (role === 'seller') {
    loadSellerEscrows()
  } else {
    getAllProducts()
    loadBuyerEscrows() 
  }
  refreshLedger()
}

// ── Headers ──
function roleHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-demo-role': currentRole
  }
}

// ── Toast ──
function toast(title, message, type = 'info') {
  const container = document.getElementById('toast-container')
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.innerHTML = `<div class="toast-title">${title}</div><div>${message}</div>`
  container.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, 4000)
}

// ── Badge ──
function statusBadge(status) {
  const map = {
    held: 'badge-held',
    shipped: 'badge-shipped',
    released: 'badge-released',
    refunded: 'badge-refunded'
  }
  return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`
}


// ── Select escrow ──
function selectEscrow(id, seller, amount, status) {
  updateEscrowState(id, seller, amount, status)
}

// ── Update UI ──
function updateEscrowState(escrowID, seller, amount, status) {
  lastEscrowID = escrowID
  lastEscrowStatus = status

  document.getElementById('no-escrow').classList.add('hidden')
  document.getElementById('escrow-state').classList.remove('hidden')

  document.getElementById('s-id').textContent = escrowID
  document.getElementById('s-seller').textContent = seller
  document.getElementById('s-amount').textContent = Number(amount).toLocaleString()
  document.getElementById('s-status').innerHTML = statusBadge(status)

  const btnConfirm = document.getElementById('btn-confirm')
  const btnRefund = document.getElementById('btn-refund-buyer')

  btnConfirm.disabled = status !== 'shipped'
  btnRefund.disabled = status === 'released' || status === 'refunded'
}

// ── Buyer escrows ──
async function loadBuyerEscrows() {
  const listEl = document.getElementById('buyer-escrow-list')
  listEl.innerHTML = '<div class="empty-state"><span class="spinner"></span></div>'

  try {
    const res = await fetch('/escrow/buyer', { headers: roleHeaders() })
    const data = await res.json()
    const escrows = data.escrows || []

    if (!escrows.length) {
      listEl.innerHTML = '<div class="empty-state">No orders yet</div>'
      return
    }

    listEl.innerHTML = escrows.map(e => `
      <div class="escrow-item"
        onclick="selectEscrow('${e.escrowID}','${e.sellerUserID}',${e.amount},'${e.status}')">

        <div class="escrow-item-info">
          <div class="escrow-item-id">${e.escrowID}</div>
          <div class="escrow-item-amount">$${Number(e.amount).toLocaleString()}</div>
          <div class="escrow-item-buyer">seller: ${e.sellerUserID}</div>
        </div>

        <div>
          ${statusBadge(e.status)}
        </div>
      </div>
    `).join('')

  } catch (e) {
    listEl.innerHTML = '<div class="empty-state">Failed</div>'
    toast('Error', e.message, 'error')
  }
}

// ── Update buyer escrow state ──
function updateEscrowState(escrowID, seller, amount, status) {
  lastEscrowID = escrowID
  lastEscrowStatus = status

  document.getElementById('no-escrow').classList.add('hidden')
  document.getElementById('escrow-state').classList.remove('hidden')
  document.getElementById('s-id').textContent = escrowID
  document.getElementById('s-seller').textContent = seller
  document.getElementById('s-amount').textContent = Number(amount).toLocaleString()
  document.getElementById('s-status').innerHTML = statusBadge(status)

  const btnConfirm = document.getElementById('btn-confirm')
  const btnRefund = document.getElementById('btn-refund-buyer')

  // Confirm only available when shipped
  btnConfirm.disabled = status !== 'shipped'
  // Refund not available after release/refund
  btnRefund.disabled = status === 'released' || status === 'refunded'
}

// ── Buy Product ──
async function buyProduct(product) {
  try {
    const res = await fetch('/escrow/create', {
      method: 'POST',
      headers: roleHeaders(),
      body: JSON.stringify({ product })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message || 'Unknown error')

    updateEscrowState(data.escrowID, product.seller_id, product.price, 'held')

    toast('Success', `Escrow created — ${data.escrowID.slice(0, 8)}...`, 'success')
    loadBuyerEscrows()
    refreshLedger()
  } catch (e) {
    toast('Error', e.message, 'error')
  }
}

// ── Confirm Delivery ──
async function confirmDelivery() {
  if (!lastEscrowID) return
  try {
    const res = await fetch('/escrow/release', {
      method: 'POST',
      headers: roleHeaders(),
      body: JSON.stringify({ escrowID: lastEscrowID })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)

    document.getElementById('s-status').innerHTML = statusBadge('released')
    document.getElementById('btn-confirm').disabled = true
    document.getElementById('btn-refund-buyer').disabled = true
    lastEscrowStatus = 'released'

    toast('Released', 'Funds sent to seller', 'success')
    loadBuyerEscrows()
    refreshLedger()
  } catch (e) {
    toast('Error', e.message, 'error')
  }
}

// ── Request Refund ──
async function requestRefund() {
  if (!lastEscrowID) return
  try {
    const res = await fetch('/escrow/refund', {
      method: 'POST',
      headers: roleHeaders(),
      body: JSON.stringify({ escrowID: lastEscrowID })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)

    document.getElementById('s-status').innerHTML = statusBadge('refunded')
    document.getElementById('btn-confirm').disabled = true
    document.getElementById('btn-refund-buyer').disabled = true
    lastEscrowStatus = 'refunded'

    toast('Refunded', 'Funds returned to your wallet', 'success')
    loadBuyerEscrows()
    refreshLedger()
  } catch (e) {
    toast('Error', e.message, 'error')
  }
}

// ── Ship Escrow (seller) ──
async function shipEscrow(escrowID) {
  try {
    const res = await fetch('/escrow/ship', {
      method: 'POST',
      headers: roleHeaders(),
      body: JSON.stringify({ escrowID })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)

    toast('Shipped', `Order ${escrowID.slice(0, 8)}... marked as shipped`, 'success')
    loadSellerEscrows()
    refreshLedger()
  } catch (e) {
    toast('Error', e.message, 'error')
  }
}

// ── Load Seller Escrows ──
async function loadSellerEscrows() {
  const listEl = document.getElementById('seller-escrow-list')
  listEl.innerHTML = '<div class="empty-state"><span class="spinner"></span></div>'

  try {
    const res = await fetch('/escrow/seller', { headers: roleHeaders() })
    const data = await res.json()
    const escrows = data.escrows || []

    if (!escrows.length) {
      listEl.innerHTML = '<div class="empty-state">No orders yet</div>'
      return
    }

    listEl.innerHTML = escrows.map(e => {
      const canShip = e.status === 'held'
      return `
        <div class="escrow-item">
          <div class="escrow-item-info">
            <div class="escrow-item-id">${e.escrowID}</div>
            <div class="escrow-item-amount">$${Number(e.amount).toLocaleString()}</div>
            <div class="escrow-item-buyer">from: ${e.buyerUserID}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
            ${statusBadge(e.status)}
            ${canShip
              ? `<button class="btn btn-warning btn-sm" onclick="shipEscrow('${e.escrowID}')">↑ Ship</button>`
              : ''}
          </div>
        </div>
      `
    }).join('')

    // Update seller balance display
    const balRes = await fetch('/ledger', { headers: roleHeaders() })
    const balData = await balRes.json()
    const sellerBal = balData.balances?.['seller001'] ?? 0
    document.getElementById('seller-balance').textContent = '$' + sellerBal.toLocaleString()

  } catch (e) {
    listEl.innerHTML = '<div class="empty-state">Failed to load orders</div>'
    toast('Error', 'Could not fetch orders: ' + e.message, 'error')
  }
}

// ── Products ──
async function getAllProducts() {
  const listEl = document.getElementById('product-list')
  listEl.innerHTML = '<div class="empty-state"><span class="spinner"></span></div>'

  try {
    const res = await fetch('/products')
    const data = await res.json()
    const products = data.products || []

    if (!products.length) {
      listEl.innerHTML = '<div class="empty-state">No products found</div>'
      return
    }

    listEl.innerHTML = products.map(p => `
      <div class="product-item">
        <div class="product-info">
          <div class="product-name">${p.product_name || 'Unnamed'}</div>
          <div class="product-meta">
            <span class="product-id">#${p.product_id}</span>
            <span class="product-seller">by ${p.seller_id}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <span class="product-price">$${Number(p.price).toLocaleString()}</span>
          <button class="btn btn-primary btn-sm" onclick="buyProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})">Buy</button>
        </div>
      </div>
    `).join('')
  } catch (e) {
    listEl.innerHTML = '<div class="empty-state">Failed to load products</div>'
    toast('Error', 'Could not fetch products: ' + e.message, 'error')
  }
}

// ── Top-up ──
async function topup() {
  const amount = document.getElementById('topup-amount').value
  if (!amount || Number(amount) <= 0) {
    toast('Validation', 'Enter a valid amount', 'error')
    return
  }
  await fetch('/ledger/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userID: 'buyer001', amount: Number(amount) })
  })
  document.getElementById('topup-amount').value = ''
  toast('Success', `$${Number(amount).toLocaleString()} added to buyer001`, 'success')
  refreshLedger()
}

// ── Ledger ──
async function refreshLedger() {
  try {
    const res = await fetch('/ledger')
    const data = await res.json()
    const balances = data.balances || {}
    const grid = document.getElementById('balances-grid')
    const entries = Object.entries(balances)

    grid.innerHTML = entries.length === 0
      ? '<div class="balance-card"><div class="balance-account">No balances</div><div class="balance-amount" style="color:var(--muted)">—</div></div>'
      : entries.map(([account, amount]) => {
          const num = typeof amount === 'number' ? amount : 0
          return `<div class="balance-card">
            <div class="balance-account">${account}</div>
            <div class="balance-amount ${num < 0 ? 'negative' : ''}">$${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>`
        }).join('')

    const txs = (data.transactions || []).slice().reverse()
    const tbody = document.getElementById('tx-body')
    tbody.innerHTML = txs.length === 0
      ? '<tr><td colspan="5" class="empty-state">No transactions yet</td></tr>'
      : txs.map(tx => `
          <tr>
            <td class="tx-id" title="${tx.transactionID}">${tx.transactionID ? tx.transactionID.slice(0, 12) + '...' : '—'}</td>
            <td>${tx.fromAccountID || '—'}</td>
            <td>${tx.toAccountID || '—'}</td>
            <td class="tx-amount ${tx.fromAccountID === 'escrow_pool' ? 'credit' : 'debit'}">$${typeof tx.amount === 'number' ? tx.amount.toLocaleString() : '—'}</td>
            <td class="tx-type">${tx.type || '—'}</td>
          </tr>
        `).join('')
  } catch (e) {
    toast('Error', 'Could not fetch ledger: ' + e.message, 'error')
  }
}

// ── Init ──
getAllProducts()
loadBuyerEscrows()
refreshLedger()
setInterval(refreshLedger, 8000)
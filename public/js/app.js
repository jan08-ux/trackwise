// TrackWise - Frontend App

Chart.defaults.color = "#64748b";
Chart.defaults.borderColor = "#222638";
Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size = 11;

const CAT_COLORS  = ["#00c9a7","#6366f1","#f59e0b","#ef4444","#38bdf8","#c084fc"];
const CAT_ICONS   = { Food:"F", Transport:"T", Shopping:"S", Bills:"B", Education:"E", Health:"H" };
const CAT_CLASS   = { Food:"cat-food", Transport:"cat-transport", Shopping:"cat-shopping", Bills:"cat-bills", Education:"cat-education", Health:"cat-health" };

let allExpenses = [];
let charts = {};
let editingId = null;

// Auth check on load
(async () => {
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    const d = await r.json();
    if (!d.loggedIn) {
      window.location.replace('/login.html');
      return;
    }
    const initials = d.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('userNameEl').textContent = d.name;
    document.getElementById('avatarEl').textContent   = initials;
    document.getElementById('expDate').value = new Date().toISOString().slice(0,10);
    await loadDashboard();
  } catch(e) {
    console.error('Auth error:', e);
  }
})();

async function logout() {
  await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
  window.location.href = '/login.html';
}

async function api(url, opts={}) {
  const r = await fetch(url, { credentials:'include', headers:{'Content-Type':'application/json'}, ...opts });
  if (r.status === 401) { window.location.href = '/login.html'; return null; }
  return r.json();
}

// Dashboard
async function loadDashboard() {
  const expenses = await api('/api/expenses');
  if (!expenses) return;
  allExpenses = expenses;

  // Calculate stats directly from expenses
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear  = now.getFullYear();

  const thisMonth = expenses.filter(e => {
    const d = new Date(e.expense_date);
    return d.getMonth()+1 === curMonth && d.getFullYear() === curYear;
  });

  const total = thisMonth.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Category totals
  const catMap = {};
  thisMonth.forEach(e => {
    catMap[e.category_name] = (catMap[e.category_name] || 0) + parseFloat(e.amount);
  });
  const cats = Object.entries(catMap).map(([category_name, total]) => ({ category_name, total }))
    .sort((a,b) => b.total - a.total);

  // Monthly totals for chart
  const monthMap = {};
  expenses.forEach(e => {
    const d = new Date(e.expense_date);
    const key = (d.getFullYear()) + '-' + String(d.getMonth()+1).padStart(2,'0');
    const label = d.toLocaleString('default',{month:'short'}) + ' ' + d.getFullYear();
    if (!monthMap[key]) monthMap[key] = { month_label: label, yr: d.getFullYear(), mo: d.getMonth()+1, total: 0 };
    monthMap[key].total += parseFloat(e.amount);
  });
  const monthly = Object.values(monthMap).sort((a,b) => a.yr - b.yr || a.mo - b.mo);

  // Budget
  const budget = await api('/api/analytics/budget-status');
  const insights = await api('/api/analytics/insights');

  // Render
  document.getElementById('statTotal').textContent = total.toLocaleString('en-IN');
  document.getElementById('statCount').textContent = thisMonth.length;

  if (budget && budget.limit) {
    const rem = Math.max(0, budget.limit - total);
    document.getElementById('statRemaining').textContent = rem.toLocaleString('en-IN');
    document.getElementById('statBudgetSub').textContent = 'of Rs.' + parseFloat(budget.limit).toLocaleString('en-IN') + ' limit';
  }

  if (cats.length) {
    document.getElementById('statTopCat').textContent = cats[0].category_name;
    document.getElementById('statTopAmt').textContent = 'Rs.' + parseFloat(cats[0].total).toLocaleString('en-IN');
  }

  // Month over month
  if (monthly.length >= 2) {
    const prev = monthly[monthly.length-2];
    const last = monthly[monthly.length-1];
    if (prev && prev.total > 0) {
      const chg = Math.round((last.total - prev.total) / prev.total * 100);
      document.getElementById('statTotalSub').innerHTML =
        '<span class="' + (chg >= 0 ? 'up' : 'down') + '">' + (chg >= 0 ? '+' : '') + chg + '%</span>' +
        ' <span class="neutral">vs last month</span>';
    }
  } else {
    document.getElementById('statTotalSub').textContent = 'No comparison data';
  }

  document.getElementById('pageSub').textContent =
    now.toLocaleString('default',{month:'long'}) + ' ' + now.getFullYear() + ' - Financial Overview';

  renderBudget(budget);
  renderRecentTx(allExpenses.slice(0, 6));
  renderInsights(insights);
  buildCharts(monthly, cats);
}

function renderStats(monthly, cats, budget, expenses) {
  const now   = new Date();
  // Use last entry in monthly array as current, or find by month/year
  const cur   = monthly.find(m => m.mo == now.getMonth()+1 && m.yr == now.getFullYear())
              || monthly[monthly.length - 1];
  const total = cur ? parseFloat(cur.total) : 0;

  document.getElementById('statTotal').textContent = total.toLocaleString('en-IN');
  document.getElementById('statCount').textContent = expenses.length;

  if (budget && budget.limit) {
    const rem = Math.max(0, budget.limit - total);
    document.getElementById('statRemaining').textContent = rem.toLocaleString('en-IN');
    document.getElementById('statBudgetSub').textContent = 'of Rs.' + parseFloat(budget.limit).toLocaleString('en-IN') + ' limit';
  }

  if (cats && cats.length) {
    document.getElementById('statTopCat').textContent = cats[0].category_name;
    document.getElementById('statTopAmt').textContent = 'Rs.' + parseFloat(cats[0].total).toLocaleString('en-IN');
  }

  const prev = monthly[monthly.length - 2];
  const last = monthly[monthly.length - 1];
  if (prev && last && prev.total > 0) {
    const chg = Math.round((last.total - prev.total) / prev.total * 100);
    document.getElementById('statTotalSub').innerHTML =
      '<span class="' + (chg >= 0 ? 'up' : 'down') + '">' + (chg >= 0 ? '+' : '') + chg + '%</span>' +
      ' <span class="neutral">vs last month</span>';
  } else {
    document.getElementById('statTotalSub').textContent = 'No comparison data';
  }

  const now2 = new Date();
  document.getElementById('pageSub').textContent =
    now2.toLocaleString('default', { month:'long' }) + ' ' + now2.getFullYear() + ' - Financial Overview';
}

function renderBudget(b) {
  if (!b || !b.limit) {
    document.getElementById('budgetPctLabel').textContent  = 'No budget set';
    document.getElementById('budgetMonthLabel').textContent = 'Go to Settings to set a monthly budget';
    document.getElementById('budgetSpentDisplay').textContent = '-';
    return;
  }
  const pct = Math.min(100, b.pct || 0);
  const bar = document.getElementById('budgetBar');
  bar.style.width = pct + '%';
  bar.className   = 'progress-fill' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warn' : '');
  document.getElementById('budgetPctLabel').textContent   = pct + '% used';
  document.getElementById('budgetSpentDisplay').textContent = 'Rs.' + parseFloat(b.spent).toLocaleString('en-IN');
  const now = new Date();
  document.getElementById('budgetMonthLabel').textContent =
    now.toLocaleString('default',{month:'long'}) + ' ' + now.getFullYear() +
    ' | Rs.' + parseFloat(b.limit).toLocaleString('en-IN') + ' limit';
  const alert = document.getElementById('budgetAlert');
  if (pct >= 100) {
    alert.className   = 'budget-alert show';
    alert.textContent = 'Budget exceeded! You have spent Rs.' + (parseFloat(b.spent) - parseFloat(b.limit)).toLocaleString('en-IN') + ' over your limit.';
  } else if (pct >= 80) {
    alert.className   = 'budget-alert show';
    alert.textContent = 'Warning: ' + pct + '% of monthly budget used. Consider reviewing your spending.';
  } else {
    alert.className = 'budget-alert';
  }
}

function renderRecentTx(expenses) {
  const list = document.getElementById('recentTxList');
  if (!expenses || !expenses.length) { list.innerHTML = '<div class="empty-state">No transactions yet</div>'; return; }
  list.innerHTML = expenses.map(e => {
    const cat  = e.category_name;
    const date = new Date(e.expense_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
    return '<div class="tx-item">' +
      '<div class="tx-icon ' + (CAT_CLASS[cat] || 'cat-food') + '">' + (CAT_ICONS[cat] || 'X') + '</div>' +
      '<div class="tx-info"><div class="tx-desc">' + e.description + '</div><div class="tx-cat">' + cat + '</div></div>' +
      '<div class="tx-right"><div class="tx-amount">Rs.' + parseFloat(e.amount).toLocaleString('en-IN') + '</div>' +
      '<div class="tx-date">' + date + '</div></div></div>';
  }).join('');
}

function renderInsights(data) {
  const list = document.getElementById('insightsList');
  const items = [];

  if (data && data.rows && data.rows.length) {
    const top = [...data.rows].sort((a,b) => b.cur_month - a.cur_month)[0];
    if (top) items.push({ icon:'[TOP]', title: top.category_name + ' is your top spend', text: 'Rs.' + parseFloat(top.cur_month).toLocaleString('en-IN') + ' this month' });
  }
  if (data && data.insights) {
    data.insights.forEach(i => items.push({ icon: i.type === 'warn' ? '[UP]' : '[DOWN]', title: i.category, text: i.message }));
  }
  if (!items.length) items.push({ icon:'[OK]', title:'Spending looks normal', text:'No unusual patterns detected this month' });
  items.push({ icon:'[TIP]', title:'Review subscriptions', text:'Check your Bills category for recurring charges' });

  list.innerHTML = items.map(i =>
    '<div class="insight-item">' +
    '<span class="insight-icon">' + i.icon + '</span>' +
    '<div class="insight-text"><strong>' + i.title + '</strong>' + i.text + '</div></div>'
  ).join('');
}

function buildCharts(monthly, cats) {
  if (charts.trend) { charts.trend.destroy(); charts.trend = null; }
  if (charts.donut) { charts.donut.destroy(); charts.donut = null; }

  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: monthly.map(m => m.month_label),
      datasets: [{ label:'Spent', data: monthly.map(m => parseFloat(m.total)),
        borderColor:'#00c9a7', backgroundColor:'rgba(0,201,167,.08)',
        borderWidth:2, fill:true, tension:0.4, pointBackgroundColor:'#00c9a7', pointRadius:5 }]
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{ x:{ grid:{ color:'#1a1e2e' } }, y:{ grid:{ color:'#1a1e2e' }, ticks:{ callback: v => 'Rs.' + v.toLocaleString() } } }
    }
  });

  if (cats && cats.length) {
    charts.donut = new Chart(document.getElementById('donutChart'), {
      type: 'doughnut',
      data: {
        labels: cats.map(c => c.category_name),
        datasets: [{ data: cats.map(c => parseFloat(c.total)), backgroundColor: CAT_COLORS, borderWidth:0, hoverOffset:8 }]
      },
      options: { responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, padding:12 } },
          tooltip:{ callbacks:{ label: ctx => ' Rs.' + ctx.parsed.toLocaleString() + ' - ' + ctx.label } } }
      }
    });
  }
}

async function loadAnalytics() {
  const [cats, compare, heatmap] = await Promise.all([
    api('/api/analytics/categories'),
    api('/api/analytics/compare'),
    api('/api/analytics/heatmap'),
  ]);
  if (!cats) return;

  if (charts.bar)     { charts.bar.destroy();     charts.bar = null; }
  if (charts.compare) { charts.compare.destroy(); charts.compare = null; }

  if (cats.length) {
    charts.bar = new Chart(document.getElementById('barChart'), {
      type: 'bar',
      data: {
        labels: cats.map(c => c.category_name),
        datasets: [{ data: cats.map(c => parseFloat(c.total)), backgroundColor: CAT_COLORS, borderRadius:6, borderSkipped:false }]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{ x:{ grid:{ display:false } }, y:{ grid:{ color:'#1a1e2e' }, ticks:{ callback: v => 'Rs.' + v } } }
      }
    });
  }

  if (compare && compare.length) {
    const names = compare.map(c => c.category_name);
    const now   = new Date();
    const m1    = new Date(now.getFullYear(), now.getMonth()-2, 1).toLocaleString('default',{month:'short'});
    const m2    = new Date(now.getFullYear(), now.getMonth()-1, 1).toLocaleString('default',{month:'short'});
    const m3    = now.toLocaleString('default',{month:'short'});
    charts.compare = new Chart(document.getElementById('compareChart'), {
      type: 'bar',
      data: {
        labels: names,
        datasets: [
          { label: m1, data: compare.map(c => parseFloat(c.m1)||0), backgroundColor:'rgba(99,102,241,.7)',  borderRadius:4 },
          { label: m2, data: compare.map(c => parseFloat(c.m2)||0), backgroundColor:'rgba(245,158,11,.7)',  borderRadius:4 },
          { label: m3, data: compare.map(c => parseFloat(c.m3)||0), backgroundColor:'rgba(0,201,167,.7)',   borderRadius:4 },
        ]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, padding:12 } } },
        scales:{ x:{ grid:{ display:false } }, y:{ grid:{ color:'#1a1e2e' }, ticks:{ callback: v => 'Rs.' + v } } }
      }
    });
  }

  // Heatmap
  const container = document.getElementById('heatmap');
  container.innerHTML = '';
  const now2 = new Date();
  const days  = new Date(now2.getFullYear(), now2.getMonth()+1, 0).getDate();
  const spendMap = {};
  (heatmap || []).forEach(r => { spendMap[r.day_num] = parseFloat(r.total); });
  const maxVal = Math.max(...Object.values(spendMap), 1);
  for (let d = 1; d <= days; d++) {
    const val = spendMap[d] || 0;
    const i   = val / maxVal;
    let bg = '#1a1e2e';
    if (i > 0.7) bg = 'var(--teal)';
    else if (i > 0.4) bg = 'rgba(0,201,167,.5)';
    else if (i > 0.1) bg = 'rgba(0,201,167,.2)';
    const cell = document.createElement('div');
    cell.style.cssText = 'width:28px;height:28px;border-radius:4px;background:' + bg + ';position:relative;display:inline-block;';
    cell.title = 'Day ' + d + ': Rs.' + val.toLocaleString('en-IN');
    const lbl = document.createElement('span');
    lbl.style.cssText = 'position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);font-size:8px;color:var(--text-muted)';
    lbl.textContent = d;
    cell.appendChild(lbl);
    container.appendChild(cell);
  }
  document.getElementById('heatmapLabel').textContent =
    now2.toLocaleString('default',{month:'long'}) + ' ' + now2.getFullYear();
}

// Expense table
async function loadExpenses() {
  const data = await api('/api/expenses');
  if (!data) return;
  allExpenses = data;
  renderTable(allExpenses);
}

function renderTable(expenses) {
  const body = document.getElementById('expTableBody');
  if (!expenses || !expenses.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty-state">No expenses found</td></tr>'; return;
  }
  body.innerHTML = expenses.map(e => {
    const cat  = e.category_name;
    const date = new Date(e.expense_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    return '<tr>' +
      '<td style="color:var(--text-muted)">' + date + '</td>' +
      '<td style="color:var(--text)">' + e.description + '</td>' +
      '<td><span class="cat-badge badge-' + cat + '">' + cat + '</span></td>' +
      '<td class="amount-cell">Rs.' + parseFloat(e.amount).toLocaleString('en-IN') + '</td>' +
      '<td><div class="action-cell">' +
        '<button class="btn btn-ghost btn-sm" onclick="openModal(' + e.expense_id + ')" style="padding:4px 9px">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteExpense(' + e.expense_id + ')" style="padding:4px 9px">Del</button>' +
      '</div></td></tr>';
  }).join('');
}

function filterTable() {
  const q   = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('catFilter').value;
  renderTable(allExpenses.filter(e =>
    (!q   || e.description.toLowerCase().includes(q) || e.category_name.toLowerCase().includes(q)) &&
    (!cat || e.category_name === cat)
  ));
}

// Modal
function openModal(id) {
  editingId = id || null;
  document.getElementById('modalTitle').textContent = id ? 'Edit Expense' : 'Add Expense';
  if (id) {
    const exp = allExpenses.find(e => e.expense_id === id);
    if (exp) {
      document.getElementById('expAmount').value = exp.amount;
      document.getElementById('expDate').value   = exp.expense_date.slice(0,10);
      document.getElementById('expDesc').value   = exp.description;
      document.getElementById('expCat').value    = exp.category_id;
    }
  } else {
    document.getElementById('expAmount').value = '';
    document.getElementById('expDate').value   = new Date().toISOString().slice(0,10);
    document.getElementById('expDesc').value   = '';
    document.getElementById('expCat').value    = '1';
  }
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
function closeModalIfOutside(e) { if (e.target.id === 'modalOverlay') closeModal(); }

async function saveExpense() {
  const amount       = parseFloat(document.getElementById('expAmount').value);
  const expense_date = document.getElementById('expDate').value;
  const description  = document.getElementById('expDesc').value.trim();
  const category_id  = document.getElementById('expCat').value;
  if (!amount || !description || !expense_date) { showToast('Please fill all fields'); return; }
  const body = JSON.stringify({ amount, expense_date, description, category_id });
  if (editingId) {
    await api('/api/expenses/' + editingId, { method:'PUT', body });
    showToast('Expense updated');
  } else {
    await api('/api/expenses', { method:'POST', body });
    showToast('Expense added');
  }
  closeModal();
  await loadExpenses();
  await loadDashboard();
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await api('/api/expenses/' + id, { method:'DELETE' });
  showToast('Expense deleted');
  await loadExpenses();
  await loadDashboard();
}

// Budget
async function saveBudget() {
  const limit = parseFloat(document.getElementById('settingsBudget').value);
  if (!limit || limit <= 0) { showToast('Enter a valid budget amount'); return; }
  const now = new Date();
  await api('/api/budgets', { method:'POST', body: JSON.stringify({ monthly_limit: limit, budget_month: now.getMonth()+1, budget_year: now.getFullYear() }) });
  showToast('Budget saved');
  await loadDashboard();
}

async function loadSettings() {
  const now = new Date();
  const b = await api('/api/budgets?month=' + (now.getMonth()+1) + '&year=' + now.getFullYear());
  if (b && b.monthly_limit) document.getElementById('settingsBudget').value = b.monthly_limit;
}

// CSV Export
async function exportCSV() {
  const data = allExpenses.length ? allExpenses : await api('/api/expenses');
  if (!data || !data.length) { showToast('No expenses to export'); return; }
  const headers = ['Date','Description','Category','Amount'];
  const rows    = data.map(e => [e.expense_date.slice(0,10), '"' + e.description + '"', e.category_name, parseFloat(e.amount).toFixed(2)]);
  const csv     = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob    = new Blob([csv], { type:'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href = url; a.download = 'trackwise_' + new Date().toISOString().slice(0,7) + '.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV exported');
}

// Navigation
function showView(name, el) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  if (el) el.classList.add('active');
  const titles = { dashboard:'Dashboard', expenses:'Expenses', analytics:'Analytics', settings:'Settings' };
  document.getElementById('pageTitle').textContent = titles[name] || name;
  if (name === 'expenses')  loadExpenses();
  if (name === 'analytics') loadAnalytics();
  if (name === 'settings')  loadSettings();
}

// Toast
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

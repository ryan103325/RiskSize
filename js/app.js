import { validate, calculate, DEFAULT_RATES, DEFAULT_INPUTS } from './calculator.js';
import { cloudEnabled, initCloud, signIn, signOutUser, loadUserData, saveUserData } from './cloud.js';

const LS_KEY = 'risksize-v1';

// ---------- 本機儲存 ----------

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* 壞掉的資料直接重來 */ }
  return { settings: {}, lastInputs: {}, records: [] };
}

function saveLocal() {
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

let store = loadLocal();
let currentUser = null;
let lastResult = null; // 最近一次成功的計算，供「儲存紀錄」使用

// ---------- DOM ----------

const $ = (id) => document.getElementById(id);
const el = {
  form: $('calc-form'),
  risk: $('risk'), entry: $('entry'), stop: $('stop'),
  rr: $('rr'), feeDiscount: $('fee-discount'),
  dirButtons: document.querySelectorAll('.dir-btn'),
  riskHint: $('risk-hint'),
  errorBox: $('error-box'),
  results: $('results'),
  saveRecordBtn: $('save-record'),
  historyBody: $('history-body'),
  historyEmpty: $('history-empty'),
  clearHistory: $('clear-history'),
  exportCsv: $('export-csv'),
  // 設定
  setBaseFee: $('set-base-fee'), setTax: $('set-tax'),
  setDefaultRr: $('set-default-rr'), setDefaultDiscount: $('set-default-discount'),
  // 登入
  authArea: $('auth-area'),
};

function getDirection() {
  return document.querySelector('.dir-btn.active')?.dataset.dir || 'long';
}

function setDirection(dir) {
  el.dirButtons.forEach((b) => b.classList.toggle('active', b.dataset.dir === dir));
}

// ---------- 設定（費率可自訂，避免優惠稅率到期後要改程式碼） ----------

function getRates() {
  return {
    baseFeeRate: (parseFloat(el.setBaseFee.value) || 0.1425) / 100,
    taxRate: (parseFloat(el.setTax.value) || 0.15) / 100,
  };
}

function applySettings(s) {
  el.setBaseFee.value = s.baseFeePct ?? 0.1425;
  el.setTax.value = s.taxPct ?? 0.15;
  el.setDefaultRr.value = s.defaultRr ?? DEFAULT_INPUTS.rr;
  el.setDefaultDiscount.value = s.defaultDiscount ?? DEFAULT_INPUTS.feeDiscount;
}

function collectSettings() {
  return {
    baseFeePct: parseFloat(el.setBaseFee.value) || 0.1425,
    taxPct: parseFloat(el.setTax.value) || 0.15,
    defaultRr: parseFloat(el.setDefaultRr.value) || DEFAULT_INPUTS.rr,
    defaultDiscount: parseFloat(el.setDefaultDiscount.value) || DEFAULT_INPUTS.feeDiscount,
  };
}

function persist() {
  store.settings = collectSettings();
  store.lastInputs = collectInputs();
  saveLocal();
  if (currentUser) {
    saveUserData(currentUser.uid, {
      settings: store.settings,
      lastInputs: store.lastInputs,
      records: store.records,
      updatedAt: Date.now(),
    }).catch(console.error);
  }
}

// ---------- 輸入 ----------

function collectInputs() {
  return {
    riskThousand: parseFloat(el.risk.value),
    direction: getDirection(),
    entry: parseFloat(el.entry.value),
    stop: parseFloat(el.stop.value),
    rr: parseFloat(el.rr.value) || DEFAULT_INPUTS.rr,
    feeDiscount: parseFloat(el.feeDiscount.value) || DEFAULT_INPUTS.feeDiscount,
  };
}

function applyInputs(i) {
  if (!i) return;
  if (i.riskThousand != null) el.risk.value = i.riskThousand;
  if (i.entry != null) el.entry.value = i.entry;
  if (i.stop != null) el.stop.value = i.stop;
  if (i.rr != null) el.rr.value = i.rr;
  if (i.feeDiscount != null) el.feeDiscount.value = i.feeDiscount;
  setDirection(i.direction || 'long');
}

// ---------- 格式化 ----------

const fmtMoney = (n) => 'NT$ ' + Math.round(n).toLocaleString('zh-TW');
const fmtPrice = (n) => n.toLocaleString('zh-TW', { maximumFractionDigits: 2 });

// ---------- 計算與顯示 ----------

function showErrors(list) {
  el.errorBox.innerHTML = list.map((e) => `<div>⚠ ${e}</div>`).join('');
  el.errorBox.hidden = list.length === 0;
}

function runCalculation() {
  const inputs = collectInputs();
  const errors = validate(inputs);
  if (errors.length) {
    showErrors(errors);
    el.results.hidden = true;
    lastResult = null;
    return;
  }

  const r = calculate(inputs, getRates());
  if (r.error) {
    showErrors([r.error]);
    el.results.hidden = true;
    lastResult = null;
    return;
  }

  showErrors([]);
  const dirLabel = inputs.direction === 'long' ? '做多' : '做空';
  $('r-lots').textContent = `${r.lots} 張`;
  $('r-capital').textContent = fmtMoney(r.capitalRequired);
  $('r-risk').textContent = fmtMoney(r.actualRisk);
  $('r-risk-diff').textContent = `較設定風險金額少 ${fmtMoney(r.riskDiff)}`;
  $('r-target').textContent = fmtPrice(r.target);
  $('r-loss').textContent = '-' + fmtMoney(r.expectedLoss);
  $('r-profit').textContent = '+' + fmtMoney(r.expectedProfit);
  $('r-meta').textContent =
    `${dirLabel}｜止損距離 ${fmtPrice(r.stopDistance)} 元｜單張總風險 ${fmtMoney(r.totalRiskPerLot)}｜單邊手續費率 ${(r.feeRate * 100).toFixed(4)}%｜止盈價已含費用反推，淨盈虧比 = 1:${inputs.rr}`;
  $('r-warnings').innerHTML = (r.warnings || []).map((w) => `<div>⚠ ${w}</div>`).join('');
  el.results.hidden = false;

  lastResult = { inputs, result: r };
  persist();
}

// ---------- 歷史紀錄 ----------

function renderHistory() {
  const rows = store.records.map((rec) => {
    const d = new Date(rec.ts);
    const time = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const dir = rec.inputs.direction === 'long' ? '多' : '空';
    return `<tr>
      <td>${time}</td>
      <td class="${rec.inputs.direction}">${dir}</td>
      <td>${fmtPrice(rec.inputs.entry)}</td>
      <td>${fmtPrice(rec.inputs.stop)}</td>
      <td>${fmtPrice(rec.result.target)}</td>
      <td>${rec.result.lots}</td>
      <td>${fmtMoney(rec.result.actualRisk)}</td>
      <td>${fmtMoney(rec.result.expectedProfit)}</td>
      <td><button class="del-btn" data-id="${rec.id}" title="刪除">✕</button></td>
    </tr>`;
  }).join('');
  el.historyBody.innerHTML = rows;
  el.historyEmpty.hidden = store.records.length > 0;
}

function saveRecord() {
  if (!lastResult) return;
  store.records.unshift({
    id: crypto.randomUUID(),
    ts: Date.now(),
    inputs: lastResult.inputs,
    result: {
      lots: lastResult.result.lots,
      target: lastResult.result.target,
      capitalRequired: lastResult.result.capitalRequired,
      actualRisk: lastResult.result.actualRisk,
      expectedProfit: lastResult.result.expectedProfit,
    },
  });
  store.records = store.records.slice(0, 200); // 保留最近 200 筆
  persist();
  renderHistory();
}

function exportCsv() {
  const header = '時間,方向,風險金額(千元),進場價,止損價,止盈價,張數,實際風險(元),預期浮盈(元)';
  const lines = store.records.map((r) => [
    new Date(r.ts).toLocaleString('zh-TW'),
    r.inputs.direction === 'long' ? '做多' : '做空',
    r.inputs.riskThousand,
    r.inputs.entry,
    r.inputs.stop,
    r.result.target.toFixed(2),
    r.result.lots,
    Math.round(r.result.actualRisk),
    Math.round(r.result.expectedProfit),
  ].join(','));
  const blob = new Blob(['﻿' + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `risksize-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- 登入 / 雲端同步 ----------

function renderAuth() {
  if (!cloudEnabled) {
    el.authArea.innerHTML = '<span class="guest-badge" title="尚未設定 Firebase，資料僅存於此瀏覽器（見 README）">訪客模式</span>';
    return;
  }
  if (currentUser) {
    const name = currentUser.displayName || currentUser.email || '已登入';
    el.authArea.innerHTML = `
      <span class="user-name" title="${currentUser.email || ''}">${name}</span>
      <button id="logout-btn" class="ghost-btn">登出</button>`;
    $('logout-btn').addEventListener('click', () => signOutUser());
  } else {
    el.authArea.innerHTML = '<button id="login-btn" class="ghost-btn">使用 Google 登入</button>';
    $('login-btn').addEventListener('click', () => signIn().catch((e) => alert('登入失敗：' + e.message)));
  }
}

async function onUserChange(user) {
  currentUser = user;
  renderAuth();
  if (!user) return;

  try {
    const cloud = await loadUserData(user.uid);
    if (cloud) {
      // 合併：雲端 + 本機紀錄依 id 去重，時間新的在前；設定以較新者為準
      const byId = new Map();
      [...(cloud.records || []), ...store.records].forEach((r) => byId.set(r.id, r));
      store.records = [...byId.values()].sort((a, b) => b.ts - a.ts).slice(0, 200);
      if (cloud.settings) {
        store.settings = cloud.settings;
        applySettings(store.settings);
      }
      if (cloud.lastInputs && !el.entry.value) applyInputs(cloud.lastInputs);
    }
    saveLocal();
    renderHistory();
    await saveUserData(user.uid, {
      settings: store.settings,
      lastInputs: store.lastInputs,
      records: store.records,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error('雲端同步失敗', e);
  }
}

// ---------- 初始化 ----------

function init() {
  applySettings(store.settings || {});
  // 預設盈虧比 / 折數套用到輸入欄
  el.rr.value = store.lastInputs?.rr ?? store.settings?.defaultRr ?? DEFAULT_INPUTS.rr;
  el.feeDiscount.value = store.lastInputs?.feeDiscount ?? store.settings?.defaultDiscount ?? DEFAULT_INPUTS.feeDiscount;
  applyInputs(store.lastInputs);
  renderHistory();
  renderAuth();

  el.dirButtons.forEach((b) => b.addEventListener('click', () => {
    setDirection(b.dataset.dir);
    if (el.entry.value && el.stop.value) runCalculation();
  }));

  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    runCalculation();
  });

  el.risk.addEventListener('input', () => {
    const v = parseFloat(el.risk.value);
    el.riskHint.textContent = v > 0 ? `= ${fmtMoney(v * 1000)}` : '';
  });
  if (el.risk.value) el.risk.dispatchEvent(new Event('input'));

  [el.setBaseFee, el.setTax, el.setDefaultRr, el.setDefaultDiscount].forEach((input) =>
    input.addEventListener('change', () => persist()));

  el.saveRecordBtn.addEventListener('click', saveRecord);
  el.clearHistory.addEventListener('click', () => {
    if (!store.records.length || !confirm('確定要清空所有歷史紀錄嗎？')) return;
    store.records = [];
    persist();
    renderHistory();
  });
  el.exportCsv.addEventListener('click', exportCsv);
  el.historyBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.del-btn');
    if (!btn) return;
    store.records = store.records.filter((r) => r.id !== btn.dataset.id);
    persist();
    renderHistory();
  });

  initCloud(onUserChange).catch((e) => console.error('Firebase 初始化失敗', e));
}

init();

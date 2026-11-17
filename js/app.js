(function () {
  'use strict';
  const D = window.NM_DATA;
  const STORAGE_KEY = 'newmap-talisman-v1';
  const DIFF = Object.fromEntries(D.DIFFICULTIES.map((d) => [d.id, d]));
  const RING = Object.fromEntries(D.RINGS.map((r) => [r.id, r]));
  const RING_COLORS = { outer: '#3fbf5f', middle: '#e5484d', inner: '#9b5de5', portal: '#c2185b' };
  const PALETTE = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#f783ac', '#ffa94d', '#22b8cf', '#b197fc', '#ced4da', '#a9e34b'];

  const $ = (sel, root = document) => root.querySelector(sel);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const initials = (name) => (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const icon = (theme) => D.THEME_ICONS[theme] || '🎮';
  const timeStr = (ts) => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  // ---------- state ----------
  function defaultCells() {
    const cells = [];
    for (const ring of D.RINGS) {
      D.CELLS[ring.id].forEach(([theme, difficulty], idx) => {
        cells.push({ id: `${ring.id}-${idx}`, ring: ring.id, idx, theme, difficulty });
      });
    }
    return cells;
  }

  function defaultState() {
    const players = D.PLAYERS.map((p) => ({ id: uid(), name: p.name, color: p.color, points: 0, coins: 0 }));
    return {
      version: 1,
      players,
      activePlayerId: players[0].id,
      cells: defaultCells(),
      games: D.GAMES.map((g) => ({ id: uid(), ...g })),
      rewards: clone(D.REWARDS),
      hours: Object.fromEntries(D.DIFFICULTIES.map((d) => [d.id, d.hours])),
      rules: clone(D.RULES),
      attempts: [],
      log: [],
    };
  }

  const HEX = /^#[0-9a-f]{6}$/i;
  const color = (c, fb = '#888888') => (HEX.test(c) ? c : fb);
  const num = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
  const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
  // Детерминированный id без символов, опасных для HTML-атрибутов (одинаковые входы → одинаковые id)
  const safeId = (v) => {
    const raw = String(v ?? '');
    if (!raw) return uid();
    const clean = raw.replace(/[^\p{L}\p{N}_-]/gu, '');
    if (clean === raw && clean) return clean;
    let h = 0;
    for (const ch of raw) h = (Math.imul(h, 31) + ch.codePointAt(0)) | 0;
    return `${clean || 'id'}-${(h >>> 0).toString(36)}`;
  };

  // Приводит сохранённое/импортированное состояние к ожидаемой форме (бросает ошибку, если оно непригодно)
  function normalize(s) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.players) || !Array.isArray(s.cells)) throw new Error('bad state');
    const def = defaultState();
    const players = s.players.filter((p) => p && typeof p === 'object').map((p, i) => ({
      id: safeId(p.id), name: str(p.name, `Игрок ${i + 1}`), color: color(p.color, PALETTE[i % PALETTE.length]),
      points: num(p.points), coins: num(p.coins),
    }));
    const cells = s.cells.filter((c) => c && RING[c.ring]).map((c) => ({
      id: safeId(c.id), ring: c.ring, idx: Math.max(0, Math.floor(num(c.idx))), theme: str(c.theme, 'Любая'), difficulty: DIFF[c.difficulty] ? c.difficulty : 'green',
    }));
    if (!cells.length) throw new Error('no cells');
    const games = (Array.isArray(s.games) ? s.games : def.games).filter((g) => g && DIFF[g.difficulty]).map((g) => ({
      id: safeId(g.id), title: str(g.title, '?'), theme: str(g.theme, 'Любая'), difficulty: g.difficulty,
    }));
    const attempts = (Array.isArray(s.attempts) ? s.attempts : []).filter((a) => a && ['active', 'done', 'dropped'].includes(a.status)).map((a) => ({
      ...a, id: safeId(a.id), playerId: safeId(a.playerId), cellId: safeId(a.cellId), gameId: safeId(a.gameId), gameTitle: str(a.gameTitle, '?'),
      ts: num(a.ts, Date.now()), endTs: a.endTs == null ? undefined : num(a.endTs),
      reward: a.reward ? { points: num(a.reward.points), coins: num(a.reward.coins) } : undefined,
    }));
    const playerIds = new Set(players.map((p) => p.id)), cellIds = new Set(cells.map((c) => c.id));
    const validAttempts = attempts.filter((a) => playerIds.has(a.playerId) && cellIds.has(a.cellId));
    const log = (Array.isArray(s.log) ? s.log : []).filter((l) => l && typeof l === 'object').map((l) => ({ ts: num(l.ts, Date.now()), text: str(l.text), color: color(l.color) }));
    const rewards = {}, hours = {};
    for (const d of D.DIFFICULTIES) {
      const r = (s.rewards && s.rewards[d.id]) || def.rewards[d.id];
      rewards[d.id] = { points: Math.max(0, num(r.points, def.rewards[d.id].points)), coins: Math.max(0, num(r.coins, def.rewards[d.id].coins)) };
      hours[d.id] = str(s.hours && s.hours[d.id], def.hours[d.id]);
    }
    const rules = { ...def.rules };
    for (const k of Object.keys(rules)) {
      const v = s.rules ? s.rules[k] : undefined;
      if (v === undefined) continue;
      rules[k] = typeof rules[k] === 'boolean' ? !!v : typeof rules[k] === 'number' ? Math.max(k === 'portalMultiplier' ? 1 : 0, num(v, rules[k])) : str(v, rules[k]);
    }
    const activePlayerId = players.some((p) => p.id === safeId(s.activePlayerId)) ? safeId(s.activePlayerId) : players[0]?.id || null;
    return { version: 1, players, activePlayerId, cells, games, rewards, hours, rules, attempts: validAttempts, log };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : defaultState();
    } catch (e) {
      return defaultState();
    }
  }

  let state = load();
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  const player = (id) => state.players.find((p) => p.id === id);
  const cellById = (id) => state.cells.find((c) => c.id === id);
  const activePlayer = () => player(state.activePlayerId) || state.players[0];
  const isMulti = (cell) => cell.ring === 'portal';

  function liveAttempts(cellId) {
    return state.attempts.filter((a) => a.cellId === cellId && a.status !== 'dropped');
  }
  function activeAttemptOf(playerId) {
    return state.attempts.find((a) => a.playerId === playerId && a.status === 'active');
  }
  function doneCount(playerId, ring) {
    return state.attempts.filter((a) => a.playerId === playerId && a.status === 'done' && (!ring || cellById(a.cellId)?.ring === ring)).length;
  }
  function lastPosition(playerId) {
    const list = state.attempts.filter((a) => a.playerId === playerId && a.status !== 'dropped');
    return list.length ? list[list.length - 1].cellId : null;
  }

  // Сколько ещё нужно пройти, чтобы войти в кольцо (0 — открыто)
  function lockInfo(playerId, ring) {
    const r = state.rules;
    if (!r.lockRings || ring === 'outer') return null;
    const need = { middle: ['outer', r.unlockMiddle], inner: ['middle', r.unlockInner], portal: ['inner', r.unlockPortal] }[ring];
    const left = need[1] - doneCount(playerId, need[0]);
    return left > 0 ? { prevRing: need[0], left } : null;
  }

  function reward(cell) {
    const base = state.rewards[cell.difficulty] || { points: 0, coins: 0 };
    const m = cell.ring === 'portal' ? Number(state.rules.portalMultiplier) || 1 : 1;
    return { points: Math.round(base.points * m), coins: Math.round(base.coins * m) };
  }

  // Почему игрок не может выбрать поле (null — может)
  function blockReason(p, cell) {
    if (!p) return 'Нет участников';
    const live = liveAttempts(cell.id);
    if (isMulti(cell)) {
      if (live.some((a) => a.playerId === p.id)) return 'Игрок уже прошёл / проходит портал';
    } else if (live.length) {
      return 'Поле уже занято';
    }
    const act = activeAttemptOf(p.id);
    if (act) return `У игрока уже есть активная игра: «${act.gameTitle}». Сначала завершите её.`;
    const lock = lockInfo(p.id, cell.ring);
    if (lock) return `Регион закрыт: нужно пройти ещё ${lock.left} пол${plural(lock.left, 'е', 'я', 'ей')} в регионе «${RING[lock.prevRing].name}».`;
    return null;
  }
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function candidates(cell, excludeIds = []) {
    const used = new Set(state.attempts.filter((a) => a.status !== 'dropped').map((a) => a.gameId));
    const ex = new Set(excludeIds);
    const byDiff = state.games.filter((g) => g.difficulty === cell.difficulty && !ex.has(g.id));
    const themed = cell.theme === 'Любая' ? byDiff : byDiff.filter((g) => g.theme === cell.theme);
    let list = themed.filter((g) => !used.has(g.id));
    if (list.length) return { list, mode: 'theme' };
    list = byDiff.filter((g) => !used.has(g.id));
    if (list.length) return { list, mode: 'difficulty' };
    if (themed.length) return { list: themed, mode: 'repeat' };
    return { list: [], mode: 'empty' };
  }

  function addLog(text, color) {
    state.log.unshift({ ts: Date.now(), text, color });
    state.log = state.log.slice(0, 200);
  }

  // ---------- visual effects ----------
  let fx = null;
  let bannerTimer = null;
  function flash(cellId, color, kind) {
    fx = { cellId, color, kind };
    clearTimeout(flash.t);
    flash.t = setTimeout(() => { fx = null; renderBoard(); }, 1800);
  }
  function banner(html, color) {
    const el = $('#banner');
    el.innerHTML = html;
    el.style.setProperty('--pc', color || '#d4a84b');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 4500);
  }

  // ---------- actions ----------
  function startAttempt(p, cell, game) {
    const a = { id: uid(), playerId: p.id, cellId: cell.id, gameId: game.id, gameTitle: game.title, status: 'active', ts: Date.now() };
    state.attempts.push(a);
    addLog(`${p.name} выбрал(а) «${cell.theme}» (${DIFF[cell.difficulty].name.toLowerCase()}) → ${game.title}`, p.color);
    flash(cell.id, p.color, 'pick');
    banner(`<b>${esc(p.name)}</b> выбирает поле <b>${icon(cell.theme)} ${esc(cell.theme)}</b><br><span class="banner-game">${esc(game.title)}</span>`, p.color);
    save();
    renderAll();
  }

  function completeAttempt(a) {
    const p = player(a.playerId), cell = cellById(a.cellId), r = reward(cell);
    a.status = 'done';
    a.endTs = Date.now();
    a.reward = r;
    p.points += r.points;
    p.coins += r.coins;
    addLog(`${p.name} прошёл(ла) ${a.gameTitle}: +${r.points} очк., +${r.coins} ${state.rules.currencyName.toLowerCase()}`, p.color);
    flash(cell.id, p.color, 'done');
    banner(`<b>${esc(p.name)}</b> прошёл(ла) <b>${esc(a.gameTitle)}</b><br><span class="banner-game">+${r.points} очков · +${r.coins} ${esc(state.rules.currencyName)}</span>`, p.color);
    save();
    renderAll();
  }

  function dropAttempt(a) {
    const p = player(a.playerId), cell = cellById(a.cellId);
    const pen = Number(state.rules.dropPenalty) || 0;
    a.status = 'dropped';
    a.endTs = Date.now();
    p.points -= pen;
    addLog(`${p.name} дропнул(а) ${a.gameTitle}${pen ? ` (−${pen} очк.)` : ''}`, p.color);
    flash(cell.id, '#888888', 'drop');
    banner(`<b>${esc(p.name)}</b> дропает <b>${esc(a.gameTitle)}</b>${pen ? `<br><span class="banner-game">−${pen} очков</span>` : ''}`, p.color);
    save();
    renderAll();
  }

  function undoAttempt(a) {
    const p = player(a.playerId);
    if (a.status === 'done' && a.reward && p) {
      p.points -= a.reward.points;
      p.coins -= a.reward.coins;
    }
    state.attempts = state.attempts.filter((x) => x !== a);
    addLog(`Отменено: ${p ? p.name : '?'} — ${a.gameTitle}`, '#888888');
    save();
    renderAll();
  }

  // ---------- render: board ----------
  function ringInsets() {
    const P = 1.2, G = 0.8;
    const out = { outer: 0 };
    let inset = 0;
    for (const [id, n, next] of [['outer', 7, 'middle'], ['middle', 5, 'inner']]) {
      const size = 100 - 2 * inset;
      const cell = (size - 2 * P) / n;
      inset = inset + P + cell + G;
      out[next] = inset;
    }
    return out;
  }

  function perimeterPos(n, idx) {
    // по часовой стрелке от левого верхнего угла; возвращает [row, col] (1-based)
    if (n === 1) return [1, 1];
    const side = n - 1;
    if (idx < side) return [1, idx + 1];
    if (idx < 2 * side) return [idx - side + 1, n];
    if (idx < 3 * side) return [n, n - (idx - 2 * side)];
    return [n - (idx - 3 * side), 1];
  }

  function cellHtml(cell, ap) {
    const live = liveAttempts(cell.id);
    const done = live.filter((a) => a.status === 'done');
    const active = live.filter((a) => a.status === 'active');
    const lock = ap ? lockInfo(ap.id, cell.ring) : null;
    const available = ap && !blockReason(ap, cell);
    const r = reward(cell);
    const classes = ['cell', `d-${cell.difficulty}`, `r-${cell.ring}`];
    let style = '';
    const tokens = state.players.filter((p) => lastPosition(p.id) === cell.id);
    if (lock && !live.length) classes.push('locked');
    if (available) classes.push('available');
    if (active.length) {
      classes.push('is-active');
      style += `--pc:${player(active[0].playerId)?.color};`;
    }
    if (done.length) {
      classes.push('is-done');
      const colors = done.map((a) => player(a.playerId)?.color || '#888');
      if (!active.length) style += `--pc:${colors[0]};`;
      style += `--owner:${colors[0]};`;
      if (colors.length > 1) style += `--owner-bg:linear-gradient(135deg,${colors.map((c) => c + '55').join(',')});`;
    }
    if (ap && available) style += `--hover:${ap.color};`;
    if (fx && fx.cellId === cell.id) { classes.push(`fx-${fx.kind}`); style += `--fx:${fx.color};`; }
    const owners = live.map((a) => a.playerId).join(' ');

    let status = '';
    if (done.length && !isMulti(cell)) {
      const p = player(done[0].playerId);
      status = `<span class="cell-status done-tag" style="--c:${p?.color}">✓ ${esc(initials(p?.name))}</span><span class="cell-game">${esc(done[0].gameTitle)}</span>`;
    } else if (active.length && !isMulti(cell)) {
      status = `<span class="cell-status live-tag">▶ в процессе</span><span class="cell-game">${esc(active[0].gameTitle)}</span>`;
    }

    if (isMulti(cell)) {
      return `<button class="${classes.join(' ')} portal" data-cell="${cell.id}" data-owners="${owners}" style="${style}">
        <span class="portal-swirl"></span>
        <span class="portal-inner">
          <span class="cell-icon">🌀</span>
          <span class="cell-theme">ПОРТАЛ</span>
          <span class="cell-reward">+${r.points} · ${r.coins}🪙</span>
          ${lock && ap ? '<span class="lock">🔒</span>' : ''}
        </span>
        <span class="tokens">${[...new Set([...tokens.map((p) => p.id), ...done.map((a) => a.playerId)])].map((id) => tokenHtml(player(id), done.some((a) => a.playerId === id))).join('')}</span>
      </button>`;
    }

    return `<button class="${classes.join(' ')}" data-cell="${cell.id}" data-owners="${owners}" style="grid-row:${perimeterPos(RING[cell.ring].size, cell.idx)[0]};grid-column:${perimeterPos(RING[cell.ring].size, cell.idx)[1]};${style}">
      <span class="diff-bar"></span>
      <span class="cell-icon">${icon(cell.theme)}</span>
      <span class="cell-theme">${esc(cell.theme)}</span>
      ${status || `<span class="cell-reward">+${r.points} · ${r.coins}🪙</span>`}
      ${lock && !live.length ? '<span class="lock">🔒</span>' : ''}
      <span class="tokens">${tokens.map((p) => tokenHtml(p)).join('')}</span>
    </button>`;
  }

  function tokenHtml(p, done) {
    if (!p) return '';
    return `<span class="token ${done ? 'token-done' : ''}" style="--c:${p.color}" title="${esc(p.name)}">${esc(initials(p.name))}</span>`;
  }

  function renderBoard() {
    const ap = activePlayer();
    const ins = ringInsets();
    const ringHtml = (ringId) => {
      const n = RING[ringId].size;
      const cells = state.cells.filter((c) => c.ring === ringId);
      const portal = ringId === 'inner' ? state.cells.find((c) => c.ring === 'portal') : null;
      return `<div class="ring ring-${ringId}" style="inset:${ins[ringId]}%;--n:${n};--rc:${RING_COLORS[ringId]}">
        ${cells.map((c) => cellHtml(c, ap)).join('')}
        ${portal ? `<div class="portal-slot" style="grid-row:2;grid-column:2">${cellHtml(portal, ap)}</div>` : ''}
      </div>`;
    };
    const board = $('#board');
    board.innerHTML = ringHtml('outer') + ringHtml('middle') + ringHtml('inner');
    board.style.setProperty('--ap', ap ? ap.color : '#d4a84b');
    applyFocus();
  }

  // ---------- render: panels ----------
  function renderChips() {
    $('#player-chips').innerHTML = state.players.map((p) => `
      <button class="chip ${p.id === state.activePlayerId ? 'chip-on' : ''}" data-player="${p.id}" style="--c:${p.color}">
        <span class="chip-dot">${esc(initials(p.name))}</span>${esc(p.name)}
      </button>`).join('') || '<span class="muted">добавьте участников</span>';
  }

  function renderPlayers() {
    const cur = state.rules.currencyName;
    const sorted = [...state.players].sort((a, b) => b.points - a.points);
    $('#players').innerHTML = sorted.map((p, i) => {
      const act = activeAttemptOf(p.id);
      const done = doneCount(p.id);
      return `<div class="player ${p.id === state.activePlayerId ? 'player-on' : ''}" data-player="${p.id}" style="--c:${p.color}">
        <div class="player-head">
          <span class="place">${i + 1}</span>
          <label class="player-color" title="Цвет"><input type="color" value="${p.color}" data-color="${p.id}"><span class="token" style="--c:${p.color}">${esc(initials(p.name))}</span></label>
          <span class="player-name" data-rename="${p.id}" title="Нажмите, чтобы переименовать">${esc(p.name)}</span>
          <button class="icon-btn" data-remove="${p.id}" title="Удалить участника">✕</button>
        </div>
        <div class="player-stats">
          <span class="stat"><b>${p.points}</b> очк.</span>
          <span class="stat coins">
            <button class="icon-btn sm" data-coins="${p.id}" data-delta="-1" title="−1">−</button>
            <b>${p.coins}</b> 🪙
            <button class="icon-btn sm" data-coins="${p.id}" data-delta="1" title="+1">+</button>
          </span>
          <span class="stat">полей: <b>${done}</b></span>
        </div>
        <div class="player-progress">
          ${['outer', 'middle', 'inner', 'portal'].map((r) => `<span class="pp pp-${r} ${lockInfo(p.id, r) ? 'pp-locked' : ''}" title="${RING[r].name}: пройдено ${doneCount(p.id, r)}">${doneCount(p.id, r)}</span>`).join('')}
        </div>
        ${act ? `<div class="player-now" data-open="${act.cellId}">▶ ${esc(act.gameTitle)}</div>` : ''}
      </div>`;
    }).join('');
    document.querySelectorAll('.coin-name').forEach((el) => (el.textContent = cur));
  }

  function renderLegend() {
    $('#legend').innerHTML = D.DIFFICULTIES.map((d) => {
      const r = state.rewards[d.id];
      return `<div class="legend-row"><span class="sw" style="background:${d.color}"></span><span class="legend-name">${d.name}</span><span class="muted">${esc(state.hours[d.id])}</span><span class="legend-rw">+${r.points} · ${r.coins}🪙</span></div>`;
    }).join('') + `<div class="muted small">🪙 — ${esc(state.rules.currencyName)}. Переролл игры: ${state.rules.rerollCost} 🪙</div>`;
    const r = state.rules;
    const rows = [
      ['outer', 'зелёные и жёлтые, открыт сразу'],
      ['middle', r.lockRings ? `жёлтые и красные, нужно ${r.unlockMiddle} во внешнем` : 'жёлтые и красные'],
      ['inner', r.lockRings ? `фиолетовые и бордовые, нужно ${r.unlockInner} в среднем` : 'фиолетовые и бордовые'],
      ['portal', `бордовая, награда ×${r.portalMultiplier}${r.lockRings ? `, нужно ${r.unlockPortal} во внутреннем` : ''}`],
    ];
    $('#rings-legend').innerHTML = rows.map(([id, t]) => `<div class="legend-row"><span class="sw ring-sw" style="--rc:${RING_COLORS[id]}"></span><span class="legend-name">${RING[id].name}</span><span class="muted small">${t}</span></div>`).join('');
  }

  function renderLog() {
    $('#log').innerHTML = state.log.length
      ? state.log.map((l) => `<div class="log-row" style="--c:${l.color || '#888'}"><span class="log-time">${timeStr(l.ts)}</span><span>${esc(l.text)}</span></div>`).join('')
      : '<div class="muted small">Пока пусто. Выберите участника сверху и нажмите на поле.</div>';
  }

  function renderAll() {
    renderChips();
    renderPlayers();
    renderBoard();
    renderLegend();
    renderLog();
    if (openCellId) renderCellModal(openCellId);
  }

  // ---------- focus (hover over a player) ----------
  let focusId = null;
  function applyFocus() {
    const board = $('#board');
    board.classList.toggle('focus', !!focusId);
    board.querySelectorAll('.cell').forEach((el) => {
      el.classList.toggle('focused', !!focusId && (el.dataset.owners || '').split(' ').includes(focusId));
    });
  }

  // ---------- modal ----------
  let openCellId = null;
  let rolling = false;

  function openModal(html) {
    $('#modal-body').innerHTML = html;
    $('#modal').classList.remove('hidden');
  }
  function closeModal() {
    if (rolling) return;
    $('#modal').classList.add('hidden');
    openCellId = null;
    settingsOpen = false;
  }

  function renderCellModal(cellId) {
    const cell = cellById(cellId);
    if (!cell) return;
    openCellId = cellId;
    const ap = activePlayer();
    const r = reward(cell);
    const d = DIFF[cell.difficulty];
    const live = liveAttempts(cell.id);
    const reason = blockReason(ap, cell);
    const cand = candidates(cell);
    const used = new Set(state.attempts.filter((a) => a.status !== 'dropped').map((a) => a.gameId));
    const poolAll = state.games.filter((g) => g.difficulty === cell.difficulty && (cell.theme === 'Любая' || g.theme === cell.theme));
    const history = state.attempts.filter((a) => a.cellId === cell.id && a.status === 'dropped');
    const cur = state.rules.currencyName;

    const attemptsHtml = live.map((a) => {
      const p = player(a.playerId);
      if (a.status === 'active') {
        const canReroll = p.coins >= state.rules.rerollCost;
        return `<div class="attempt" style="--c:${p.color}">
          <div class="attempt-who">${tokenHtml(p)} <b>${esc(p.name)}</b> <span class="muted">проходит с ${timeStr(a.ts)}</span></div>
          <div class="attempt-game">${esc(a.gameTitle)}</div>
          <div class="btn-row">
            <button class="btn btn-ok" data-act="done" data-id="${a.id}">✓ Пройдено (+${r.points} · ${r.coins}🪙)</button>
            <button class="btn btn-bad" data-act="drop" data-id="${a.id}">✕ Дроп${state.rules.dropPenalty ? ` (−${state.rules.dropPenalty})` : ''}</button>
            <button class="btn" data-act="reroll" data-id="${a.id}" ${canReroll ? '' : 'disabled'} title="${canReroll ? '' : 'Недостаточно валюты'}">↻ Переролл (−${state.rules.rerollCost} 🪙)</button>
            <button class="btn btn-ghost" data-act="undo" data-id="${a.id}" title="Отменить выбор без штрафа">Отменить</button>
          </div>
        </div>`;
      }
      return `<div class="attempt attempt-done" style="--c:${p?.color}">
        <div class="attempt-who">${tokenHtml(p)} <b>${esc(p?.name)}</b> <span class="muted">прошёл(ла) в ${timeStr(a.endTs)}</span></div>
        <div class="attempt-game">✓ ${esc(a.gameTitle)}</div>
        <div class="btn-row"><button class="btn btn-ghost" data-act="undo" data-id="${a.id}">Отменить прохождение</button></div>
      </div>`;
    }).join('');

    const modeNote = { theme: '', difficulty: 'Игры этой тематики закончились — будет выбрана игра той же сложности из любой тематики.', repeat: 'Все игры уже разыграны — возможны повторы.', empty: 'В пуле нет игр этой сложности. Добавьте их в Настройках → Пул игр.' }[cand.mode];

    let chooseHtml = '';
    if (ap && !reason) {
      chooseHtml = `<div class="choose">
        <div id="roll" class="roll" style="--c:${ap.color}"><span class="muted">Игра будет выбрана случайно из пула (${cand.list.length})</span></div>
        ${modeNote ? `<div class="note">${modeNote}</div>` : ''}
        <button class="btn btn-big" id="btn-choose" style="--c:${ap.color}" ${cand.list.length ? '' : 'disabled'}>Выбрать поле за ${esc(ap.name)}</button>
      </div>`;
    } else if (ap && reason && !(live.length && !isMulti(cell))) {
      chooseHtml = `<div class="note">${esc(reason)}</div>`;
    }

    const themes = [...new Set([...Object.keys(D.THEME_ICONS), ...state.games.map((g) => g.theme)])];
    openModal(`
      <div class="cm-head" style="--dc:${d.color}">
        <span class="cm-icon">${isMulti(cell) ? '🌀' : icon(cell.theme)}</span>
        <div>
          <div class="cm-title">${isMulti(cell) ? 'Портал' : esc(cell.theme)}</div>
          <div class="cm-sub">${RING[cell.ring].name} · <span class="badge" style="--dc:${d.color}">${d.name}</span> · ${esc(state.hours[cell.difficulty])}</div>
        </div>
        <div class="cm-reward"><div><b>+${r.points}</b> очков</div><div><b>+${r.coins}</b> ${esc(cur)}</div></div>
      </div>
      ${attemptsHtml}
      ${chooseHtml}
      <details class="pool">
        <summary>Пул игр поля (${poolAll.length})</summary>
        <div class="pool-list">${poolAll.map((g) => `<span class="pool-item ${used.has(g.id) ? 'used' : ''}">${esc(g.title)}</span>`).join('') || '<span class="muted">пусто</span>'}</div>
      </details>
      ${history.length ? `<details class="pool"><summary>Дропы на этом поле (${history.length})</summary><div class="pool-list">${history.map((a) => `<span class="pool-item">${esc(player(a.playerId)?.name)}: ${esc(a.gameTitle)}</span>`).join('')}</div></details>` : ''}
      ${!live.length && !isMulti(cell) ? `<details class="pool">
        <summary>Изменить поле</summary>
        <div class="edit-row">
          <label>Тематика <input list="themes-list" id="edit-theme" value="${esc(cell.theme)}"></label>
          <label>Сложность <select id="edit-diff">${D.DIFFICULTIES.map((x) => `<option value="${x.id}" ${x.id === cell.difficulty ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
          <button class="btn" id="btn-edit-cell">Сохранить</button>
        </div>
        <datalist id="themes-list">${themes.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
      </details>` : ''}
    `);
  }

  function roll(list, el, color, done) {
    rolling = true;
    const final = list[Math.floor(Math.random() * list.length)];
    const steps = Math.min(22, 10 + list.length);
    let i = 0;
    el.classList.add('rolling');
    const tick = () => {
      const g = i < steps - 1 ? list[Math.floor(Math.random() * list.length)] : final;
      el.innerHTML = `<span class="roll-title">${esc(g.title)}</span>`;
      i++;
      if (i < steps) setTimeout(tick, 50 + i * i * 0.6);
      else {
        el.classList.remove('rolling');
        el.classList.add('rolled');
        setTimeout(() => { rolling = false; done(final); }, 650);
      }
    };
    tick();
  }

  function onModalClick(e) {
    const t = e.target.closest('button, [data-close]');
    if (!t) return;
    if (t.hasAttribute('data-close')) return closeModal();
    if (rolling) return;
    if (t.id === 'btn-choose') {
      const cell = cellById(openCellId), ap = activePlayer();
      if (blockReason(ap, cell)) return;
      const { list } = candidates(cell);
      if (!list.length) return;
      t.disabled = true;
      roll(list, $('#roll'), ap.color, (game) => startAttempt(ap, cell, game));
      return;
    }
    if (t.id === 'btn-edit-cell') {
      const cell = cellById(openCellId);
      cell.theme = $('#edit-theme').value.trim() || cell.theme;
      cell.difficulty = $('#edit-diff').value;
      save();
      renderAll();
      return;
    }
    const act = t.dataset.act;
    if (!act) return;
    const a = state.attempts.find((x) => x.id === t.dataset.id);
    if (!a) return;
    if (act === 'done') completeAttempt(a);
    if (act === 'drop' && confirm(`Дропнуть «${a.gameTitle}»?`)) dropAttempt(a);
    if (act === 'undo' && confirm('Отменить это действие?')) undoAttempt(a);
    if (act === 'reroll') {
      const p = player(a.playerId), cell = cellById(a.cellId);
      if (p.coins < state.rules.rerollCost) return;
      const { list } = candidates(cell, [a.gameId]);
      if (!list.length) return alert('Нет других игр для переролла.');
      const box = t.closest('.attempt').querySelector('.attempt-game');
      t.closest('.btn-row').querySelectorAll('button').forEach((b) => (b.disabled = true));
      roll(list, box, p.color, (game) => {
        p.coins -= state.rules.rerollCost;
        const old = a.gameTitle;
        a.gameId = game.id;
        a.gameTitle = game.title;
        addLog(`${p.name} перероллил(а) ${old} → ${game.title} (−${state.rules.rerollCost} 🪙)`, p.color);
        flash(cell.id, p.color, 'pick');
        banner(`<b>${esc(p.name)}</b> перероллит игру<br><span class="banner-game">${esc(game.title)}</span>`, p.color);
        save();
        renderAll();
      });
    }
  }

  // ---------- settings ----------
  let settingsOpen = false;
  let settingsTab = 'rewards';
  let poolFilter = { theme: '', difficulty: '', q: '' };

  function renderSettings() {
    settingsOpen = true;
    openCellId = null;
    const tabs = [['rewards', 'Награды'], ['rules', 'Правила'], ['pool', 'Пул игр'], ['data', 'Данные']];
    let body = '';
    if (settingsTab === 'rewards') {
      body = `<table class="tbl"><tr><th>Сложность</th><th>Длительность</th><th>Очки</th><th>${esc(state.rules.currencyName)}</th></tr>
        ${D.DIFFICULTIES.map((d) => `<tr>
          <td><span class="badge" style="--dc:${d.color}">${d.name}</span></td>
          <td><input data-set="hours.${d.id}" value="${esc(state.hours[d.id])}"></td>
          <td><input type="number" min="0" data-set="rewards.${d.id}.points" value="${state.rewards[d.id].points}"></td>
          <td><input type="number" min="0" data-set="rewards.${d.id}.coins" value="${state.rewards[d.id].coins}"></td>
        </tr>`).join('')}</table>
        <p class="muted small">Портал умножает награду на множитель из вкладки «Правила».</p>`;
    } else if (settingsTab === 'rules') {
      const r = state.rules;
      body = `<div class="form">
        <label class="check"><input type="checkbox" data-set="rules.lockRings" ${r.lockRings ? 'checked' : ''}> Открывать регионы постепенно</label>
        <label>Пройти во внешнем, чтобы войти в средний <input type="number" min="0" data-set="rules.unlockMiddle" value="${r.unlockMiddle}"></label>
        <label>Пройти в среднем, чтобы войти во внутренний <input type="number" min="0" data-set="rules.unlockInner" value="${r.unlockInner}"></label>
        <label>Пройти во внутреннем, чтобы войти в портал <input type="number" min="0" data-set="rules.unlockPortal" value="${r.unlockPortal}"></label>
        <label>Множитель награды портала <input type="number" min="1" step="0.5" data-set="rules.portalMultiplier" value="${r.portalMultiplier}"></label>
        <label>Цена переролла игры (валюта) <input type="number" min="0" data-set="rules.rerollCost" value="${r.rerollCost}"></label>
        <label>Штраф очков за дроп <input type="number" min="0" data-set="rules.dropPenalty" value="${r.dropPenalty}"></label>
        <label>Название бонусной валюты <input data-set="rules.currencyName" value="${esc(r.currencyName)}"></label>
      </div>`;
    } else if (settingsTab === 'pool') {
      const themes = [...new Set(state.games.map((g) => g.theme))].sort();
      const f = poolFilter;
      const list = state.games.filter((g) => (!f.theme || g.theme === f.theme) && (!f.difficulty || g.difficulty === f.difficulty) && (!f.q || g.title.toLowerCase().includes(f.q.toLowerCase())));
      body = `<div class="pool-filters">
          <input placeholder="Поиск" data-filter="q" value="${esc(f.q)}">
          <select data-filter="theme"><option value="">Все тематики</option>${themes.map((t) => `<option ${t === f.theme ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
          <select data-filter="difficulty"><option value="">Все сложности</option>${D.DIFFICULTIES.map((d) => `<option value="${d.id}" ${d.id === f.difficulty ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
          <span class="muted small">${list.length} из ${state.games.length}</span>
        </div>
        <div class="pool-table">
          ${list.map((g) => `<div class="pool-row">
            <input data-game="${g.id}" data-field="title" value="${esc(g.title)}">
            <input data-game="${g.id}" data-field="theme" value="${esc(g.theme)}" list="pool-themes">
            <select data-game="${g.id}" data-field="difficulty">${D.DIFFICULTIES.map((d) => `<option value="${d.id}" ${d.id === g.difficulty ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
            <button class="icon-btn" data-del-game="${g.id}" title="Удалить">✕</button>
          </div>`).join('')}
        </div>
        <datalist id="pool-themes">${[...new Set([...themes, ...Object.keys(D.THEME_ICONS)])].map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        <h3>Добавить игры списком</h3>
        <p class="muted small">По одной в строке: <code>Название; Тематика; сложность</code> (зелёная / жёлтая / красная / фиолетовая / бордовая).</p>
        <textarea id="bulk" rows="4" placeholder="Hollow Knight; Метроидвания; бордовая"></textarea>
        <button class="btn" id="btn-bulk">Добавить</button>`;
    } else {
      body = `<div class="form">
        <div class="btn-row">
          <button class="btn" id="btn-export">Экспорт в JSON</button>
          <label class="btn">Импорт из JSON<input type="file" id="file-import" accept="application/json" hidden></label>
        </div>
        <p class="muted small">Экспорт сохраняет всё: участников, поле, пул игр, награды и прогресс. Данные также автоматически хранятся в этом браузере.</p>
        <div class="btn-row">
          <button class="btn btn-bad" id="btn-reset-progress">Сбросить прогресс</button>
          <button class="btn btn-bad" id="btn-reset-all">Сбросить всё</button>
        </div>
        <p class="muted small">«Сбросить прогресс» обнуляет очки, валюту и прохождения, но сохраняет участников и настройки.</p>
      </div>`;
    }
    openModal(`<h2 class="settings-title">Настройки</h2>
      <div class="tabs">${tabs.map(([id, n]) => `<button class="tab ${id === settingsTab ? 'tab-on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div>
      <div class="settings-body">${body}</div>`);
  }

  function setPath(path, value) {
    const keys = path.split('.');
    let o = state;
    while (keys.length > 1) o = o[keys.shift()];
    o[keys[0]] = value;
  }

  const DIFF_ALIASES = { 'зелёная': 'green', 'зеленая': 'green', 'жёлтая': 'yellow', 'желтая': 'yellow', 'красная': 'red', 'фиолетовая': 'purple', 'бордовая': 'bordo' };

  function onSettingsChange(e) {
    const t = e.target;
    if (t.dataset.set) {
      let v = t.type === 'checkbox' ? t.checked : t.type === 'number' ? num(t.value) : t.value;
      if (t.type === 'number' && t.min !== '') v = Math.max(Number(t.min), v);
      if (t.type === 'number') t.value = v;
      setPath(t.dataset.set, v);
      save();
      renderAll();
      return;
    }
    if (t.dataset.game) {
      const g = state.games.find((x) => x.id === t.dataset.game);
      if (g) g[t.dataset.field] = t.value.trim();
      save();
      return;
    }
    if (t.dataset.filter) {
      poolFilter[t.dataset.filter] = t.value;
      renderSettings();
      if (t.dataset.filter === 'q') { const el = $('[data-filter="q"]'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      return;
    }
    if (t.id === 'file-import' && t.files[0]) {
      t.files[0].text().then((txt) => {
        try {
          const prev = state;
          try {
            state = normalize(JSON.parse(txt));
            renderAll();
            renderSettings();
          } catch (err) {
            state = prev;
            throw err;
          }
          save();
          alert('Импорт выполнен');
        } catch (err) {
          renderAll();
          alert('Не удалось прочитать файл');
        }
      });
    }
  }

  function onSettingsClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.tab) { settingsTab = t.dataset.tab; renderSettings(); return; }
    if (t.dataset.delGame) {
      state.games = state.games.filter((g) => g.id !== t.dataset.delGame);
      save(); renderSettings(); return;
    }
    if (t.id === 'btn-bulk') {
      const lines = $('#bulk').value.split('\n').map((l) => l.trim()).filter(Boolean);
      let added = 0;
      for (const l of lines) {
        const [title, theme, diff] = l.split(';').map((x) => (x || '').trim());
        const d = DIFF_ALIASES[(diff || '').toLowerCase()] || (DIFF[diff] ? diff : null);
        if (!title || !theme || !d) continue;
        state.games.push({ id: uid(), title, theme, difficulty: d });
        added++;
      }
      save(); renderSettings();
      alert(`Добавлено игр: ${added}${added < lines.length ? `, пропущено строк: ${lines.length - added}` : ''}`);
      return;
    }
    if (t.id === 'btn-export') {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `talisman-event-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      return;
    }
    if (t.id === 'btn-reset-progress' && confirm('Сбросить весь прогресс?')) {
      state.attempts = []; state.log = [];
      state.players.forEach((p) => { p.points = 0; p.coins = 0; });
      save(); renderAll(); renderSettings(); return;
    }
    if (t.id === 'btn-reset-all' && confirm('Сбросить всё к начальным настройкам?')) {
      state = defaultState(); save(); renderAll(); renderSettings();
    }
  }

  // ---------- wiring ----------
  function bind() {
    $('#board').addEventListener('click', (e) => {
      const c = e.target.closest('[data-cell]');
      if (c) renderCellModal(c.dataset.cell);
    });

    $('#player-chips').addEventListener('click', (e) => {
      const c = e.target.closest('[data-player]');
      if (!c) return;
      state.activePlayerId = c.dataset.player;
      save();
      renderAll();
    });

    const players = $('#players');
    players.addEventListener('click', (e) => {
      const t = e.target;
      const coinBtn = t.closest('[data-coins]');
      if (coinBtn) {
        const p = player(coinBtn.dataset.coins);
        p.coins += Number(coinBtn.dataset.delta);
        addLog(`${p.name}: ${Number(coinBtn.dataset.delta) > 0 ? '+' : ''}${coinBtn.dataset.delta} ${state.rules.currencyName.toLowerCase()} (вручную)`, p.color);
        save(); renderAll(); return;
      }
      const rm = t.closest('[data-remove]');
      if (rm) {
        const p = player(rm.dataset.remove);
        if (!confirm(`Удалить участника «${p.name}» и его прохождения?`)) return;
        state.players = state.players.filter((x) => x.id !== p.id);
        state.attempts = state.attempts.filter((a) => a.playerId !== p.id);
        if (state.activePlayerId === p.id) state.activePlayerId = state.players[0]?.id || null;
        save(); renderAll(); return;
      }
      const rn = t.closest('[data-rename]');
      if (rn) {
        const p = player(rn.dataset.rename);
        const name = prompt('Имя участника', p.name);
        if (name && name.trim()) { p.name = name.trim(); save(); renderAll(); }
        return;
      }
      const open = t.closest('[data-open]');
      if (open) { renderCellModal(open.dataset.open); return; }
      if (t.closest('.player-color')) return;
      const row = t.closest('[data-player]');
      if (row) { state.activePlayerId = row.dataset.player; save(); renderAll(); }
    });
    players.addEventListener('change', (e) => {
      if (e.target.dataset.color) {
        player(e.target.dataset.color).color = color(e.target.value, player(e.target.dataset.color).color);
        save(); renderAll();
      }
    });
    players.addEventListener('mouseover', (e) => {
      const row = e.target.closest('[data-player]');
      const id = row ? row.dataset.player : null;
      if (id !== focusId) { focusId = id; applyFocus(); }
    });
    players.addEventListener('mouseleave', () => { focusId = null; applyFocus(); });

    $('#btn-add-player').addEventListener('click', () => {
      const name = prompt('Имя участника', `Игрок ${state.players.length + 1}`);
      if (!name || !name.trim()) return;
      const used = new Set(state.players.map((p) => p.color));
      const color = PALETTE.find((c) => !used.has(c)) || PALETTE[state.players.length % PALETTE.length];
      const p = { id: uid(), name: name.trim(), color, points: 0, coins: 0 };
      state.players.push(p);
      if (!state.activePlayerId) state.activePlayerId = p.id;
      addLog(`Новый участник: ${p.name}`, p.color);
      save(); renderAll();
    });

    $('#btn-settings').addEventListener('click', renderSettings);
    $('#btn-stream').addEventListener('click', () => document.body.classList.toggle('stream'));

    const modal = $('#modal');
    modal.addEventListener('click', (e) => (settingsOpen ? (e.target.closest('[data-close]') ? closeModal() : onSettingsClick(e)) : onModalClick(e)));
    modal.addEventListener('change', (e) => settingsOpen && onSettingsChange(e));
    modal.addEventListener('input', (e) => settingsOpen && e.target.dataset.filter === 'q' && onSettingsChange(e));

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('#modal').classList.contains('hidden')) closeModal();
      else document.body.classList.remove('stream');
    });

    const board = $('#board');
    const ro = new ResizeObserver(() => board.style.setProperty('--u', board.clientWidth / 100 + 'px'));
    ro.observe(board);
  }

  bind();
  renderAll();
})();

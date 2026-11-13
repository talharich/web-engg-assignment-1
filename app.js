'use strict';

const ROOMS = { 'Auditorium': 120, 'Room B204': 30, 'Lab C12': 16 }; 
const TRACKS = ['AI', 'Web', 'Security', 'Careers'];
const DAY_NAME = { 1: ['Day 1', 'Thursday 12 November'], 2: ['Day 2', 'Friday 13 November'] };
// 15-minute slots from 08:00 to 18:00, stored as "HH:MM" so they compare as strings
const TIMES = Array.from({ length: 41 }, (_, i) => { const m = 480 + i * 15; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; });
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const dur = (a, b) => { const d = mins(b) - mins(a), h = Math.floor(d / 60), m = d % 60; return (h ? h + 'h' : '') + (h && m ? ' ' : '') + (m ? m + 'm' : ''); };

const crowd = (n, tag) => Array.from({ length: n }, (_, i) => ({ name: `Guest ${i + 1}`, email: `${tag}${i + 1}@campus.edu` }));

let nextId = 9;
let sessions = [
  { id: 1, title: 'Keynote: Building the Campus Web', speaker: 'Dr. Ayesha Khan', track: 'Web', room: 'Auditorium', day: 1, start: '09:00', end: '10:00', cancelled: false, attendees: crowd(80, 'k') },
  { id: 2, title: 'Prompting Responsibly in Class Projects', speaker: 'Bilal Ahmed', track: 'AI', room: 'Room B204', day: 1, start: '10:30', end: '11:30', cancelled: false, attendees: crowd(12, 'p') },
  { id: 3, title: 'Intro to Secure Coding with PHP', speaker: 'Sana Malik', track: 'Security', room: 'Lab C12', day: 1, start: '10:30', end: '12:00', cancelled: false, attendees: crowd(16, 's') },
  { id: 4, title: 'CV Clinic for Fresh Graduates', speaker: 'Omar Farooq', track: 'Careers', room: 'Room B204', day: 1, start: '14:00', end: '15:00', cancelled: false, attendees: crowd(8, 'c') },
  { id: 5, title: 'Accessible Interfaces in Practice', speaker: 'Hira Sheikh', track: 'Web', room: 'Auditorium', day: 2, start: '09:30', end: '10:30', cancelled: false, attendees: [...crowd(30, 'a'), { name: 'Demo Student', email: 'demo@campus.edu' }] },
  { id: 6, title: 'Machine Learning on a Student Budget', speaker: 'Usman Tariq', track: 'AI', room: 'Lab C12', day: 2, start: '11:00', end: '12:00', cancelled: false, attendees: crowd(10, 'm') },
  { id: 7, title: 'Panel: From Internship to Offer', speaker: 'Career Office Panel', track: 'Careers', room: 'Auditorium', day: 2, start: '13:00', end: '14:00', cancelled: false, attendees: crowd(45, 'o') },
  { id: 8, title: 'Password Hygiene Workshop', speaker: 'Zainab Raza', track: 'Security', room: 'Room B204', day: 2, start: '10:00', end: '11:00', cancelled: false, attendees: crowd(20, 'h') },
];
let intro = true;
let flashId = null;
let notices = [{ time: now(), msg: 'Programme published. Registered attendees are notified here when a session moves or is cancelled.' }];

const $ = (sel) => document.querySelector(sel);
function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  kids.forEach((k) => node.append(k));
  return node;
}
function say(sel, text, ok = false) { const p = $(sel); p.textContent = text; p.className = 'msg ' + (ok ? 'ok' : 'error'); }
function clear(sel) { const p = $(sel); p.textContent = ''; p.className = 'msg'; }
function notify(msg) { notices.unshift({ time: now(), msg }); renderNotices(); }
const active = () => sessions.filter((s) => !s.cancelled);
const overlaps = (a, b) => a.day === b.day && a.start < b.end && b.start < a.end;   // "HH:MM" strings compare correctly
const slot = (s) => `${s.start} to ${s.end}`;
const freeRooms = (s) => Object.keys(ROOMS).filter((r) => ROOMS[r] >= (s.expected || 0) && !active().some((o) => o.id !== s.id && o.room === r && overlaps(o, s)));

function renderSessions() {
  const q = $('#search').value.trim().toLowerCase();
  const track = $('#trackFilter').value;
  const day = $('#dayFilter').value;
  const shown = sessions
    .filter((s) => (!q || (s.title + ' ' + s.speaker).toLowerCase().includes(q)) && (!track || s.track === track) && (!day || s.day === Number(day)))
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));

  const list = $('#sessionList');
  list.replaceChildren();
  [1, 2].forEach((d) => {
    const items = shown.filter((s) => s.day === d);
    if (!items.length) return;
    list.append(el('section', { className: 'day-group' }, el('h3', {}, DAY_NAME[d][0], el('span', {}, DAY_NAME[d][1])), el('ul', { className: 'sessions' }, ...items.map(sessionCard))));
  });
  list.className = intro ? 'intro' : '';
  intro = false;
  if (flashId) { document.querySelector(`[data-id="${flashId}"]`)?.classList.add('flash'); flashId = null; }
  $('#emptyMsg').hidden = shown.length > 0;
  $('#summary').textContent = `12 and 13 November 2026, ${active().length} sessions in ${Object.keys(ROOMS).length} rooms`;
  $('#resultCount').textContent = `Showing ${shown.length} of ${sessions.length} sessions`;
  renderSessionSelect();
}

let ddId = 0;
function enhanceSelect(sel) {
  const id = `dd${++ddId}`;
  const wrap = el('div', { className: 'dd' });
  const text = el('span');
  const btn = el('button', { type: 'button', className: 'dd-btn' }, text);
  const list = el('ul', { className: 'dd-list', hidden: true, id });
  btn.setAttribute('role', 'combobox');
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', id);
  list.setAttribute('role', 'listbox');
  let active = -1;
  const name = () => document.querySelector(`label[for="${sel.id}"]`)?.textContent ?? sel.getAttribute('aria-label') ?? '';
  const refresh = () => {
    text.textContent = sel.options[sel.selectedIndex]?.textContent ?? '';
    btn.setAttribute('aria-label', `${name()}: ${text.textContent}`);
  };
  const mark = () => {
    [...list.children].forEach((li, i) => li.classList.toggle('active', i === active));
    const cur = list.children[active];
    if (cur) { btn.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
  };
  const close = () => {
    list.hidden = true;
    wrap.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.removeAttribute('aria-activedescendant');
  };
  const choose = (i) => {
    sel.selectedIndex = i;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    refresh();
    close();
  };
  const open = () => {
    list.replaceChildren(...[...sel.options].map((o, i) => {
      const li = el('li', { id: `${id}-${i}`, className: i === sel.selectedIndex ? 'sel' : '' }, o.textContent);
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === sel.selectedIndex));
      li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(i); });
      return li;
    }));
    active = sel.selectedIndex;
    list.hidden = false;
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    mark();
  };
  btn.addEventListener('click', (e) => { if (list.hidden) open(); else if (e.detail === 0) choose(active); else close(); });
  btn.addEventListener('keydown', (e) => {
    const dir = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (e.key === 'Escape' || e.key === 'Tab') return close();
    if (!dir && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    if (list.hidden) return open();
    const n = sel.options.length;
    active = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.min(n - 1, Math.max(0, active + dir));
    mark();
  });
  sel.classList.add('dd-native');
  sel.tabIndex = -1;
  sel.setAttribute('aria-hidden', 'true');
  sel.addEventListener('focus', () => btn.focus());
  sel.addEventListener('change', () => { wrap.classList.remove('bad'); refresh(); });
  sel.addEventListener('invalid', () => wrap.classList.add('bad'));
  sel.addEventListener('refresh', refresh);
  new MutationObserver(refresh).observe(sel, { childList: true });
  sel.form?.addEventListener('reset', () => setTimeout(refresh));
  wrap._close = close;
  if (sel.parentNode) sel.replaceWith(wrap);
  wrap.append(btn, list, sel);
  refresh();
  return wrap;
}
document.addEventListener('mousedown', (e) => document.querySelectorAll('.dd.open').forEach((d) => d.contains(e.target) || d._close()));

function bar(taken, cap) {
  const b = el('div', { className: taken >= cap ? 'bar full' : 'bar', ariaHidden: 'true' }, el('i'));
  b.style.setProperty('--w', `${Math.min(100, (taken / cap) * 100)}%`);
  return b;
}

function sessionCard(s, i) {
  const cap = ROOMS[s.room], taken = s.attendees.length;
  const body = el('div', { className: 'body' },
    el('h4', {}, s.title),
    el('p', { className: 'meta' }, `${s.speaker} in ${s.room} `, el('span', { className: 'tag' }, s.track),
      s.cancelled ? el('span', { className: 'tag warn' }, 'Cancelled') : taken >= cap ? el('span', { className: 'tag warn' }, 'Full') : ''));
  const time = el('div', { className: 'time' }, s.start, el('small', {}, `to ${s.end}`));
  const li = el('li', { className: `session${s.cancelled ? ' cancelled' : ''}` }, time, body);
  li.dataset.id = s.id;
  li.style.setProperty('--i', i);
  if (s.cancelled) return li;
  const roomSel = el('select', { ariaLabel: `New room for ${s.title}` },
    ...Object.keys(ROOMS).map((r) => el('option', { value: r, selected: r === s.room }, r)));
  const move = el('button', { className: 'small quiet', type: 'button', ariaLabel: `Move ${s.title} to the selected room` }, 'Move');
  move.addEventListener('click', () => moveRoom(s, roomSel.value));
  const cancel = el('button', { className: 'small ghost', type: 'button', ariaLabel: `Cancel ${s.title}` }, 'Cancel');
  cancel.addEventListener('click', () => cancelSession(s));
  body.append(el('div', { className: 'actions' }, enhanceSelect(roomSel), move, cancel));
  li.append(el('div', { className: 'seat-col' },
    el('p', { className: 'seats' }, el('strong', {}, String(taken)), ` of ${cap} seats taken`),
    bar(taken, cap)));
  return li;
}

function renderSessionSelect() {
  const sel = $('#sessionSelect');
  const keep = sel.value;
  sel.replaceChildren(el('option', { value: '' }, 'Choose a session'));
  active().sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)).forEach((s) => {
    const full = s.attendees.length >= ROOMS[s.room];
    sel.append(el('option', { value: s.id }, `Day ${s.day} ${s.start} ${s.title}${full ? ' (full)' : ''}`));
  });
  sel.value = keep;
  if (sel.selectedIndex < 0) sel.selectedIndex = 0;   // chosen session was cancelled
  sel.dispatchEvent(new Event('refresh'));
}

function fillTimes() {
  const start = $('#start');
  start.replaceChildren(el('option', { value: '' }, 'Pick a time'), ...TIMES.slice(0, -1).map((t) => el('option', { value: t }, t)));
  fillEnd();
}
// End list only offers times after the chosen start, with the session length shown
function fillEnd() {
  const start = $('#start').value, end = $('#end'), keep = end.value;
  const opts = TIMES.filter((t) => !start || t > start);
  end.replaceChildren(el('option', { value: '' }, 'Pick a time'), ...opts.map((t) => el('option', { value: t }, start ? `${t} (${dur(start, t)})` : t)));
  end.value = opts.includes(keep) ? keep : '';
  end.dispatchEvent(new Event('refresh'));
}

function renderNotices() {
  $('#notices').replaceChildren(...notices.slice(0, 12).map((n) => el('li', {}, el('time', {}, n.time), n.msg)));
}

$('#proposeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const s = { title: f.get('title').trim(), speaker: f.get('speaker').trim(), track: f.get('track'), room: f.get('room'),
              day: Number(f.get('day')), start: f.get('start'), end: f.get('end'), expected: Number(f.get('expected')) };
  if (s.title.length < 5 || s.speaker.length < 3) return say('#proposeMsg', 'Title needs at least 5 characters and speaker at least 3 (spaces do not count).');
  if (!s.start || !s.end) return say('#proposeMsg', 'Pick a start and an end time.');
  if (s.end <= s.start) return say('#proposeMsg', 'End time must be after the start time.');
  if (!(s.expected > 0)) return say('#proposeMsg', 'Enter the number of attendees you expect.');
  if (s.expected > ROOMS[s.room]) return say('#proposeMsg', `${s.room} seats ${ROOMS[s.room]}, but you expect ${s.expected}. Choose a bigger room.`);

  const roomClash = active().find((o) => o.room === s.room && overlaps(o, s));
  if (roomClash) {
    const alt = freeRooms(s);
    return say('#proposeMsg', `${s.room} is taken ${slot(roomClash)} by "${roomClash.title}". ${alt.length ? 'Free at that time: ' + alt.join(', ') + '.' : 'No room is free at that time.'}`);
  }
  const speakerClash = active().find((o) => o.speaker.toLowerCase() === s.speaker.toLowerCase() && overlaps(o, s));
  if (speakerClash) return say('#proposeMsg', `${s.speaker} already speaks ${slot(speakerClash)} in "${speakerClash.title}".`);

  sessions.push({ id: nextId++, ...s, cancelled: false, attendees: [] });
  flashId = nextId - 1;
  say('#proposeMsg', `"${s.title}" added to the programme.`, true);
  notify(`New session added: "${s.title}" (${s.room}, Day ${s.day}, ${slot(s)}).`);
  e.target.reset();
  renderSessions();
});
$('#proposeForm').addEventListener('reset', () => setTimeout(fillEnd));
$('#start').addEventListener('change', fillEnd);

$('#registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const name = f.get('name').trim(), email = f.get('email').trim().toLowerCase();
  const s = sessions.find((x) => x.id === Number(f.get('session')));
  if (name.length < 3) return say('#registerMsg', 'Enter your full name.');
  if (!s) return say('#registerMsg', 'Choose a session to register for.');
  if (s.attendees.some((a) => a.email === email)) return say('#registerMsg', 'That email is already registered for this session.');
  const clash = active().find((o) => o.id !== s.id && o.attendees.some((a) => a.email === email) && overlaps(o, s));
  if (clash) return say('#registerMsg', `You are already booked into "${clash.title}" at ${slot(clash)}. Sessions cannot overlap.`);
  if (s.attendees.length >= ROOMS[s.room]) return say('#registerMsg', `"${s.title}" is full (${ROOMS[s.room]} seats). Pick another session.`);

  s.attendees.push({ name, email });
  flashId = s.id;
  say('#registerMsg', `${name} is registered for "${s.title}".`, true);
  e.target.reset();
  renderSessions();
});

['input', 'change'].forEach((ev) => $('#filterForm').addEventListener(ev, renderSessions));
$('#filterForm').addEventListener('submit', (e) => e.preventDefault());

function moveRoom(s, room) {
  clear('#scheduleMsg');
  if (room === s.room) return say('#scheduleMsg', `"${s.title}" is already in ${room}.`);
  if (s.attendees.length > ROOMS[room]) return say('#scheduleMsg', `${room} seats ${ROOMS[room]} but ${s.attendees.length} people are registered.`);
  const clash = active().find((o) => o.id !== s.id && o.room === room && overlaps(o, s));
  if (clash) return say('#scheduleMsg', `${room} is taken ${slot(clash)} by "${clash.title}".`);
  const old = s.room; s.room = room;
  flashId = s.id;
  notify(`"${s.title}" moved from ${old} to ${room}. ${s.attendees.length} attendee(s) notified.`);
  say('#scheduleMsg', `Room changed to ${room}.`, true);
  renderSessions();
  document.querySelector(`[data-id="${s.id}"] .dd-btn`)?.focus();   // keep keyboard users in place after re-render
}
// Themed <dialog> instead of the browser's grey confirm() box
function cancelSession(s) {
  const dlg = $('#confirmDlg');
  $('#confirmText').textContent = `"${s.title}" will be marked as cancelled and its ${s.attendees.length} registered attendee(s) notified.`;
  dlg.returnValue = '';
  dlg.onclose = () => {
    if (dlg.returnValue !== 'yes') return;
    s.cancelled = true;
    flashId = s.id;
    notify(`"${s.title}" was cancelled. ${s.attendees.length} attendee(s) notified.`);
    say('#scheduleMsg', `"${s.title}" cancelled.`, true);
    renderSessions();
    $('#scheduleMsg').focus();
  };
  dlg.showModal();
}

TRACKS.forEach((t) => { $('#trackFilter').append(el('option', { value: t }, t)); $('#track').append(el('option', { value: t }, t)); });
Object.keys(ROOMS).forEach((r) => $('#room').append(el('option', { value: r }, `${r} (${ROOMS[r]})`)));
fillTimes();
document.querySelectorAll('form select').forEach(enhanceSelect);
renderSessions();
renderNotices();
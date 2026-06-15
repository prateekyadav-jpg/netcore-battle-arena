import { useState, useEffect, useCallback, useRef } from 'react';
import { readDB, writeDB, getDefaultDB } from './db';

// ── Constants ────────────────────────────────────────────────────────────────
const GAMES       = ['Carrom', 'TT', 'Chess'];
const ROUNDS      = ['Group Stage', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Final'];
const DEPARTMENTS = ['Engineering', 'Product', 'Marketing', 'Design', 'Sales', 'Finance', 'HR', 'Operations'];
const ADMIN_PIN   = '1234'; // Change this before deploying!
const POLL_MS     = 8000;   // Refresh shared data every 8 seconds

const GAME_COLORS = {
  Chess:  { bg: '#EEEDFE', fg: '#3C3489' },
  Carrom: { bg: '#E1F5EE', fg: '#085041' },
  TT:     { bg: '#FAEEDA', fg: '#633806' },
};
const TYPE_COLORS = {
  Ladies: { bg: '#FBEAF0', fg: '#72243E' },
  Gents:  { bg: '#E6F1FB', fg: '#0C447C' },
};
const AVATAR_PALETTE = [
  { bg: '#EEEDFE', fg: '#3C3489' }, { bg: '#E1F5EE', fg: '#085041' },
  { bg: '#FBEAF0', fg: '#72243E' }, { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#E6F1FB', fg: '#0C447C' }, { bg: '#EAF3DE', fg: '#3B6D11' },
  { bg: '#FAECE7', fg: '#712B13' }, { bg: '#F1EFE8', fg: '#444441' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const initials   = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const avatarColor = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length; return AVATAR_PALETTE[h]; };
const uid        = () => Math.random().toString(36).slice(2, 10);
const pts        = (preds, results) => Object.entries(preds).filter(([mid, side]) => results[mid] === side).length * 10;

// ── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ name, size = 36, isMe }) {
  const av = avatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: isMe ? '#7C6EE8' : av.bg, color: isMe ? '#fff' : av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700 }}>
      {initials(name)}
    </div>
  );
}

function Badge({ label, style: s }) {
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, ...s }}>{label}</span>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#A32D2D' : '#534AB7', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', zIndex: 999, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
      {toast.msg}
    </div>
  );
}

function SyncDot({ synced }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: synced ? '#1D9E75' : '#E24B4A', boxShadow: synced ? '0 0 6px #1D9E75' : 'none' }} />
      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)' }}>{synced ? 'Live' : 'Offline'}</span>
    </div>
  );
}

// ── Name entry screen ────────────────────────────────────────────────────────
function NameScreen({ onJoin }) {
  const [name, setName]   = useState('');
  const [dept, setDept]   = useState('Engineering');
  const [pin,  setPin]    = useState('');
  const [mode, setMode]   = useState('user'); // 'user' | 'admin'

  const join = () => {
    if (!name.trim()) return;
    if (mode === 'admin' && pin !== ADMIN_PIN) { alert('Wrong PIN'); return; }
    onJoin({ name: name.trim(), dept, isAdmin: mode === 'admin' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
          <h1 style={{ color: '#1A1A2E', fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Netcore Battle Arena</h1>
          <p style={{ color: 'rgba(0,0,0,0.4)', fontSize: 14, marginTop: 6 }}>Indoor Games Tournament · July 2026</p>
        </div>

        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '1.75rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
            {['user', 'admin'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: mode === m ? '#7C6EE8' : 'transparent', color: mode === m ? '#fff' : 'rgba(0,0,0,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{m === 'admin' ? '⚙️ Admin' : '🎯 Predictor'}</button>
            ))}
          </div>

          <Field label="Your name">
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && join()} placeholder="e.g. Priya S." autoFocus />
          </Field>
          <Field label="Department" style={{ marginTop: 12 }}>
            <select value={dept} onChange={e => setDept(e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          {mode === 'admin' && (
            <Field label="Admin PIN" style={{ marginTop: 12 }}>
              <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN" />
            </Field>
          )}

          <button onClick={join} style={{ width: '100%', padding: '13px 0', marginTop: 20, background: '#7C6EE8', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.2px' }}>
            {mode === 'admin' ? 'Enter admin panel →' : 'Join the prediction league →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style: s }) {
  return (
    <div style={s}>
      <label style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>
      {children}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [me, setMe]               = useState(null);           // { id, name, dept, isAdmin }
  const [db, setDb]               = useState(null);           // shared DB snapshot
  const [myPreds, setMyPreds]     = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [view, setView]           = useState('predict');
  const [filterGame, setFilterGame] = useState('All');
  const [toast, setToast]         = useState(null);
  const [synced, setSynced]       = useState(true);
  const [adminTab, setAdminTab]   = useState('matches');
  const [newMatch, setNewMatch]   = useState({ game: 'Chess', type: 'Gents', round: 'Group Stage', date: '', time: '', p1name: '', p1dept: 'Engineering', p2name: '', p2dept: 'Engineering' });
  const pollRef = useRef(null);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const saved = localStorage.getItem('nba_me');
    if (saved) setMe(JSON.parse(saved));
    const savedPreds = localStorage.getItem('nba_mypreds');
    if (savedPreds) setMyPreds(JSON.parse(savedPreds));
    const savedSub = localStorage.getItem('nba_submitted');
    if (savedSub) setSubmitted(JSON.parse(savedSub));
  }, []);

  // ── Fetch shared DB ──
  const fetchDB = useCallback(async () => {
    const data = await readDB();
    if (data) { setDb(data); setSynced(true); }
    else setSynced(false);
  }, []);

  // ── Initialize DB + start polling ──
  useEffect(() => {
    const init = async () => {
      let data = await readDB();
      if (!data || !data.matches) {
        data = getDefaultDB();
        await writeDB(data);
      }
      setDb(data);
    };
    init();
    pollRef.current = setInterval(fetchDB, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchDB]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const saveMe = (meObj) => {
    setMe(meObj);
    localStorage.setItem('nba_me', JSON.stringify(meObj));
  };

  const handleJoin = async (info) => {
    const meObj = { id: uid(), ...info };
    saveMe(meObj);
    // Register player in shared DB
    if (!info.isAdmin) {
      const data = await readDB() || getDefaultDB();
      data.players = data.players || {};
      if (!data.players[meObj.id]) {
        data.players[meObj.id] = { name: info.name, dept: info.dept, predictions: {}, points: 0, lastSeen: Date.now() };
        await writeDB(data);
        setDb(data);
      }
    }
  };

  // ── Pick winner ──
  const pick = (matchId, side) => {
    if (submitted) return;
    const mp = { ...myPreds, [matchId]: side };
    setMyPreds(mp);
    localStorage.setItem('nba_mypreds', JSON.stringify(mp));
  };

  // ── Submit predictions ──
  const submitPreds = async () => {
    const count = Object.keys(myPreds).length;
    if (count === 0) { showToast('Pick at least one winner first!', 'error'); return; }
    const data = await readDB() || getDefaultDB();
    data.players = data.players || {};
    const existing = data.players[me.id] || { name: me.name, dept: me.dept, points: 0 };
    data.players[me.id] = { ...existing, predictions: myPreds, points: pts(myPreds, data.results || {}), lastSeen: Date.now() };
    const ok = await writeDB(data);
    setSynced(ok);
    setDb(data);
    setSubmitted(true);
    localStorage.setItem('nba_submitted', 'true');
    showToast(`🎉 ${count} prediction${count > 1 ? 's' : ''} locked in!`);
  };

  // ── Admin: set match result ──
  const setResult = async (matchId, winner) => {
    const data = { ...db };
    data.results = { ...(data.results || {}), [matchId]: winner };
    data.matches = data.matches.map(m => m.id === matchId ? { ...m, result: winner, status: 'completed' } : m);
    // Recompute points for all players
    data.players = data.players || {};
    for (const pid of Object.keys(data.players)) {
      const p = data.players[pid];
      data.players[pid] = { ...p, points: pts(p.predictions || {}, data.results) };
    }
    data.updatedAt = Date.now();
    const ok = await writeDB(data);
    setSynced(ok);
    setDb({ ...data });
    showToast('Result saved! Leaderboard updated.');
  };

  // ── Admin: add match ──
  const addMatch = async () => {
    if (!newMatch.p1name || !newMatch.p2name || !newMatch.date) { showToast('Fill player names and date', 'error'); return; }
    const m = { id: 'm' + Date.now(), game: newMatch.game, type: newMatch.type, round: newMatch.round, date: newMatch.date, time: newMatch.time, p1: { name: newMatch.p1name, dept: newMatch.p1dept }, p2: { name: newMatch.p2name, dept: newMatch.p2dept }, result: null, status: 'upcoming' };
    const data = { ...db, matches: [...(db.matches || []), m], updatedAt: Date.now() };
    await writeDB(data); setDb(data);
    setNewMatch({ game: 'Chess', type: 'Gents', round: 'Group Stage', date: '', time: '', p1name: '', p1dept: 'Engineering', p2name: '', p2dept: 'Engineering' });
    showToast('Match added!');
  };

  // ── Admin: delete match ──
  const deleteMatch = async (id) => {
    const data = { ...db, matches: db.matches.filter(m => m.id !== id), updatedAt: Date.now() };
    await writeDB(data); setDb(data);
    showToast('Match removed.');
  };

  // ── Admin: reset all data ──
  const resetAll = async () => {
    if (!window.confirm('Reset ALL data? This clears all predictions and results.')) return;
    const fresh = getDefaultDB();
    await writeDB(fresh); setDb(fresh);
    showToast('All data reset.');
  };

  // ── Derived state ──
  if (!me) return <NameScreen onJoin={handleJoin} />;
  if (!db)  return <LoadingScreen />;

  const matches        = db.matches || [];
  const results        = db.results || {};
  const players        = db.players || {};
  const upcoming       = matches.filter(m => m.status === 'upcoming');
  const completed      = matches.filter(m => m.status === 'completed');
  const filtered       = filterGame === 'All' ? upcoming : upcoming.filter(m => m.game === filterGame);
  const sortedPlayers  = Object.entries(players).map(([id, p]) => ({ id, ...p })).sort((a, b) => b.points - a.points);
  const myRank         = sortedPlayers.findIndex(p => p.id === me.id) + 1 || sortedPlayers.length + 1;
  const myPlayer       = players[me.id] || {};
  const myPoints       = myPlayer.points || 0;
  const myCorrect      = completed.filter(m => myPreds[m.id] === results[m.id]).length;
  const predCount      = Object.keys(myPreds).length;

  const NAV = [
    { id: 'predict', icon: 'ti-target', label: 'Predict' },
    { id: 'results', icon: 'ti-checklist', label: 'Results' },
    { id: 'leaderboard', icon: 'ti-trophy', label: 'Board' },
    { id: 'admin', icon: 'ti-settings', label: 'Admin' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2FF', paddingBottom: 80 }}>

      {/* ── Header ── */}
      <div style={{ background: '#F8F8FF', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', color: '#1A1A2E' }}>🏆 Netcore Battle Arena</div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 1 }}>July 2026 · Indoor Games</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SyncDot synced={synced} />
          <Avatar name={me.name} size={32} isMe />
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#E8EAFF' }}>
        {[['Predicted', predCount], ['Correct', myCorrect], ['Rank', myRank ? `#${myRank}` : '—'], ['Points', myPoints]].map(([label, val]) => (
          <div key={label} style={{ padding: '10px 0', textAlign: 'center', borderRight: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#A89DF0' }}>{val}</div>
            <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.25rem', maxWidth: 580, margin: '0 auto' }}>

        {/* PREDICT */}
        {view === 'predict' && (
          <div>
            {/* Game filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['All', ...GAMES].map(g => (
                <button key={g} onClick={() => setFilterGame(g)} style={{ padding: '5px 14px', borderRadius: 999, border: '0.5px solid rgba(0,0,0,0.15)', background: filterGame === g ? '#7C6EE8' : 'transparent', color: filterGame === g ? '#fff' : 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'pointer' }}>{g}</button>
              ))}
            </div>

            {submitted && (
              <div style={{ background: 'rgba(124,110,232,0.1)', border: '0.5px solid rgba(124,110,232,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#A89DF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✅ Predictions locked in and synced!</span>
                <button onClick={() => { setSubmitted(false); localStorage.removeItem('nba_submitted'); }} style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.35)', fontSize: 12, cursor: 'pointer' }}>Edit</button>
              </div>
            )}

            {filtered.length === 0 && (
              <EmptyState msg={filterGame !== 'All' ? `No upcoming ${filterGame} matches.` : 'No upcoming matches yet.'} sub="Check back soon or ask the admin to add matches." />
            )}

            {filtered.map(m => <MatchCard key={m.id} match={m} picked={myPreds[m.id]} onPick={pick} locked={submitted} />)}

            {!submitted && filtered.length > 0 && (
              <button onClick={submitPreds} style={{ width: '100%', padding: '13px 0', background: '#7C6EE8', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                Lock in {predCount > 0 ? `${predCount} prediction${predCount > 1 ? 's' : ''}` : 'predictions'} →
              </button>
            )}
          </div>
        )}

        {/* RESULTS */}
        {view === 'results' && (
          <div>
            <SectionTitle>Completed matches</SectionTitle>
            {completed.length === 0 && <EmptyState msg="No results yet." sub="Check back after matches are played." />}
            {completed.map(m => {
              const winner = results[m.id] === 'p1' ? m.p1 : m.p2;
              const myPick = myPreds[m.id];
              const correct = myPick && myPick === results[m.id];
              return (
                <div key={m.id} style={{ background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <Badge label={m.game} style={GAME_COLORS[m.game]} />
                    <Badge label={m.type} style={TYPE_COLORS[m.type]} />
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.12)', marginLeft: 'auto' }}>{m.round}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', marginBottom: 6 }}>{m.p1.name} vs {m.p2.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#A89DF0' }}>🏆 {winner.name}</div>
                    {myPick ? (
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: correct ? 'rgba(29,158,117,0.15)' : 'rgba(226,75,74,0.12)', color: correct ? '#1D9E75' : '#E24B4A', fontWeight: 600 }}>
                        {correct ? '+10 pts ✓' : 'Missed ✗'}
                      </span>
                    ) : <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.2)' }}>No prediction</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LEADERBOARD */}
        {view === 'leaderboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <SectionTitle>Live leaderboard</SectionTitle>
              <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.12)' }}>Refreshes every 8s</span>
            </div>

            {sortedPlayers.length === 0 && <EmptyState msg="No predictors yet." sub="Share the link so your colleagues can join!" />}

            {/* Top 3 podium */}
            {sortedPlayers.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
                {[sortedPlayers[1], sortedPlayers[0], sortedPlayers[2]].map((p, i) => {
                  const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                  const heights = [100, 120, 88];
                  const medals  = ['🥈', '🥇', '🥉'];
                  return (
                    <div key={p.id} style={{ background: '#FFFFFF', border: `0.5px solid ${p.id === me.id ? 'rgba(124,110,232,0.4)' : 'rgba(0,0,0,0.07)'}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center', height: heights[i], display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{medals[i]}</div>
                      <Avatar name={p.name} size={32} isMe={p.id === me.id} />
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: p.id === me.id ? '#534AB7' : '#1A1A2E' }}>{p.name.split(' ')[0]}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#A89DF0', marginTop: 2 }}>{p.points}</div>
                      <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.12)' }}>pts</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            {sortedPlayers.map((p, i) => (
              <div key={p.id} style={{ background: p.id === me.id ? 'rgba(124,110,232,0.08)' : '#FFFFFF', border: `0.5px solid ${p.id === me.id ? 'rgba(124,110,232,0.25)' : 'rgba(0,0,0,0.06)'}`, borderRadius: 12, padding: '11px 1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 26, textAlign: 'center', fontSize: i < 3 ? 16 : 12, color: 'rgba(0,0,0,0.3)', fontWeight: 600 }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                </div>
                <Avatar name={p.name} size={34} isMe={p.id === me.id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: p.id === me.id ? '#534AB7' : '#1A1A2E', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.name} {p.id === me.id && <span style={{ fontSize: 10, background: 'rgba(124,110,232,0.25)', color: '#A89DF0', padding: '1px 6px', borderRadius: 999 }}>you</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', marginTop: 1 }}>{p.dept} · {Object.keys(p.predictions || {}).length} picks</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#A89DF0', minWidth: 40, textAlign: 'right' }}>{p.points}</div>
              </div>
            ))}
            <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(0,0,0,0.2)', marginTop: 12 }}>10 pts per correct prediction</div>
          </div>
        )}

        {/* ADMIN */}
        {view === 'admin' && me.isAdmin && (
          <div>
            <SectionTitle>Admin panel</SectionTitle>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['matches', 'results', 'players'].map(t => (
                <button key={t} onClick={() => setAdminTab(t)} style={{ padding: '5px 14px', borderRadius: 999, border: '0.5px solid rgba(0,0,0,0.15)', background: adminTab === t ? '#7C6EE8' : 'transparent', color: adminTab === t ? '#fff' : 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
              ))}
            </div>

            {adminTab === 'matches' && (
              <div>
                <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '1.25rem', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.5)', marginBottom: 14 }}>Add new match</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['Game', 'game', GAMES], ['Type', 'type', ['Gents','Ladies']], ['Round', 'round', ROUNDS]].map(([lbl, key, opts]) => (
                      <AdminSelect key={key} label={lbl} value={newMatch[key]} onChange={v => setNewMatch(p => ({...p, [key]: v}))} opts={opts} wide={key==='round'} />
                    ))}
                    <AdminInput label="Date" type="date" value={newMatch.date} onChange={v => setNewMatch(p => ({...p, date: v}))} />
                    <AdminInput label="Time" type="time" value={newMatch.time} onChange={v => setNewMatch(p => ({...p, time: v}))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                    {['p1','p2'].map((s, i) => (
                      <div key={s} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Player {i+1}</div>
                        <AdminInput label="Name" value={newMatch[s+'name']} onChange={v => setNewMatch(p => ({...p, [s+'name']: v}))} />
                        <AdminSelect label="Dept" value={newMatch[s+'dept']} onChange={v => setNewMatch(p => ({...p, [s+'dept']: v}))} opts={DEPARTMENTS} style={{ marginTop: 8 }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={addMatch} style={{ width: '100%', padding: '10px 0', background: '#7C6EE8', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 14 }}>Add match</button>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', marginBottom: 10 }}>All matches ({matches.length})</div>
                {matches.map(m => (
                  <div key={m.id} style={{ background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '10px 1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.p1.name} vs {m.p2.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', marginTop: 2 }}>{m.game} · {m.type} · {m.round} · {m.date}</div>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: m.status === 'completed' ? 'rgba(29,158,117,0.12)' : 'rgba(0,0,0,0.06)', color: m.status === 'completed' ? '#1D9E75' : 'rgba(0,0,0,0.4)' }}>{m.status}</span>
                    <button onClick={() => deleteMatch(m.id)} style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.12)', cursor: 'pointer', fontSize: 18, padding: 4 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {adminTab === 'results' && (
              <div>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.35)', marginBottom: 14 }}>Select the winner — points update instantly for all predictors.</p>
                {upcoming.map(m => (
                  <div key={m.id} style={{ background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      <Badge label={m.game} style={GAME_COLORS[m.game]} />
                      <Badge label={m.type} style={TYPE_COLORS[m.type]} />
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.12)', marginLeft: 'auto' }}>{m.date} {m.time}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{m.p1.name} vs {m.p2.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[['p1', m.p1.name], ['p2', m.p2.name]].map(([side, name]) => (
                        <button key={side} onClick={() => setResult(m.id, side)} style={{ padding: '9px 0', borderRadius: 9, border: '0.5px solid rgba(124,110,232,0.35)', background: 'rgba(124,110,232,0.08)', color: '#A89DF0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          🏆 {name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {upcoming.length === 0 && <EmptyState msg="All results are in!" sub="Every match has been decided." />}
              </div>
            )}

            {adminTab === 'players' && (
              <div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', marginBottom: 14 }}>{sortedPlayers.length} players registered</div>
                {sortedPlayers.map((p, i) => (
                  <div key={p.id} style={{ background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '10px 1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={p.name} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>{p.dept} · {Object.keys(p.predictions||{}).length} predictions</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#A89DF0' }}>{p.points} pts</div>
                  </div>
                ))}
                <button onClick={resetAll} style={{ width: '100%', padding: '10px 0', background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 10, color: '#E24B4A', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>
                  Reset all data
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F8F8FF', borderTop: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-around', padding: '8px 0 14px' }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px' }}>
            <i className={`ti ${n.icon}`} aria-hidden style={{ fontSize: 22, color: view === n.id ? '#A89DF0' : 'rgba(255,255,255,0.28)' }} />
            <span style={{ fontSize: 10, color: view === n.id ? '#A89DF0' : 'rgba(255,255,255,0.28)', fontWeight: view === n.id ? 600 : 400 }}>{n.label}</span>
          </button>
        ))}
      </div>

      <Toast toast={toast} />
    </div>
  );
}

// ── Shared small components ───────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{children}</div>;
}

function EmptyState({ msg, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.3)', marginBottom: 4 }}>{msg}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>{sub}</div>}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#F0F2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.3)', fontSize: 14 }}>
      Loading tournament data…
    </div>
  );
}

function AdminInput({ label, value, onChange, type = 'text', style: s }) {
  return (
    <div style={s}>
      <label style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.05)', color: '#1A1A2E', fontSize: 13 }} />
    </div>
  );
}

function AdminSelect({ label, value, onChange, opts, wide, style: s }) {
  return (
    <div style={{ gridColumn: wide ? 'span 2' : undefined, ...s }}>
      <label style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.1)', background: '#FFFFFF', color: '#1A1A2E', fontSize: 13 }}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function MatchCard({ match: m, picked, onPick, locked }) {
  return (
    <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Badge label={m.game} style={GAME_COLORS[m.game]} />
        <Badge label={m.type} style={TYPE_COLORS[m.type]} />
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.12)', marginLeft: 'auto' }}>{m.round}</span>
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.12)' }}>· {m.time}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {/* Player 1 */}
        {(() => { const player = m.p1; const av = avatarColor(player.name); const sel = picked === 'p1'; return (
          <div onClick={() => !locked && onPick(m.id, 'p1')}
            style={{ padding: '10px 10px', borderRadius: 10, border: `1.5px solid ${sel ? '#7C6EE8' : 'rgba(0,0,0,0.06)'}`, background: sel ? 'rgba(124,110,232,0.12)' : 'rgba(0,0,0,0.01)', cursor: locked ? 'default' : 'pointer', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(player.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: sel ? '#534AB7' : '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 1 }}>{player.dept}</div>
              </div>
            </div>
          </div>
        ); })()}
        {/* VS */}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(0,0,0,0.35)', fontWeight: 700 }}>VS</div>
        {/* Player 2 */}
        {(() => { const player = m.p2; const av = avatarColor(player.name); const sel = picked === 'p2'; return (
          <div onClick={() => !locked && onPick(m.id, 'p2')}
            style={{ padding: '10px 10px', borderRadius: 10, border: `1.5px solid ${sel ? '#7C6EE8' : 'rgba(0,0,0,0.06)'}`, background: sel ? 'rgba(124,110,232,0.12)' : 'rgba(0,0,0,0.01)', cursor: locked ? 'default' : 'pointer', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(player.name)}</div>
              <div style={{ textAlign: 'right', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: sel ? '#534AB7' : '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 1 }}>{player.dept}</div>
              </div>
            </div>
          </div>
        ); })()}
      </div>
      <div style={{ fontSize: 12, textAlign: 'center', color: picked ? '#A89DF0' : 'rgba(0,0,0,0.2)' }}>
        {picked ? `✓ Picked: ${picked === 'p1' ? m.p1.name : m.p2.name}` : 'Tap a player to pick the winner'}
      </div>
    </div>
  );
}

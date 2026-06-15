// db.js — Shared state via a free JSON storage backend (jsonbin.io)
// Replace BIN_ID and API_KEY with your own from jsonbin.io (free account)
// Or swap this module for Firebase/Supabase — the interface stays the same.

const API_KEY  = '$2a$10$$2a$10$aG2eoSY1kpEQA5OPbE93DOkxy8pDzO/2xjNoGqOMUonDs3SgUCHwC';
const BIN_ID   = '6a2fb0c9f5f4af5e29f3bafd';
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': API_KEY,
  'X-Bin-Meta': 'false',
};

export async function readDB() {
  try {
    const res = await fetch(BASE_URL + '/latest', { headers: HEADERS });
    if (!res.ok) throw new Error('read failed');
    return await res.json();
  } catch {
    // Fallback to localStorage if network unavailable
    const local = localStorage.getItem('nba_shared');
    return local ? JSON.parse(local) : null;
  }
}

export async function writeDB(data) {
  // Always write to localStorage as instant local cache
  localStorage.setItem('nba_shared', JSON.stringify(data));
  try {
    const res = await fetch(BASE_URL, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('write failed');
    return true;
  } catch {
    return false; // Local cache still written — graceful degradation
  }
}

export function getDefaultDB() {
  return {
    matches: [
      { id: 'm1', game: 'Chess',   type: 'Gents',  round: 'Quarterfinal', date: '2025-07-10', time: '11:00', p1: { name: 'Rohan V.',  dept: 'Engineering' }, p2: { name: 'Aditya S.', dept: 'Product'     }, result: null, status: 'upcoming' },
      { id: 'm2', game: 'TT',      type: 'Ladies', round: 'Quarterfinal', date: '2025-07-10', time: '12:00', p1: { name: 'Priya R.',  dept: 'Marketing'  }, p2: { name: 'Meera K.',  dept: 'Design'       }, result: null, status: 'upcoming' },
      { id: 'm3', game: 'Carrom',  type: 'Gents',  round: 'Quarterfinal', date: '2025-07-11', time: '14:00', p1: { name: 'Vikram D.', dept: 'Sales'      }, p2: { name: 'Suresh N.', dept: 'Finance'      }, result: null, status: 'upcoming' },
      { id: 'm4', game: 'TT',      type: 'Gents',  round: 'Quarterfinal', date: '2025-07-11', time: '15:30', p1: { name: 'Arjun P.',  dept: 'HR'         }, p2: { name: 'Dev M.',    dept: 'Engineering'  }, result: null, status: 'upcoming' },
      { id: 'm5', game: 'Chess',   type: 'Gents',  round: 'Semifinal',    date: '2025-07-15', time: '11:00', p1: { name: 'Karan B.',  dept: 'Operations' }, p2: { name: 'Raj T.',    dept: 'Product'      }, result: null, status: 'upcoming' },
      { id: 'm6', game: 'Carrom',  type: 'Ladies', round: 'Semifinal',    date: '2025-07-15', time: '13:00', p1: { name: 'Anita S.',  dept: 'Marketing'  }, p2: { name: 'Divya M.',  dept: 'Design'       }, result: null, status: 'upcoming' },
    ],
    players: {},   // { [playerId]: { name, dept, predictions: {}, points, lastSeen } }
    results: {},   // { [matchId]: 'p1' | 'p2' }
    updatedAt: Date.now(),
  };
}

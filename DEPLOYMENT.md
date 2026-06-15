# 🏆 Netcore Battle Arena — Deployment Guide

## What you have
A React web app with:
- Match prediction for Carrom, TT, Chess (Ladies & Gents)
- Real-time shared leaderboard (syncs every 8 seconds across all users)
- Admin panel to add matches and enter results
- Points auto-calculated when results are entered
- Works on mobile and desktop

---

## Step 1 — Set up the shared database (5 min)

The app uses **JSONBin.io** as a free real-time database.

1. Go to **https://jsonbin.io** and create a free account
2. Click **"Create a Bin"**
3. Paste this as the initial JSON:
   ```json
   { "matches": [], "players": {}, "results": {}, "updatedAt": 0 }
   ```
4. Click **Save** — you'll get a **Bin ID** in the URL bar (looks like `64f3a1b2e69a...`)
5. Go to **API Keys** in the sidebar → create a key → copy it

6. Open `src/db.js` in the project and replace:
   ```js
   const API_KEY = '$2a$10$REPLACE_WITH_YOUR_JSONBIN_API_KEY';
   const BIN_ID  = 'REPLACE_WITH_YOUR_BIN_ID';
   ```
   with your real values.

---

## Step 2 — Set the Admin PIN

Open `src/App.jsx`, find this line near the top:
```js
const ADMIN_PIN = '1234';
```
Change `'1234'` to whatever PIN you want. Share it only with yourself (or co-organisers).

---

## Step 3 — Deploy to Vercel (free, 3 minutes)

### Option A — Via GitHub (recommended)
1. Push this project to a **GitHub repo** (github.com → New repo → upload files)
2. Go to **https://vercel.com** → Sign up with GitHub
3. Click **"Add New Project"** → Import your repo
4. Leave all settings as default → click **Deploy**
5. Vercel gives you a URL like `https://netcore-battle-arena.vercel.app`
6. Share that URL with your whole office 🎉

### Option B — Via Vercel CLI
```bash
npm install -g vercel
cd netcore-app
npm install
vercel deploy
```
Follow the prompts — it deploys in ~60 seconds.

### Option C — Netlify (alternative to Vercel)
1. Run `npm run build` locally (generates a `build/` folder)
2. Go to **https://netlify.com** → drag and drop the `build/` folder
3. Done. You get a URL immediately.

---

## How to use the app

### For employees
1. Open the link, enter your name + department
2. Pick winners for each upcoming match
3. Tap "Lock in predictions"
4. Watch the leaderboard update as results come in

### For admin (you)
1. Open the link, switch to **Admin** tab on the login screen
2. Enter the admin PIN
3. **Matches tab** — add new matches as the tournament progresses
4. **Results tab** — after each match, tap the winner → points auto-distribute

---

## Tips for maximum engagement
- Share the link in your company WhatsApp/Slack group
- Post the leaderboard screenshot in Slack after each match day
- Remind people to predict before each match — predictions lock in on submission
- Add all matches upfront so people can predict the whole bracket at once

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Leaderboard not updating | Check your JSONBin API key in db.js |
| "Offline" dot showing | JSONBin free tier has 10k requests/month — check usage |
| App not loading | Run `npm install` then `npm start` to test locally |
| Want to reset everything | Admin panel → Players tab → "Reset all data" |

---

## Tech stack
- **React 18** — UI
- **JSONBin.io** — Free shared JSON database (real-time via polling)
- **Vercel** — Free hosting with automatic HTTPS
- **No backend server needed** — fully serverless

Total monthly cost: **₹0** (all free tiers)

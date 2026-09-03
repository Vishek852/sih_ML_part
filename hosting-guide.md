# Hosting Guide — Cooperative Gig Services Platform

One consolidated guide, start to finish. Stack: **Vercel** (frontend + admin
dashboard, free) · **Render free tier** (backend + ML service) · **MongoDB
Atlas** (already set up) · **UptimeRobot** (keeps Render awake) · optional
custom domain.

Total cost: **$0**, unless you choose to buy a domain (~₹800–1200/year).

---

## Step 0 — What you need before starting

- [ ] GitHub repos for: frontend, admin dashboard (if separate), backend, ML service
- [ ] MongoDB Atlas connection string (already have this)
- [ ] A Mapbox public token
- [ ] Accounts: [vercel.com](https://vercel.com), [render.com](https://render.com), [uptimerobot.com](https://uptimerobot.com) — all free, sign up with GitHub

---

## Step 1 — Add health-check routes

Do this first; both Render and UptimeRobot need it.

**Backend (`server.js` or wherever your Express app is set up):**
```js
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "backend" });
});
```

**ML service (`main.py`):**
```python
@app.get("/health")
def health():
    return {"status": "ok", "service": "ml"}
```

Commit and push both before moving on.

---

## Step 2 — Deploy the backend (Render, free)

1. Render dashboard → **New** → **Web Service** → connect the backend repo
2. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start` (or your actual entry point, e.g. `node server.js`)
   - **Plan:** Free
   - **Health check path:** `/health`
3. Add environment variables (Environment tab):
   ```
   MONGODB_URI=<your Atlas connection string>
   JWT_SECRET=<any random string>
   NODE_ENV=production
   CORS_ORIGIN=*          # tighten this in Step 5 once the frontend URL exists
   AI_SERVICE_URL=        # leave blank, fill in after Step 3
   ```
4. Deploy → note the URL, e.g. `https://coopgig-backend.onrender.com`

---

## Step 3 — Deploy the ML service (Render, free)

1. **New** → **Web Service** → connect the ML repo
2. Settings:
   - **Runtime:** Python
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
   - **Health check path:** `/health`
3. Deploy → note the URL, e.g. `https://coopgig-ml.onrender.com`

If FreqGuard's model weights are large (>100MB), don't commit them to the
repo — host on Hugging Face Hub and download at container startup, so
deploys stay fast.

4. Go back to the **backend** service → Environment → set:
   ```
   AI_SERVICE_URL=https://coopgig-ml.onrender.com
   ```
   This triggers an automatic redeploy.

Backend proxy route, if not already added:
```js
app.post("/api/detect", async (req, res) => {
  try {
    const response = await fetch(`${process.env.AI_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "ML service unavailable" });
  }
});
```

---

## Step 4 — Deploy the frontend + admin dashboard (Vercel, free)

Repeat for each (they can be two separate Vercel projects from two repos, or
one repo with two build targets):

1. Vercel → **Add New** → **Project** → import the repo
2. Framework preset auto-detects (Vite/CRA/Next)
3. Environment variables:
   ```
   VITE_API_BASE_URL=https://coopgig-backend.onrender.com
   VITE_MAPBOX_TOKEN=pk.xxxxxxxxxxxx
   ```
4. Deploy → note the URL, e.g. `https://coopgig.vercel.app` and `https://coopgig-admin.vercel.app`

---

## Step 5 — Lock down CORS

Now that real frontend URLs exist, go back to the **backend** service on
Render → Environment → update:
```
CORS_ORIGIN=https://coopgig.vercel.app,https://coopgig-admin.vercel.app
```

Make sure this is actually wired in Express:
```js
import cors from "cors";
const allowedOrigins = process.env.CORS_ORIGIN.split(",");
app.use(cors({ origin: allowedOrigins, credentials: true }));
```

Redeploy after saving.

---

## Step 6 — Keep Render awake with UptimeRobot

Render's free tier sleeps after ~15 minutes of no traffic and takes 30–50
seconds to wake back up. This is fine indefinitely, but for demos/judging
you want it warm the whole time.

1. [uptimerobot.com](https://uptimerobot.com) → sign up free
2. **Add New Monitor** → HTTP(s) → URL: `https://coopgig-backend.onrender.com/health` → interval: 5 minutes
3. Repeat for `https://coopgig-ml.onrender.com/health`
4. Leave both running continuously — as long as they're pinged every 5
   minutes, Render never sees 15 minutes of silence and never sleeps

---

## Step 7 (optional) — Custom domain

Skip this section if `.vercel.app` / `.onrender.com` URLs are good enough for now.

1. Buy a domain (Namecheap or Google Domains) — `.in` ~₹800/year, `.com` ~₹1000/year
2. In your registrar's DNS dashboard, add:
   ```
   Type     Name      Value
   A        @         76.76.21.21              (confirm exact IP in Vercel → Domains)
   CNAME    www       cname.vercel-dns.com
   CNAME    admin     cname.vercel-dns.com
   CNAME    api       coopgig-backend.onrender.com
   CNAME    ml        coopgig-ml.onrender.com
   ```
3. In each platform's dashboard, add the matching custom domain:
   - Vercel (frontend project) → Settings → Domains → `yourdomain.in`, `www.yourdomain.in`
   - Vercel (admin project) → Settings → Domains → `admin.yourdomain.in`
   - Render (backend) → Settings → Custom Domain → `api.yourdomain.in`
   - Render (ML service) → Settings → Custom Domain → `ml.yourdomain.in`
4. SSL is issued automatically once DNS resolves (10 min–few hours)
5. Update env vars to the real domain and redeploy:
   ```
   # Backend
   CORS_ORIGIN=https://yourdomain.in,https://admin.yourdomain.in

   # Frontend + admin
   VITE_API_BASE_URL=https://api.yourdomain.in
   ```

---

## Step 8 — Verify everything

- [ ] Frontend loads, no console errors
- [ ] Admin dashboard loads, login works
- [ ] `.../health` returns `{"status":"ok"}` on both backend and ML service
- [ ] Frontend → backend requests succeed (check Network tab for CORS errors)
- [ ] Backend → ML proxy (`/api/detect`) returns a real prediction
- [ ] Map loads correctly (Mapbox token working)
- [ ] Both UptimeRobot monitors show "Up"

---

## Quick reference — all URLs in one place

Fill this in as you go:
```
Frontend:        
Admin dashboard: 
Backend:         
ML service:      
MongoDB Atlas:   (already set up)
```

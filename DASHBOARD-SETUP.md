# Staff Dashboard — one-time setup

The staff dashboard lives at **`/admin.html`** (e.g. `https://bombay-grill-lyart.vercel.app/admin.html`).
It lets staff edit prices, hide sold-out dishes, and replace photos, then **Publish** → the change
commits to GitHub and Vercel redeploys the site (live in ~1 minute).

Publishing is handled by a small serverless function at `api/publish.js`. It needs three
environment variables on Vercel. The GitHub token stays on the server and is never exposed to the browser.

## 1. Create a GitHub token
1. Go to **github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name: `bombay-grill-dashboard`. Expiration: your choice (e.g. 1 year).
3. **Resource owner:** `maisoninfuze-star`. **Repository access:** *Only select repositories* → `bombay-grill`.
4. **Permissions → Repository permissions → Contents: Read and write**. (Leave everything else off.)
5. Generate, then **copy the token** (starts with `github_pat_…`). You won't see it again.

## 2. Add the environment variables on Vercel
Vercel → the **bombay-grill** project → **Settings → Environment Variables**. Add (Production + Preview):

| Name | Value |
|------|-------|
| `GITHUB_TOKEN` | the `github_pat_…` token from step 1 |
| `ADMIN_PASSWORD` | a password you choose for staff (e.g. `Bombay2026!`) |
| `GITHUB_REPO` | `maisoninfuze-star/bombay-grill` *(optional — this is the default)* |

## 3. Redeploy
Vercel → **Deployments → ⋯ on the latest → Redeploy** (so the function picks up the new variables).

## 4. Use it
- Open `/admin.html`, sign in with `ADMIN_PASSWORD`.
- Edit prices / availability / photos, then **Publish**. Refresh the public site after ~1 minute.

---

# Live orders (cross-device) — one-time setup

The order page sends pickup orders to `api/orders.js`, and the **orders dashboard**
(`/dashboard.html`) reads them live and chimes on each new order. This needs a small
key-value store (Upstash Redis, free tier via the Vercel Marketplace).

**Until this is set up**, the order page still works: it falls back to logging the order on
that device + opening a pre-filled text to the restaurant, and the dashboard runs in
"Demo (this device)" mode. Set this up to make orders flow across devices.

## 1. Add a Redis store on Vercel
1. Vercel → the **bombay-grill** project → **Storage → Create Database → Upstash for Redis** (free "Redis" plan).
2. Connect it to the project. Vercel auto-adds the env vars (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — the function accepts either).
3. Make sure `ADMIN_PASSWORD` is set (same one as the publish dashboard) — the orders dashboard uses it to read/update orders.

## 2. Redeploy
Vercel → **Deployments → Redeploy** so the functions pick up the new variables.

## 3. Use it
- Customers place pickup orders at `/order.html` → they appear on `/dashboard.html`.
- Open `/dashboard.html` on the restaurant's tablet/phone, sign in with `ADMIN_PASSWORD`, and **keep the tab open** — a new order chimes + shows a banner. Advance each: New → Preparing → Ready → Completed.
- **Delivery** orders are sent to your **Uber Eats** page (the Delivery button opens it); those are managed in your Uber Eats dashboard, not here.

## Notes
- Only people with the password can publish or view orders; tokens/keys are never sent to the browser.
- If **Publish** returns *"Server not configured"*, the env vars aren't set (or you didn't redeploy after adding them).
- If `/api/publish` returns **404**, open Vercel → project → Settings → General and confirm the
  Framework Preset is **Other** (matches `vercel.json`); the `api/` directory is deployed as a
  Serverless Function automatically.
- Publishing many large photos at once can exceed the request limit — publish in smaller batches
  (the dashboard warns you if a batch is too big).

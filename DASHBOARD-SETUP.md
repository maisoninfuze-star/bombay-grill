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

## Notes
- Only people with the password can publish; the token is never sent to the browser.
- If **Publish** returns *"Server not configured"*, the env vars aren't set (or you didn't redeploy after adding them).
- If `/api/publish` returns **404**, open Vercel → project → Settings → General and confirm the
  Framework Preset is **Other** (matches `vercel.json`); the `api/` directory is deployed as a
  Serverless Function automatically.
- Publishing many large photos at once can exceed the request limit — publish in smaller batches
  (the dashboard warns you if a batch is too big).

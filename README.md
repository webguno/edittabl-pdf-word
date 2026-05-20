# PDF → Word Converter

A Next.js web app that converts PDF files to Word (.docx) using the iLovePDF API.
The API calls are proxied through Next.js API routes to avoid CORS issues.

## Deploy in 5 minutes

### 1. Get your iLovePDF API key
- Go to https://developer.ilovepdf.com/
- Sign up for a free account
- Create a project → copy the **Public Key**

### 2. Push to GitHub
```bash
# Create a new repo on github.com, then:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/pdf-to-word.git
git push -u origin main
```

### 3. Deploy to Vercel
- Go to https://vercel.com and sign in with GitHub
- Click **"Add New Project"**
- Import your `pdf-to-word` repository
- Click **Deploy** (no environment variables needed)
- Done! You'll get a live URL like `https://pdf-to-word-xyz.vercel.app`

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## How it works

The browser talks to `/api/*` routes on the same origin (no CORS).
Those routes proxy the requests to `api.ilovepdf.com` server-side.

```
Browser → /api/auth    → api.ilovepdf.com/v1/auth
Browser → /api/start   → api.ilovepdf.com/v1/start/pdfword
Browser → /api/upload  → {server}/v1/upload
Browser → /api/process → {server}/v1/process
Browser → /api/download → {server}/v1/download/{task}
```

## Free tier limits
iLovePDF free plan: **25 conversions/month**
Upgrade at https://developer.ilovepdf.com/pricing

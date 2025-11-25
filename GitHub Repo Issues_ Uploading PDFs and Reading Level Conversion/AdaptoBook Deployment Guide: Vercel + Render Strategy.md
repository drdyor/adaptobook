# AdaptoBook Deployment Guide: Vercel + Render Strategy

This guide provides step-by-step instructions to deploy your AdaptoBook application using **Vercel for the frontend** and **Render for the backend**.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment (Render)](#backend-deployment-render)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Environment Variables](#environment-variables)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- A GitHub account with your `adaptobook` repository
- A [Render](https://render.com) account (free tier available)
- A [Vercel](https://vercel.com) account (free tier available)
- Your Supabase credentials:
  - Database URL (with new password)
  - Supabase URL
  - Supabase Anon Key
- Your OpenRouter API key (new key)

---

## Backend Deployment (Render)

### Step 1: Prepare Your Repository

Ensure your GitHub repository has the latest code with the authentication fix committed:

```bash
git pull
git status
```

### Step 2: Create a Render Account and Connect GitHub

1. Go to [render.com](https://render.com) and sign up
2. Click **"New +"** and select **"Web Service"**
3. Select **"Deploy an existing repository"**
4. Connect your GitHub account and select `drdyor/adaptobook`

### Step 3: Configure the Web Service

In the Render dashboard, configure the following:

- **Name:** `adaptobook-backend`
- **Environment:** `Node`
- **Build Command:** `pnpm install && pnpm build`
- **Start Command:** `node dist/index.js`
- **Plan:** Free (or paid if needed)

### Step 4: Set Environment Variables

In the **Environment** section, add the following variables:

| Key | Value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Required for production |
| `DATABASE_URL` | `postgresql://postgres:YOUR_NEW_PASSWORD@db.your-project-ref.supabase.co:5432/postgres` | Replace with your new Supabase password |
| `OPENROUTER_API_KEY` | `sk-or-v1-YOUR_NEW_API_KEY` | Replace with your new OpenRouter API key |
| `JWT_SECRET` | `your-secure-random-string` | Generate a random string (e.g., `openssl rand -base64 32`) |
| `VITE_APP_TITLE` | `AdaptoBook` | Application title |
| `VITE_APP_LOGO` | `/logo.png` | Logo path |
| `VITE_ENABLE_AUTH` | `false` | Authentication disabled for now |
| `OPENROUTER_REFERER_URL` | `https://adaptobook.com` | Referer URL for OpenRouter |

### Step 5: Deploy

Click **"Create Web Service"**. Render will automatically build and deploy your backend. Once deployed, you will receive a URL like:

```
https://adaptobook-backend.onrender.com
```

**Save this URL** — you will need it for the frontend deployment.

---

## Frontend Deployment (Vercel)

### Step 1: Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **"Add New"** and select **"Project"**
3. Select **"Import Git Repository"**
4. Search for and select `drdyor/adaptobook`

### Step 2: Configure Project Settings

In the Vercel dashboard:

- **Framework Preset:** Vite
- **Root Directory:** `.` (root)
- **Build Command:** `pnpm build`
- **Output Directory:** `dist`

### Step 3: Set Environment Variables

In the **Environment Variables** section, add:

| Key | Value | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `https://adaptobook-backend.onrender.com` | Use the Render backend URL from Step 5 above |
| `VITE_APP_TITLE` | `AdaptoBook` | Application title |
| `VITE_APP_LOGO` | `/logo.png` | Logo path |
| `VITE_ENABLE_AUTH` | `false` | Authentication disabled for now |

### Step 4: Deploy

Click **"Deploy"**. Vercel will build and deploy your frontend. Once complete, you will receive a URL like:

```
https://adaptobook.vercel.app
```

This is your public application URL.

---

## Environment Variables

### Backend (Render) Required Variables

```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres:YOUR_NEW_PASSWORD@db.your-project-ref.supabase.co:5432/postgres
OPENROUTER_API_KEY=sk-or-v1-YOUR_NEW_API_KEY
JWT_SECRET=your-secure-random-string
VITE_APP_TITLE=AdaptoBook
VITE_APP_LOGO=/logo.png
VITE_ENABLE_AUTH=false
OPENROUTER_REFERER_URL=https://adaptobook.com
```

### Frontend (Vercel) Required Variables

```bash
VITE_API_URL=https://adaptobook-backend.onrender.com
VITE_APP_TITLE=AdaptoBook
VITE_APP_LOGO=/logo.png
VITE_ENABLE_AUTH=false
```

---

## Verification

### 1. Test the Backend

Once the Render deployment is complete, test the backend API:

```bash
curl https://adaptobook-backend.onrender.com/api/trpc/health
```

You should receive a successful response.

### 2. Test the Frontend

Once the Vercel deployment is complete, visit:

```
https://adaptobook.vercel.app
```

You should see the AdaptoBook application loaded in your browser.

### 3. Test PDF Upload

1. Navigate to the upload page in your frontend
2. Upload a PDF file
3. Verify that the file is processed and the reading level is displayed

---

## Troubleshooting

### Backend Deployment Issues

**Issue:** Build fails with "pnpm: command not found"

**Solution:** Ensure your `package.json` has the correct build scripts. Render should auto-detect pnpm.

**Issue:** Database connection fails

**Solution:** Verify that your `DATABASE_URL` is correct and includes the new Supabase password.

**Issue:** OpenRouter API errors

**Solution:** Verify that your `OPENROUTER_API_KEY` is correct and has not expired.

### Frontend Deployment Issues

**Issue:** Frontend cannot connect to backend

**Solution:** Verify that `VITE_API_URL` in Vercel environment variables matches your Render backend URL.

**Issue:** Build fails with "module not found"

**Solution:** Ensure all dependencies are listed in `package.json` and run `pnpm install` locally to verify.

### General Issues

**Issue:** Application works locally but not in production

**Solution:** Check the browser console (F12) for errors and compare with local development logs.

**Issue:** PDF upload not working

**Solution:** Verify that the backend is running and the `OPENROUTER_API_KEY` is valid.

---

## Next Steps

1. **Monitor Deployments:** Use Render and Vercel dashboards to monitor application health and logs.
2. **Set Up Custom Domain:** Both Render and Vercel support custom domains. Configure this in their respective dashboards.
3. **Enable Analytics:** Add analytics to track user activity and application performance.
4. **Implement Authentication:** Once the basic deployment is working, consider enabling OAuth for user authentication.

---

## Support

For issues or questions:

- **Render Support:** https://render.com/docs
- **Vercel Support:** https://vercel.com/docs
- **Supabase Support:** https://supabase.com/docs
- **OpenRouter Support:** https://openrouter.ai/docs

---

## Summary

Your AdaptoBook application is now deployed and publicly accessible. Users can visit your Vercel URL to upload PDFs, analyze reading levels, and adapt text to lower reading levels using AI.

Congratulations! 🎉

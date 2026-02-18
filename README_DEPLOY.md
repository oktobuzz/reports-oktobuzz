# 🚀 Deployment Guide: Westside Reports

This guide helps you deploy your **Backend to Railway** (Python) and **Frontend to Vercel** (React/Vite). This is the most reliable, cost-effective, and professional setup.

---

## ✅ Prerequisites (Already Done by AI)
1.  **Backend Prepared:** `requirements.txt` created, `main.py` updated for production.
2.  **Frontend Prepared:** `App.jsx` updated to use `VITE_API_URL`, `.gitignore` created to ignore junk files.
3.  **Git Initialized:** Local repository is ready.

---

## 🛠️ Step 1: Upload to GitHub
(You must do this manually as I cannot access your GitHub account).

1.  **Create a New Repository** on [GitHub](https://github.com/new). Name it `westside-reports` (Private is fine).
2.  In your VS Code Terminal (Root folder `westside reports`), run:
    ```bash
    git add .
    git commit -m "Initial Deployment Ready"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/westside-reports.git
    git push -u origin main
    ```

---

## 🚆 Step 2: Deploy Backend to Railway ($5/mo Plan)
1.  Go to [Railway Dashboard](https://railway.app/dashboard).
2.  Click **New Project** -> **Deploy from GitHub repo**.
3.  Select `westside-reports`.
4.  **Click "Add Variables"** (Optional, but good practice).
5.  **Click "Settings"** -> **"General"**:
    *   **Root Directory:** `backend`  <-- CRITICAL!
    *   **Build Command:** (Leave Blank, it auto-detects Python).
    *   **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6.  Click **Deploy**.
7.  Once deployed, go to **Settings** -> **Networking** -> **Generate Domain**.
    *   Copy this URL! (e.g., `https://backend-production.up.railway.app`).

---

## ▲ Step 3: Deploy Frontend to Vercel (Free & Fast)
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **Add New...** -> **Project**.
3.  Import `westside-reports` from GitHub.
4.  **Configure Project:**
    *   **Framework Preset:** Vite (Auto-detected).
    *   **Root Directory:** Click Edit -> Select `frontend`.
    *   **Environment Variables:**
        *   Key: `VITE_API_URL`
        *   Value: `https://backend-production.up.railway.app` (The URL from Step 2).
5.  Click **Deploy**.

---

## 🎉 Verification
1.  Open your Vercel App URL.
2.  Get a 200 OK from Backend? (Try syncing data).
3.  If Backend sleeps (Free tier behavior), wait 30-60s on first request.

**You are live!** 🌍

# 🚀 FREE Deployment Guide for PropInvest Bot

Here are the **3 best free options** to run your bot 24/7:

---

## Option 1: Render.com (Easiest - Recommended)

### Steps:

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "PropInvest Bot"
   # Create a new repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/propinvest-bot.git
   git push -u origin main
   ```

2. **Go to [render.com](https://render.com)** and sign up (free)

3. **Create a PostgreSQL Database:**
   - Click "New" → "PostgreSQL"
   - Name: `propinvest-db`
   - Plan: **Free**
   - Click "Create Database"
   - Copy the **Internal Database URL**

4. **Create a Web Service:**
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Name: `propinvest-bot`
   - Runtime: **Node**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Plan: **Free**

5. **Add Environment Variables:**
   - `DATABASE_URL` = (your Internal Database URL from step 3)
   - `TELEGRAM_BOT_TOKEN` = `8794281887:AAGfMinHxznb5n9wEn7E3LZwNR8evwAlMRw`
   - `ADMIN_TELEGRAM_ID` = `8000547764`
   - `WEBHOOK_URL` = `https://propinvest-bot.onrender.com` (your app URL)

6. **Deploy!** - Render will build and start automatically

7. **After deploy, push schema:**
   - Go to Render Shell (or use the database external URL)
   - Run: `npx drizzle-kit push`

> ⚠️ Free tier spins down after 15 min of inactivity. Set up a free cron job at [cron-job.org](https://cron-job.org) to ping `https://your-app.onrender.com/api/health` every 10 minutes to keep it alive.

---

## Option 2: Fly.io (Best Performance - Always On)

### Steps:

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   export PATH="$HOME/.fly/bin:$PATH"
   ```

2. **Sign up and login:**
   ```bash
   fly auth signup   # or fly auth login
   ```

3. **Create the app:**
   ```bash
   fly launch --no-deploy
   ```

4. **Create a free PostgreSQL database:**
   ```bash
   fly postgres create --name propinvest-db --plan shared
   fly postgres attach --app propinvest-bot propinvest-db
   ```

5. **Set secrets:**
   ```bash
   fly secrets set TELEGRAM_BOT_TOKEN=8794281887:AAGfMinHxznb5n9wEn7E3LZwNR8evwAlMRw
   fly secrets set ADMIN_TELEGRAM_ID=8000547764
   fly secrets set WEBHOOK_URL=https://propinvest-bot.fly.dev
   ```

6. **Deploy:**
   ```bash
   fly deploy
   ```

7. **Push database schema:**
   ```bash
   fly ssh console -C "npx drizzle-kit push"
   ```

> ✅ Free tier includes 3 shared VMs that stay running 24/7!

---

## Option 3: Vercel + Neon (Truly Free Forever)

### Steps:

1. **Create a Neon database (free):**
   - Go to [neon.tech](https://neon.tech)
   - Create a project
   - Copy the connection string

2. **Push code to GitHub** (same as Option 1, step 1)

3. **Deploy on Vercel (free):**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repo
   - Add Environment Variables:
     - `DATABASE_URL` = your Neon connection string
     - `TELEGRAM_BOT_TOKEN` = `8794281887:AAGfMinHxznb5n9wEn7E3LZwNR8evwAlMRw`
     - `ADMIN_TELEGRAM_ID` = `8000547764`
     - `WEBHOOK_URL` = `https://your-app.vercel.app`
   - Deploy

4. **Push database schema:**
   - Run locally: `DATABASE_URL="your-neon-url" npx drizzle-kit push`

5. **Set webhook URL:**
   - Visit: `https://your-app.vercel.app/api/bot` (this sets the webhook)

> ✅ Vercel free + Neon free = truly free forever with webhook mode!

---

## Quick Commands After Deploy

| Command | Description |
|---------|-------------|
| `/start` | Register and get your referral link |
| `/menu` | Show main menu |
| `/admin` | Admin control panel (only for your ID) |
| `/help` | Help and support |

## Bot Features

- **3 Investment Plans** (Starter/Pro/Elite)
- **Wallet System** (deposit/withdraw via crypto)
- **10% Referral Commission** on every referred investment
- **50% Profit Sharing** from prop firm accounts
- **Full Admin Panel** (manage everything from Telegram)
- **Broadcast Messages** to all users
- **User Management** (ban/unban, balance adjustment)

---

**Recommended:** Option 1 (Render) for simplicity, Option 3 (Vercel+Neon) for truly free forever.

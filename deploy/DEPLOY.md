# Smart Lekka — DigitalOcean Deployment Guide

## Requirements

- DigitalOcean Droplet: **Ubuntu 22.04 LTS**, minimum **2 GB RAM / 1 vCPU** (4 GB recommended)
- Docker + Docker Compose installed on the droplet

---

## Step 1 — Create the Droplet

1. Log in to DigitalOcean → **Create → Droplets**
2. Choose **Ubuntu 22.04 (LTS) x64**
3. Select size: **Basic, 2 GB RAM / 1 vCPU / 50 GB SSD** (or larger)
4. Add your SSH key
5. Click **Create Droplet**

---

## Step 2 — Install Docker on the Droplet

SSH into the droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install -y docker-compose-plugin
```

Verify:
```bash
docker --version
docker compose version
```

---

## Step 3 — Upload the Project

From your **local machine**, upload the project zip:
```bash
scp smart-lekka-deploy.zip root@YOUR_DROPLET_IP:/opt/
```

On the droplet, unzip it:
```bash
cd /opt
apt-get install -y unzip
unzip smart-lekka-deploy.zip -d smart-lekka
cd smart-lekka
```

---

## Step 4 — Configure Environment Variables

Copy the example env file and fill in your values:
```bash
cp .env.example .env
nano .env
```

Set these required values:
```
POSTGRES_PASSWORD=<a strong random password>
JWT_SECRET=<a long random string, 40+ characters>
```

Generate a random JWT secret:
```bash
openssl rand -hex 32
```

---

## Step 5 — Build and Start

```bash
docker compose up -d --build
```

This will:
1. Pull the PostgreSQL 16 image
2. Build the Smart Lekka app image (installs deps, builds frontend + API)
3. Create the database schema automatically
4. Start everything

Watch the logs:
```bash
docker compose logs -f
```

---

## Step 6 — Verify It's Running

```bash
curl http://localhost/api/healthz
```

Expected: `{"status":"ok"}`

Open in browser: `http://YOUR_DROPLET_IP`

---

## Default Login Credentials

| Role       | Mobile / JCB No. | Password  |
|------------|-----------------|-----------|
| Admin      | 9999999999      | admin123  |
| Supervisor | 9988776655      | super123  |
| JCB-001    | JCB001          | jcb123    |
| JCB-002    | JCB002          | jcb456    |

**Change these passwords immediately after first login via the Admin panel.**

---

## Optional: Set Up a Domain with SSL

### Point your domain to the droplet
Add an **A record** in your DNS pointing to the droplet IP.

### Install Certbot for HTTPS
```bash
apt-get install -y certbot
docker compose stop
certbot certonly --standalone -d yourdomain.com
```

Update `deploy/nginx.conf` to add the SSL server block, then rebuild:
```bash
docker compose up -d --build
```

---

## Useful Commands

| Task | Command |
|------|---------|
| View logs | `docker compose logs -f` |
| Restart app | `docker compose restart app` |
| Stop everything | `docker compose down` |
| Stop + delete data | `docker compose down -v` ⚠️ |
| Rebuild after update | `docker compose up -d --build` |
| Access PostgreSQL | `docker compose exec db psql -U smartlekka smartlekka` |
| Backup database | `docker compose exec db pg_dump -U smartlekka smartlekka > backup.sql` |

---

## Updating the App

1. Upload the new zip to the server
2. Unzip over the existing folder
3. Run: `docker compose up -d --build`

---

## Database Backup (Recommended)

Set up a daily cron backup:
```bash
crontab -e
```
Add:
```
0 2 * * * cd /opt/smart-lekka && docker compose exec -T db pg_dump -U smartlekka smartlekka > /opt/backups/smartlekka-$(date +\%Y\%m\%d).sql
```

Create the backup folder:
```bash
mkdir -p /opt/backups
```

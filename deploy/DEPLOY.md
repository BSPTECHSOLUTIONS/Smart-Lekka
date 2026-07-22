# Smart Lekka — DigitalOcean Deployment Guide

## Requirements

- DigitalOcean Droplet: **Ubuntu 22.04 LTS**, minimum **2 GB RAM / 1 vCPU** (4 GB recommended)
- Docker + Docker Compose installed on the droplet

---

## Already have a droplet with other apps running on it? Read this first.

If this droplet already runs other sites/apps, the only real risk is **port
80/443 conflicts** — container names, the database, and its volume are
already namespaced under `smart-lekka` so they can't collide with unrelated
projects.

**1. Check what's already using ports 80 and 443:**
```bash
sudo ss -tlnp | grep -E ':80 |:443 '
```
If you see `nginx`, `apache2`, or another process bound to `0.0.0.0:80`,
something is already the "front door" for this droplet — Smart Lekka must
run on its own internal port instead (this project defaults to **8081**).

**2. Check what's already running in Docker:**
```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

**3. Decide how Smart Lekka will be reached** — either add a subdomain to
your existing host reverse proxy pointing at `127.0.0.1:8081` (recommended),
or access it directly at `http://YOUR_DROPLET_IP:8081` for now. Either way,
**do not change the port mapping to `80:80`** if anything else already owns
that port.

---

## Step 1 — Create the Droplet *(skip if adding this to an existing droplet)*

1. Log in to DigitalOcean → **Create → Droplets**
2. Choose **Ubuntu 22.04 (LTS) x64**
3. Select size: **Basic, 2 GB RAM / 1 vCPU / 50 GB SSD** (or larger)
4. Add your SSH key
5. Click **Create Droplet**

---

## Step 2 — Install Docker *(skip if already installed — check `docker --version`)*

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
scp smart-lekka-deploy-final.zip root@YOUR_DROPLET_IP:/opt/
```

On the droplet, unzip it **into its own folder** — this keeps it completely
separate from any other apps' files:
```bash
cd /opt
apt-get install -y unzip
unzip smart-lekka-deploy-final.zip -d smart-lekka
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

If port `8081` is already used by something else on this droplet (check with
`sudo ss -tlnp | grep 8081`), change it in `.env`:
```
APP_PORT=8082
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
curl http://localhost:8081/api/healthz
```
(replace `8081` with whatever you set `APP_PORT` to)

Expected: `{"status":"ok"}`

Open in browser: `http://YOUR_DROPLET_IP:8081`

**If this is a shared droplet, confirm your other apps are unaffected:**
```bash
curl -I http://localhost   # or however your other apps normally respond
docker ps                  # all containers, old and new, should show "Up"
```

---

## Default Login Credentials

| Role       | Mobile / Vehicle No. | Password  |
|------------|-----------------|-----------|
| Admin      | 9999999999      | admin123  |
| Supervisor | 9988776655      | super123  |
| Vehicle-001 (JCB-001) | JCB001          | jcb123    |
| Vehicle-002 (JCB-002) | JCB002          | jcb456    |

**Change these passwords immediately after first login via the Admin panel.**

---

## Optional: Set Up a Domain with SSL

### If this is the only app on the droplet
Point a domain's **A record** at the droplet IP, stop the compose stack,
get a cert with the standalone method, then rebuild:
```bash
apt-get install -y certbot
docker compose stop
certbot certonly --standalone -d yourdomain.com
docker compose up -d --build
```

### If other apps already have a host-level nginx/Caddy managing SSL
**Don't touch their config or certs.** Add Smart Lekka as one more site,
pointing at its internal port (`127.0.0.1:8081` by default):
```nginx
server {
    listen 80;
    server_name smartlekka.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Then add an A record for that subdomain and:
```bash
certbot --nginx -d smartlekka.yourdomain.com
```
Your other apps keep running the entire time — none of their containers,
configs, or certs are touched.

---

## Useful Commands

> Run these from inside the `smart-lekka` project folder — `docker compose`
> only ever acts on the containers defined in *this* folder's
> `docker-compose.yml` (`smart-lekka-db`, `smart-lekka-app`), so it will
> never touch other apps' containers even if you run `docker compose down -v`.

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

> **Upgrading an existing installation?** `schema.sql` only runs automatically
> on a brand-new database. If this update added new columns/indexes, apply
> them to an already-running database by hand:
> ```bash
> docker compose exec -T db psql -U smartlekka smartlekka < deploy/schema.sql
> ```
> Every statement uses `IF NOT EXISTS`, so it's safe to re-run — it only adds
> what's missing.

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

# Smart Lekka — DigitalOcean Deployment Guide

## Requirements

- DigitalOcean Droplet: **Ubuntu 22.04 LTS**, minimum **2 GB RAM / 1 vCPU** (4 GB recommended)
- Docker + Docker Compose installed on the droplet

---

## Already have a droplet with other apps running on it? Read this first.

If this droplet already runs other sites/apps, the only real risk is **port
80/443 conflicts** — everything else in this project (container names,
database, Docker volume) is already namespaced under `smart-lekka` so it
can't collide with unrelated projects.

**1. Check what's already using ports 80 and 443:**
```bash
sudo ss -tlnp | grep -E ':80 |:443 '
```
If you see `nginx`, `apache2`, or another `docker-proxy` process bound to
`0.0.0.0:80`, that means something is already the "front door" for this
droplet — you cannot also bind Smart Lekka's container to port 80.

**2. Check what's already running in Docker (if your other 2 products are containerized):**
```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```
Note the container/volume names and ports in use so you know they won't clash.

**3. Decide how Smart Lekka will be reached.** Two common setups:

- **You have spare subdomains** (e.g. `smartlekka.yourdomain.com`) and the
  other two products already sit behind a host-level nginx/Caddy reverse
  proxy — this is the recommended path. Smart Lekka runs on an internal-only
  port (e.g. `8081`), and you add one more server block to your *existing*
  reverse proxy that forwards `smartlekka.yourdomain.com` → `127.0.0.1:8081`.
  Nothing about your other two apps changes.
- **You just want IP:port access for now** (no domain yet) — Smart Lekka
  runs on `http://YOUR_DROPLET_IP:8081` directly, no reverse proxy needed.
  You can add the domain/SSL step later without touching your other apps.

Either way, **do not change the port mapping to `80:80`** on a shared
droplet. This project already defaults to port **8081** for exactly this
reason (`APP_PORT` in `.env`) — change it to any other free port if `8081`
is also taken.

---

## Step 1 — Create the Droplet *(skip if you're adding this to an existing droplet)*

1. Log in to DigitalOcean → **Create → Droplets**
2. Choose **Ubuntu 22.04 (LTS) x64**
3. Select size: **Basic, 2 GB RAM / 1 vCPU / 50 GB SSD** (or larger)
4. Add your SSH key
5. Click **Create Droplet**

---

## Step 2 — Install Docker *(skip if Docker is already installed — check with `docker --version`)*

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
separate from your other two apps' files/folders:
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

**Confirm your other two apps are unaffected:**
```bash
curl -I http://localhost   # or whatever port/domain they normally answer on
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
get a cert with the standalone method, then add an SSL server block to
`deploy/nginx.conf` and rebuild:
```bash
apt-get install -y certbot
docker compose stop
certbot certonly --standalone -d yourdomain.com
docker compose up -d --build
```

### If your other two apps already have a host-level nginx/Caddy managing SSL
**Don't touch their config or certs.** Just add Smart Lekka as one more site:

1. Make sure Smart Lekka is reachable on its internal port, e.g. `127.0.0.1:8081`
   (this is already the default — see the pre-flight section above).
2. Add a **new** server block to your existing reverse proxy (don't edit the
   blocks for your other two products), for example with host nginx:
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
3. Add an **A record** for `smartlekka.yourdomain.com` pointing at the droplet IP.
4. Get a cert for just the new subdomain (this does not touch existing certs):
   ```bash
   certbot --nginx -d smartlekka.yourdomain.com
   ```
5. Reload your host reverse proxy: `nginx -t && systemctl reload nginx`

Your other two products keep running the entire time — none of their
containers, configs, or certs are touched.

---

## Useful Commands

> Run these from inside `/opt/smart-lekka` — `docker compose` only ever acts
> on the containers defined in *this* folder's `docker-compose.yml`
> (`smart-lekka-db`, `smart-lekka-app`), so it will never touch your other
> two products' containers even if you run `docker compose down -v` here.

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
> on a brand-new database. If you're updating a server that's already running
> (and this update added new indexes), apply them once by hand:
> ```bash
> docker compose exec -T db psql -U smartlekka smartlekka < deploy/schema.sql
> ```
> `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` make this safe
> to re-run — it will only add what's missing.

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

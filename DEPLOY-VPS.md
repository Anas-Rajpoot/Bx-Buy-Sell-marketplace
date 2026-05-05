# VPS deploy — no Docker, HTTP only, access by IP

**Repo:** [github.com/Anas-Rajpoot/Bx-Buy-Sell-marketplace](https://github.com/Anas-Rajpoot/Bx-Buy-Sell-marketplace.git)  
**Server:** Ubuntu **22.04 LTS** (default below). Ubuntu **24.04** → see [Ubuntu 24.04 — MongoDB line only](#ubuntu-2404--mongodb-line-only).

**When you are done**

| Service | Address |
|--------|---------|
| Website | `http://YOUR_IP` |
| API | `http://YOUR_IP:5000` |
| Health check | `http://YOUR_IP:5000/health` |

Replace **`YOUR_IP`** with your VPS public IPv4 everywhere (or set `export VPS_IP=...` once in [Script 0](#script-0-set-your-ip)).  
For your server, use: **`213.199.32.255`**.

---

## Before you connect

1. Hosting panel: note the server **IPv4**.
2. SSH: PuTTY → Host = that IP, Port **22** → Open → log in as **root** (or a user with `sudo`).
3. In this file: when you copy a command block, copy **only the lines inside the gray box**, not the ``` lines above/below.

---

## Quick Start (exact commands only)

If you do not want long explanation, run these exact blocks in PuTTY, one by one.

### 1) Set your IP

```bash
export VPS_IP="YOUR_REAL_SERVER_IP"
```

### 2) Install system packages + services

```bash
apt update && apt upgrade -y
apt install -y curl git nginx build-essential ca-certificates gnupg redis-server
systemctl enable nginx --now
systemctl enable redis-server --now
```

### 3) Install MongoDB (Ubuntu 22.04)

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl enable mongod --now
```

### 4) Install Node + PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
```

### 5) Clone project

```bash
mkdir -p /var/www/exbuysell
cd /var/www/exbuysell
git clone https://github.com/Anas-Rajpoot/Bx-Buy-Sell-marketplace.git Bx-Buy-Sell-marketplace
```

### 6) Backend setup

```bash
cd /var/www/exbuysell/Bx-Buy-Sell-marketplace/Backend
npm ci
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=mongodb://127.0.0.1:27017/ex-buy-sell-db
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
REDIS_HOST=127.0.0.1:6379
FRONTEND_URL=http://${VPS_IP}
SENDGRID_API_KEY=
EMAIL_SERVICE_FROM=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RABBIT_MQ_ENABLED=false
RABBIT_MQ=localhost:5672
RABBIT_MQ_USER=admin
RABBIT_MQ_PASS=admin
EOF
npx prisma generate
npx prisma db push
npm run build
pm2 start npm --name exbuysell-api --cwd /var/www/exbuysell/Bx-Buy-Sell-marketplace/Backend -- run start:prod
pm2 save
pm2 startup
```

Run the printed `sudo env PATH=...` command after `pm2 startup`.

### 7) Frontend setup

Run this exact block:

```bash
cd /var/www/exbuysell/Bx-Buy-Sell-marketplace/frontend
cp .env.example .env.production
sed -i "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://213.199.32.255:5000|" .env.production
sed -i "s|^VITE_WS_URL=.*|VITE_WS_URL=http://213.199.32.255:5000|" .env.production
npm ci
npm run build
```

If your server IP changes later, update both URLs in `.env.production` and run `npm run build` again.

### 8) Nginx config

```bash
cat > /etc/nginx/sites-available/exbuysell << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/exbuysell/Bx-Buy-Sell-marketplace/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/exbuysell /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 9) Test

```bash
curl -s http://127.0.0.1:5000/health
```

Open in browser: `http://YOUR_REAL_SERVER_IP`

---

## Script 0 — Set your IP

Paste once at the start (edit the IP):

```bash
export VPS_IP="213.199.32.255"
export GIT_URL="https://github.com/Anas-Rajpoot/Bx-Buy-Sell-marketplace.git"
```

Fork? Change `GIT_URL` to your repo URL.

---

## Script 1 — Update Ubuntu

```bash
apt update && apt upgrade -y
```

---

## Script 2 — nginx, Git, compilers

```bash
apt install -y curl git nginx build-essential ca-certificates gnupg
systemctl enable nginx --now
```

---

## Script 3 — MongoDB (Ubuntu 22.04 jammy)

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl enable mongod --now
mongosh --eval "db.runCommand({ ping: 1 })"
```

---

## Script 4 — Redis

```bash
apt install -y redis-server
systemctl enable redis-server --now
redis-cli ping
```

Expected: `PONG`.

---

## Optional — Install RabbitMQ (only if you will set `RABBIT_MQ_ENABLED=true`)

If you keep `RABBIT_MQ_ENABLED=false`, skip this section.

```bash
apt install -y rabbitmq-server
systemctl enable rabbitmq-server --now
rabbitmqctl status
```

Create the same credentials used in `.env` (`admin` / `admin`):

```bash
rabbitmqctl add_user admin admin 2>/dev/null || true
rabbitmqctl set_user_tags admin administrator
rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"
```

Default `.env` values in this guide use:

```env
RABBIT_MQ=localhost:5672
RABBIT_MQ_USER=admin
RABBIT_MQ_PASS=admin
```

If your RabbitMQ user/password are different, update `.env` accordingly.

---

## Script 5 — Node.js + PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
node -v
```

---

## Script 6 — Clone project

Uses `GIT_URL` from Script 0.

```bash
mkdir -p /var/www/exbuysell
cd /var/www/exbuysell
git clone "$GIT_URL" Bx-Buy-Sell-marketplace
cd Bx-Buy-Sell-marketplace
ls Backend/package.json frontend/package.json
```

---

## Script 7 — Backend: install, `.env`, database, build

Uses `VPS_IP` from Script 0.

```bash
cd /var/www/exbuysell/Bx-Buy-Sell-marketplace/Backend
npm ci
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
cat > .env << EOF
NODE_ENV=production
DATABASE_URL=mongodb://127.0.0.1:27017/ex-buy-sell-db
PORT=5000
DEFAULT_ROLE=USER
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
RABBIT_MQ=localhost:5672
REDIS_HOST=127.0.0.1:6379
SENDGRID_API_KEY=
EMAIL_SERVICE_FROM=
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
RABBIT_MQ_USER=admin
RABBIT_MQ_PASS=admin

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=whsec_placeholder

# Subscription Settings
SUBSCRIPTION_TRIAL_DAYS=14
SUBSCRIPTION_GRACE_PERIOD_DAYS=3
FRONTEND_URL=http://${VPS_IP}
EOF
npx prisma generate
npx prisma db push
npm run build
test -f dist/src/main.js && echo "OK: backend built"
mkdir -p uploads
```

**Using MongoDB Atlas instead of local MongoDB:** edit `.env` and set `DATABASE_URL` to your Atlas URI (`nano .env`), then run `npx prisma db push` and `npm run build` again.

---

## Script 8 — Run API with PM2

```bash
cd /var/www/exbuysell/Bx-Buy-Sell-marketplace/Backend
pm2 delete exbuysell-api 2>/dev/null || true
pm2 start npm --name exbuysell-api --cwd /var/www/exbuysell/Bx-Buy-Sell-marketplace/Backend -- run start:prod
pm2 save
pm2 startup
```

Terminal will print one line starting with `sudo env PATH=`. **Copy that full line, paste, Enter.**

Check:

```bash
curl -s http://127.0.0.1:5000/health
```

You should see `"ok": true`.

Logs: `pm2 logs exbuysell-api`

---

## Script 9 — Frontend build

```bash
cd /var/www/exbuysell/Bx-Buy-Sell-marketplace/frontend
cp .env.example .env.production
sed -i "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://${VPS_IP}:5000|" .env.production
sed -i "s|^VITE_WS_URL=.*|VITE_WS_URL=http://${VPS_IP}:5000|" .env.production
npm ci
npm run build
test -f dist/index.html && echo "OK: frontend built"
```

If you use Supabase, run `nano .env.production`, fill `VITE_SUPABASE_*`, then `npm run build` again.

---

## Script 10 — Nginx (website on port 80)

```bash
cat > /etc/nginx/sites-available/exbuysell << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/exbuysell/Bx-Buy-Sell-marketplace/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;
}
EOF
ln -sf /etc/nginx/sites-available/exbuysell /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

If the site shows **403 Forbidden**:

```bash
chmod -R o+rX /var/www/exbuysell/Bx-Buy-Sell-marketplace/frontend/dist
systemctl reload nginx
```

---

## Script 11 — Quick checks on the server

```bash
curl -s http://127.0.0.1:5000/health
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/
echo " (want 200)"
```

On your PC browser: open `http://YOUR_IP` (same IP as `VPS_IP`).

---

## Publish updates after `git push`

```bash
cd /var/www/exbuysell/Bx-Buy-Sell-marketplace
git pull
cd Backend && npm ci && npx prisma generate && npx prisma db push && npm run build && pm2 restart exbuysell-api
cd ../frontend && npm ci && npm run build
nginx -t && systemctl reload nginx
```

---

## Ubuntu 24.04 — MongoDB line only

In Script 3, **replace** the `echo "deb … jammy …"` line with:

```bash
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

Then continue from `apt update` in that script.

---

## Ports blocked?

Some hosts block traffic until you open ports.

- **Cloud panel:** allow inbound **TCP 22**, **80**, **5000**.
- **Ubuntu ufw** (optional):

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 5000/tcp && ufw enable
```

Do **not** expose MongoDB (**27017**) or Redis (**6379**) to the internet.

---

## Later: domain + HTTPS

1. DNS **A** record → server IP.  
2. Nginx `server_name yourdomain.com;`  
3. `apt install -y python3-certbot-nginx` → get certificates.  
4. Rebuild frontend with `https://…` in `VITE_API_BASE_URL` and `VITE_WS_URL`.

---

## Private repo (SSH clone)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Add the key as a deploy key on GitHub. Then:

```bash
export GIT_URL="git@github.com:Anas-Rajpoot/Bx-Buy-Sell-marketplace.git"
```

Run Script 6 again (remove old folder first if needed: `rm -rf /var/www/exbuysell/Bx-Buy-Sell-marketplace`).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm` **Killed** | Add swap (Script 5). |
| Blank website | Run Script 9 again; check nginx `root` path; `chmod o+rX` on `dist`. |
| API works locally, not from browser | Open port **5000** at provider; rebuild frontend if IP changed. |
| PM2 exits | `pm2 logs exbuysell-api`; check `Backend/.env` and `dist/src/main.js`. |
| Prisma errors | `DATABASE_URL`; Mongo running (`systemctl status mongod`) or Atlas IP allowlist. |

**Technical:** API is `npm run start:prod` → `node dist/src/main.js`. Frontend reads `VITE_API_BASE_URL` and `VITE_WS_URL` at build time (`frontend/.env.example`).

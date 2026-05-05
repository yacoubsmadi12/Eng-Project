# Z Route Master — دليل النشر على Ubuntu Server

## الطريقة 1: بدون Docker (Node.js + Nginx + PostgreSQL)

### المتطلبات
```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx
```

### 1. إعداد قاعدة البيانات
```bash
sudo -u postgres psql
```
داخل psql:
```sql
CREATE DATABASE zroute;
CREATE USER zroute_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE zroute TO zroute_user;
\q
```
ثم نفّذ سكريبت إنشاء الجداول:
```bash
sudo -u postgres psql -d zroute -f /path/to/deploy/setup.sql
```

### 2. استنساخ المشروع وتثبيت الحزم
```bash
git clone <your-repo-url> /opt/zroute
cd /opt/zroute
pnpm install --frozen-lockfile
```

### 3. ملف البيئة
```bash
cp deploy/.env.example /opt/zroute/.env
nano /opt/zroute/.env
```
عدّل:
```
DATABASE_URL=postgresql://zroute_user:YOUR_STRONG_PASSWORD@localhost:5432/zroute
SESSION_SECRET=<سلسلة عشوائية طويلة 64 حرف على الأقل>
PORT=8080
```

### 4. بناء الـ API
```bash
cd /opt/zroute
pnpm --filter @workspace/api-server run build
```

### 5. بناء الـ Frontend
```bash
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/zroute run build
# الملفات الجاهزة في: artifacts/zroute/dist/public/
sudo cp -r artifacts/zroute/dist/public /var/www/zroute
```

### 6. إعداد systemd للـ API
```bash
sudo nano /etc/systemd/system/zroute-api.service
```
الملف:
```ini
[Unit]
Description=Z Route Master API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/zroute/artifacts/api-server
EnvironmentFile=/opt/zroute/.env
ExecStart=/usr/bin/node --enable-source-maps ./dist/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable zroute-api
sudo systemctl start zroute-api
sudo systemctl status zroute-api
```

### 7. إعداد Nginx
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/zroute
sudo ln -s /etc/nginx/sites-available/zroute /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
> عدّل `server_name` في الملف بدومينك أو IP السيرفر.

---

## الطريقة 2: Docker Compose (الأسرع)

### المتطلبات
```bash
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

### التشغيل
```bash
cd /opt/zroute
export DB_PASSWORD=YOUR_STRONG_PASSWORD
export SESSION_SECRET=YOUR_LONG_SECRET
docker compose -f deploy/docker-compose.yml up -d
```
التطبيق يعمل على:
- Frontend: http://YOUR_SERVER_IP:3000
- API:      http://YOUR_SERVER_IP:8080

---

## بيانات الدخول الافتراضية
| الحقل | القيمة |
|---|---|
| Username | `Adm.Zain` |
| Password | `Zain@1202` |

**غيّر كلمة المرور فور تسجيل الدخول الأول!**

---

## هيكل الصلاحيات

| الدور | صلاحياته |
|---|---|
| **admin** | كل شيء: رفع المواقع، إدارة المستخدمين، توليد الخطط وحفظها |
| **user** | توليد خطط New Sites وحفظها (يرى خططه فقط) |
| **viewer** | يرى جميع الخطط + يصدّر Excel (لا يحفظ) |

---

## استيراد بيانات المواقع (Sites)
1. سجّل دخول بحساب Admin
2. اذهب لـ Admin Panel → Data Management
3. ارفع ملف JSON للمواقع
4. تظهر المواقع لجميع المستخدمين فوراً

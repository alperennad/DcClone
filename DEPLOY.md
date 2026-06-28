# 🚀 Dokploy Deployment Guide

Bu proje tek Dockerfile ile çalışır. Tüm uygulama (frontend + backend) tek container içinde.

## 📋 Özellikler

- ✅ **Tek Container**: Frontend build edilir, backend ile birlikte serve edilir
- ✅ **SQLite**: Harici database gerekmez (isteğe bağlı PostgreSQL)
- ✅ **Otomatik Migration**: İlk çalıştırmada tablolar oluşturulur
- ✅ **Default Kanallar**: general, random, announcements + 3 ses kanalı

## 🚀 Dokploy'da Deploy Etme

### 1. GitHub'a Push Et

```bash
git add .
git commit -m "Dokploy deployment"
git push origin main
```

### 2. Dokploy Panel'de

1. **Yeni Proje** oluştur
2. **Create Service** → **Dockerfile**
3. **Git Provider** → GitHub'ı seç ve repo'yu bağla
4. **Dockerfile Path**: `Dockerfile` (root dizinde)
5. **Port**: `8000`

### 3. Environment Variables Ekle

Dokploy → Service → **Environment** sekmesi:

```env
SECRET_KEY=buraya-32-karakterlik-guclu-bir-key-yaz
ALLOWED_ORIGINS=https://senin-domainin.com
ENVIRONMENT=production
```

> 💡 **SECRET_KEY oluşturma**: `openssl rand -base64 32`

### 4. Domain Ekle

1. **Domains** sekmesine git
2. **Add Domain**:
   - Domain: `discord.seninsiten.com`
   - Port: `8000`
   - HTTPS: ✅ Enable

### 5. Deploy Et! 🎉

**Deploy** butonuna tıkla ve logları izle.

---

## 🔧 Yerel Test (Docker Desktop)

```bash
# Image build et
docker build -t discord-clone .

# Çalıştır
docker run -p 8000:8000 -e SECRET_KEY=test-key discord-clone

# Aç: http://localhost:8000
```

---

## 📁 Proje Yapısı (Deploy için)

```
DC-Clone/
├── Dockerfile              # 🔥 Tek deploy dosyası
├── backend/               # Python FastAPI
│   ├── app/
│   ├── requirements.txt
│   └── ...
└── frontend/              # React + Vite
    ├── src/
    ├── package.json
    └── ...
```

---

## ⚙️ Gelişmiş Ayarlar

### PostgreSQL Kullanmak İstersen

Dokploy'da aynı projeye Database ekle:

```
Create Service → Database → PostgreSQL
Name: discord-db
Database: discord_clone
```

Sonra Environment'a ekle:
```env
DATABASE_URL=postgresql+asyncpg://postgres:SIFRE@discord-db:5432/discord_clone
```

### Redis Kullanmak İstersen

```
Create Service → Database → Redis
Name: discord-redis
```

Environment:
```env
REDIS_URL=redis://discord-redis:6379/0
```

---

## 🔍 Sorun Giderme

### Container başlamıyor?

```bash
# Logları kontrol et
docker logs <container-id>

# Veya Dokploy panel'de Logs sekmesi
```

### SQLite permission hatası?

SQLite varsayılan olarak `/app/backend` içinde çalışır. Sorun olursa:

```dockerfile
# Dockerfile'a ekle
RUN mkdir -p /data && chmod 777 /data
ENV DATABASE_URL=sqlite:////data/discord_clone.db
```

### Frontend görünmüyor?

Build loglarında hata olup olmadığını kontrol et:
```bash
docker build -t test . 2>&1 | tee build.log
```

---

## 📱 Kullanım

1. Deploy tamamlandıktan sonra domain'i aç
2. **Register** ile hesap oluştur
3. **Login** yap
4. Kanallara katıl, mesajlaş, sesli sohbet et! 🎤

---

## 🔗 API Endpoint'leri

| Endpoint | Açıklama |
|----------|----------|
| `GET /docs` | Swagger API dokümantasyonu |
| `POST /api/v1/auth/register` | Kayıt ol |
| `POST /api/v1/auth/login` | Giriş yap |
| `GET /api/v1/channels/` | Kanal listesi |
| `WS /ws` | WebSocket (real-time mesajlar) |

---

Başarılar! 🚀

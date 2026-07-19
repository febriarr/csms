# Cold Storage Monitoring System

Sistem monitoring cold storage berbasis web yang dirancang untuk memantau suhu penyimpanan secara **real-time**. Aplikasi ini menerima data suhu dari perangkat monitoring, menyimpan riwayat data ke PostgreSQL, menampilkan visualisasi suhu, serta memberikan notifikasi ketika suhu melewati batas yang telah ditentukan.

> 🚧 Project ini masih dalam tahap pengembangan.

---

## 🎯 Tujuan

Project ini dikembangkan sebagai bagian dari inisiatif **Continuous Improvement (CI)** di divisi **Warehouse** dengan tujuan meningkatkan proses monitoring suhu cold storage yang sebelumnya masih dilakukan secara manual.

Beberapa tujuan utama dari project ini antara lain:

- Mengurangi proses pencatatan suhu secara manual.
- Menyediakan monitoring suhu secara **real-time**.
- Menampilkan riwayat suhu dalam bentuk grafik dan laporan.
- Memberikan peringatan dini (alert) ketika suhu berada di luar batas yang ditentukan.
- Membantu proses analisis apabila terjadi penyimpangan suhu pada cold storage.
- Menjadi salah satu inovasi yang dapat diikutsertakan dalam kompetisi **Continuous Improvement (CI)** di lingkungan perusahaan.
- Merancang sistem yang fleksibel sehingga dapat diadaptasi dan dikembangkan untuk digunakan oleh **entitas, cabang, maupun unit bisnis lain** yang memiliki kebutuhan monitoring serupa.

---

## ✨ Fitur

- Monitoring suhu secara real-time
- Manajemen perangkat (Device Management)
- Pencatatan histori suhu
- Visualisasi data menggunakan Chart.js
- Realtime Dashboard menggunakan Server-Sent Events (SSE)
- Sistem alert ketika suhu melewati batas aman
- Deteksi perangkat offline
- Manajemen pengguna
- Authentication & Authorization
- Audit Log
- Notifikasi (Email & WhatsApp)

---

## 🛠️ Teknologi yang Digunakan

### Backend

- Express.js
- TypeScript
- PostgreSQL
- Drizzle ORM
- Node PostgreSQL (pg)

### Frontend

- EJS
- Vanilla JavaScript
- Custom CSS
- Chart.js

---

## 📂 Struktur Project

```text
src/
├── config/
├── controllers/
├── database/
│   ├── client.ts
│   ├── index.ts
│   ├── schema/
│   └── types.ts
├── middleware/
├── repositories/
├── routes/
├── services/
├── types/
├── utils/
├── views/
├── app.ts
└── server.ts
```

---

## 🚀 Instalasi

### Clone Repository

```bash
git clone https://github.com/username/cold-storage-monitoring-system.git

cd cold-storage-monitoring-system
```

### Install Dependencies

```bash
npm install
```

### Konfigurasi Environment

Buat file `.env` pada root project.

```env
APP_NAME=CI-CSMS

NODE_ENV=development

PORT=3000

DATABASE_URL=postgres://postgres:password@localhost:5432/ci_csms
```

---

## ▶️ Menjalankan Project

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

---

## 🗄️ Database

Generate migration

```bash
npm run db:generate
```

Menjalankan migration

```bash
npm run db:migrate
```

Push schema ke database

```bash
npm run db:push
```

Membuka Drizzle Studio

```bash
npm run db:studio
```

---

## 📌 Roadmap

### Fondasi Project

- [x] Setup Express.js
- [x] Setup TypeScript
- [x] Environment Configuration
- [x] PostgreSQL Connection
- [x] Drizzle ORM
- [x] Database Configuration

### Database

- [x] Konvensi Database
- [ ] Schema User
- [x] Schema Device
- [x] Schema Temperature Log
- [x] Schema Alert
- [x] Schema Notification
- [ ] Relasi Antar Tabel
- [ ] Seeder

### Backend

- [ ] Repository Pattern
- [ ] Service Layer
- [ ] Request Validation
- [ ] Error Handling
- [ ] Logging
- [ ] Authentication
- [ ] Authorization

### Monitoring

- [ ] CRUD Device
- [ ] Penerimaan Data Suhu
- [ ] Riwayat Suhu
- [ ] Alert Engine
- [ ] Deteksi Device Offline

### Realtime

- [ ] Server-Sent Events (SSE)
- [ ] Dashboard Real-time
- [ ] Grafik Monitoring

### Notifikasi

- [ ] Email Notification
- [ ] WhatsApp Notification

### Deployment

- [ ] Docker
- [ ] PM2
- [ ] Nginx
- [ ] Deployment Production

---

## 📖 Lisensi

Project ini menggunakan lisensi **MIT License**.

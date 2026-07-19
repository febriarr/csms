# 📚 CI-CSMS Documentation

Selamat datang di dokumentasi **CI-CSMS (Cold Storage Monitoring System)**.

Dokumentasi ini menjelaskan seluruh proses perancangan sistem, mulai dari arsitektur, domain model, desain database, hingga implementasi Rule Engine.

Project ini dibangun bukan hanya sebagai aplikasi monitoring suhu, tetapi juga sebagai contoh implementasi backend modern menggunakan **Express.js**, **TypeScript**, **Drizzle ORM**, dan **PostgreSQL** dengan pendekatan **Domain-Oriented Design**.

---

# 📖 Documentation Index

## 1. Introduction

| Document                           | Description                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------- |
| [01-overview.md](./01-overview.md) | Gambaran umum sistem, tujuan, prinsip desain, dan teknologi yang digunakan. |

---

## 2. Architecture

| Document                                   | Description                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| [02-architecture.md](./02-architecture.md) | Arsitektur aplikasi, pembagian layer, dependency flow, dan komponen utama. |

---

## 3. Domain

| Document                                   | Description                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| [03-domain-model.md](./03-domain-model.md) | Penjelasan seluruh domain, entity, business rules, dan hubungan antar komponen. |

---

## 4. Database

| Document                                         | Description                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [04-database-design.md](./04-database-design.md) | Desain database, ERD, schema Drizzle ORM, indexing, dan alasan setiap field dibuat. |

---

## 5. Data Flow

| Document                             | Description                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| [05-data-flow.md](./05-data-flow.md) | Alur data mulai dari sensor hingga dashboard, termasuk proses alert dan notifikasi. |

---

## 6. Rule Engine

| Document                                 | Description                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| [06-rule-engine.md](./06-rule-engine.md) | Cara kerja Rule Engine, evaluasi state, state transition, dan business logic. |

---

## 7. API

| Document                               | Description                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| [07-api-design.md](./07-api-design.md) | REST API, request & response, payload sensor, dashboard endpoint, dan struktur endpoint. |

---

## 8. Deployment

| Document                               | Description                                                              |
| -------------------------------------- | ------------------------------------------------------------------------ |
| [08-deployment.md](./08-deployment.md) | Environment, Docker, PostgreSQL, deployment, dan konfigurasi production. |

---

## 9. Future Improvements

| Document                                                 | Description                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [09-future-improvements.md](./09-future-improvements.md) | Ide pengembangan lanjutan seperti Queue, Multi Tenant, Defrost Detection, hingga Predictive Maintenance. |

---

# 📂 Project Structure

```text
docs/
├── README.md
├── 01-overview.md
├── 02-architecture.md
├── 03-domain-model.md
├── 04-database-design.md
├── 05-data-flow.md
├── 06-rule-engine.md
├── 07-api-design.md
├── 08-deployment.md
├── 09-future-improvements.md
└── images/
```

---

# 🎯 Reading Order

Bagi pembaca yang baru pertama kali melihat project ini, disarankan membaca dokumentasi dengan urutan berikut:

```
Overview
      │
      ▼
Architecture
      │
      ▼
Domain Model
      │
      ▼
Database Design
      │
      ▼
Data Flow
      │
      ▼
Rule Engine
      │
      ▼
API Design
      │
      ▼
Deployment
      │
      ▼
Future Improvements
```

Urutan tersebut mengikuti proses desain sistem, sehingga pembaca dapat memahami alasan di balik setiap keputusan implementasi.

---

# 📝 Documentation Goals

Dokumentasi ini dibuat dengan tujuan:

- Menjelaskan proses perancangan sistem secara menyeluruh.
- Mendokumentasikan keputusan arsitektur (Architecture Decision).
- Mempermudah proses maintenance dan pengembangan.
- Menjadi referensi implementasi backend monitoring berbasis IoT.
- Menunjukkan proses berpikir dalam mendesain sistem, bukan hanya hasil implementasi kode.

---

# 🚀 Tech Stack

| Layer       | Technology               |
| ----------- | ------------------------ |
| Runtime     | Node.js                  |
| Language    | TypeScript               |
| Framework   | Express.js               |
| ORM         | Drizzle ORM              |
| Database    | PostgreSQL               |
| View Engine | EJS                      |
| Frontend    | Vanilla JavaScript       |
| Charts      | Chart.js                 |
| Realtime    | Server-Sent Events (SSE) |

---

Happy Reading! 🚀

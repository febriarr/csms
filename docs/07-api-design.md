# API Design

Dokumen ini menjelaskan desain REST API yang digunakan pada CI-CSMS (Cold Storage Monitoring System). Tujuan utama desain API adalah menyediakan antarmuka yang konsisten, mudah dipahami, dan mudah dikembangkan seiring bertambahnya fitur.

---

# Design Principles

API dirancang berdasarkan prinsip berikut:

- RESTful API
- Predictable Resource Naming
- Consistent Response Structure
- Stateless Communication
- JSON sebagai format pertukaran data
- Versioning sejak awal

---

# Base URL

Development

```
http://localhost:3000/api/v1
```

Production

```
https://example.com/api/v1
```

Seluruh endpoint berada di bawah prefix:

```
/api/v1
```

Hal ini memudahkan proses versioning di masa depan.

---

# API Versioning

Saat ini menggunakan URL Versioning.

```
/api/v1
```

Contoh:

```
POST /api/v1/temperature
```

Apabila terdapat perubahan besar di masa depan.

```
/api/v2
```

Version sebelumnya tetap dapat dipertahankan tanpa memengaruhi client lama.

---

# Request Format

Semua request menggunakan:

```
Content-Type

application/json
```

Contoh:

```http
POST /api/v1/temperature
```

```json
{
  "deviceCode": "FREEZER-A",
  "temperature": -19.4,
  "recordedAt": "2026-07-19T09:30:00Z"
}
```

---

# Response Format

Seluruh endpoint menggunakan struktur response yang konsisten.

Success

```json
{
  "success": true,
  "message": "Temperature recorded successfully.",
  "data": {}
}
```

Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

---

# HTTP Status Codes

| Status | Description           |
| ------ | --------------------- |
| 200    | Success               |
| 201    | Resource Created      |
| 400    | Bad Request           |
| 401    | Unauthorized (Future) |
| 403    | Forbidden (Future)    |
| 404    | Resource Not Found    |
| 409    | Conflict              |
| 422    | Validation Failed     |
| 500    | Internal Server Error |

---

# Resource Overview

```
Devices
        │
Temperature Logs
        │
Alerts
        │
Dashboard
```

---

# Device Endpoints

## Get Devices

```http
GET /api/v1/devices
```

Response

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "code": "FREEZER-A",
      "name": "Freezer A",
      "state": "NORMAL"
    }
  ]
}
```

---

## Get Device Detail

```http
GET /api/v1/devices/:id
```

---

# Temperature Endpoints

## Receive Temperature

```http
POST /api/v1/temperature
```

Request

```json
{
  "deviceCode": "FREEZER-A",
  "temperature": -18.9,
  "recordedAt": "2026-07-19T09:30:00Z"
}
```

Success Response

```json
{
  "success": true,
  "message": "Temperature recorded successfully."
}
```

Business Process

```
Validate Payload

↓

Save Temperature Log

↓

Evaluate Rules

↓

Update Device State

↓

Create Alert (If Needed)

↓

Create Notification Log

↓

Dispatch Notification
```

---

## Temperature History

```http
GET /api/v1/devices/:id/temperature-logs
```

Query Parameters

```
from

to

page

limit
```

Example

```
GET /devices/{id}/temperature-logs?page=1&limit=50
```

---

# Alert Endpoints

## Get Alerts

```http
GET /api/v1/alerts
```

Optional Query

```
deviceId

state

page

limit
```

---

## Alert Detail

```http
GET /api/v1/alerts/:id
```

---

# Dashboard Endpoints

Dashboard menggunakan endpoint khusus untuk kebutuhan UI.

## Summary

```http
GET /api/v1/dashboard/summary
```

Response

```json
{
  "totalDevices": 5,
  "normal": 4,
  "warning": 1,
  "critical": 0
}
```

---

## Latest Temperatures

```http
GET /api/v1/dashboard/latest-temperatures
```

---

## Recent Alerts

```http
GET /api/v1/dashboard/recent-alerts
```

---

# Pagination

Endpoint yang mengembalikan daftar data menggunakan pagination.

Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

# Error Response

Validation Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "temperature",
      "message": "Temperature is required."
    }
  ]
}
```

---

Device Not Found

```json
{
  "success": false,
  "message": "Device not found."
}
```

---

Internal Server Error

```json
{
  "success": false,
  "message": "Unexpected server error."
}
```

---

# Validation Rules

Temperature

- Required
- Number

Device Code

- Required
- Must exist

Recorded At

- Required
- Valid ISO 8601 Date

---

# Authentication

Versi MVP belum menggunakan autentikasi.

Pengembangan selanjutnya dapat menggunakan:

- JWT
- Session
- API Key (Sensor)
- OAuth2

---

# Naming Convention

Endpoint menggunakan:

```
kebab-case
```

Contoh

```
temperature-logs
```

JSON menggunakan:

```
camelCase
```

Contoh

```json
{
  "recordedAt": "...",
  "deviceCode": "..."
}
```

---

# API Flow

```
Client
    │
    ▼
Controller
    │
    ▼
Service
    │
    ▼
Repository
    │
    ▼
Database
```

---

# Future Endpoints

```
POST /api/v1/auth/login

POST /api/v1/auth/logout

GET /api/v1/users

GET /api/v1/reports

POST /api/v1/devices

PATCH /api/v1/devices/{id}
```

---

# Architecture Decisions

## Decision

Menggunakan REST API dengan struktur response yang konsisten.

## Why?

- Mudah digunakan frontend.
- Mudah dipelihara.
- Mudah diintegrasikan dengan aplikasi lain.
- Siap dikembangkan menjadi Public API.

## Trade-offs

- Tidak sefleksibel GraphQL.
- Beberapa endpoint dapat mengembalikan data yang berlebih (over-fetching).

---

# Conclusion

REST API pada CI-CSMS dirancang agar konsisten, mudah dipahami, dan mudah dikembangkan. Dengan versioning sejak awal, struktur response yang seragam, serta pemisahan endpoint berdasarkan resource, API siap digunakan baik oleh dashboard internal maupun integrasi dengan sistem lain di masa depan.

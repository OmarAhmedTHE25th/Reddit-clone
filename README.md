# Reddit Clone

A decoupled full-stack Reddit clone built with a **React (Vite) SPA** frontend and an **Express REST API** backend, backed by **Prisma** and **PostgreSQL (Neon)**.

---

## 🏛️ Architecture Overview

The repository is structured as a clean monorepo with strict separation of concerns and zero framework magic:

```
Reddit-clone/
├── client/                     # Pure client-side React SPA (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   └── HomePage.tsx   # React component with explicit useEffect + fetch
│   │   ├── App.tsx            # Client routing via react-router-dom
│   │   └── main.tsx           # React DOM root
│   ├── index.html
│   ├── vite.config.ts         # Proxy /api requests to Express (:5000)
│   └── package.json
│
├── server/                     # Standalone Node.js + Express REST API
│   ├── prisma/                # Isolated database schema and migrations
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── db/
│   │   │   └── prisma.ts      # Singleton Prisma Client
│   │   ├── routes/
│   │   │   └── health.ts      # Express /api/health endpoint
│   │   └── index.ts           # Express server setup with CORS & JSON body parsing
│   ├── .env                   # Database credentials & JWT secrets
│   └── package.json
│
├── package.json               # Root orchestrator with concurrent dev runner
└── .gitignore
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `v18.18+` or higher
- npm

### 2. Installation
Install all dependencies across the root, server, and client:
```bash
npm run install:all
```
*(Or run `npm install` inside root, `/server`, and `/client` individually).*

### 3. Environment Variables
Create or verify `server/.env`:
```env
# Database connection URLs (PostgreSQL / Neon)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
DIRECT_URL="postgresql://user:password@host/db?sslmode=require"

# Server configuration
PORT=5000
CLIENT_ORIGIN="http://localhost:5173"

# JWT Secrets
JWT_ACCESS_SECRET="your_jwt_access_secret"
JWT_REFRESH_SECRET="your_jwt_refresh_secret"
```

### 4. Database Setup
Generate the Prisma Client in the server:
```bash
npm --prefix server run prisma:generate
```
Run any pending migrations:
```bash
npm --prefix server run prisma:migrate
```

---

## 💻 Development

Run both the Express backend and Vite frontend concurrently with a single command:
```bash
npm run dev
```

* **Frontend (Vite SPA):** [http://localhost:5173](http://localhost:5173)
* **Backend (Express API):** [http://localhost:5000](http://localhost:5000)
* **Health Check Endpoint:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Running Services Independently
- Only Backend: `npm run dev:server` (runs `tsx watch` on port `5000`)
- Only Frontend: `npm run dev:client` (runs `vite` on port `5173`)

---

## 📦 Production Build

Build both client and server:
```bash
npm run build
```

Run the production Express server:
```bash
npm --prefix server run start
```
*(The client's built static assets will be in `client/dist`).*

# Reddit Clone

A full-stack Reddit clone built with Next.js, the App Router, Prisma, and PostgreSQL on Neon.

## Features

- **Next.js App Router:** Full-stack application structure with pages and Route Handlers.
- **Database Integration:** PostgreSQL on Neon through Prisma ORM.
- **Security Foundation:** Password hashing with bcrypt and input validation with Zod.
- **Health Check:** `/api/health` verifies database connectivity.

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** React
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma 6
- **Validation:** Zod
- **Authentication:** JWT, bcrypt

## Getting Started

### Prerequisites

- Node.js `v18.18` or higher
- npm
- A PostgreSQL database, such as Neon

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/OmarAhmedTHE25th/Reddit-clone.git
   cd Reddit-clone
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the project root and add your Neon connection values:
   ```env
   DATABASE_URL="your_postgresql_url"
   DIRECT_URL="your_direct_postgresql_url"
   JWT_SECRET="your_jwt_secret"
   ```

4. Generate the Prisma Client:
   ```bash
   npx prisma generate
   ```

5. Apply database migrations:
   ```bash
   npx prisma migrate dev
   ```

### Running the App

Start the Next.js development server:
```bash
npm run dev
```

The application will be running on `http://localhost:3000`.

Open the following URLs to verify the setup:

- Home page: `http://localhost:3000/`
- Database health check: `http://localhost:3000/api/health`

Successful database connectivity returns:

```json
{
  "status": "ok",
  "database": "connected to Neon"
}
```

### Production

Build and start the production server:

```bash
npm run build
npm run start
```

### Prisma Studio

Open Prisma Studio to inspect the Neon database:

```bash
npx prisma studio
```

Prisma Studio will be available at `http://localhost:5555`.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

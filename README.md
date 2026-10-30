# Reddit Clone

A basic Reddit clone backend built with Express.js and Prisma.

## Features

- **User Authentication:** Sign up and login with JWT and Refresh Tokens.
- **Database Integration:** Powered by PostgreSQL and Prisma ORM.
- **Security:** Password hashing with bcrypt and input validation with Zod.
- **Health Check:** API endpoint to verify database connectivity.

## Tech Stack

- **Backend:** Next.js 
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Validation:** Zod
- **Authentication:** JWT, bcrypt

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A PostgreSQL database (e.g., Neon)

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
   Create a `.env` file in the root directory and add the following:
   ```env
   DATABASE_URL="your_postgresql_url"
   DIRECT_URL="your_direct_postgresql_url"
   PORT=5000
   JWT_SECRET="your_jwt_secret"
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

### Running the App

Start the development server:
```bash
node src/server.js
```

The server will be running on `http://localhost:5000`.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

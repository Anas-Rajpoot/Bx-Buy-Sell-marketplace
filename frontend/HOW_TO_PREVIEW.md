# How to Preview This Project

## Quick Start (Frontend Only)

To quickly preview the frontend application:

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Start the development server
npm run dev
```

The application will be available at: **http://localhost:5173**

---

## Full Setup (Frontend + Backend)

For a complete preview with all features working:

### Step 1: Start the Backend API

```bash
# Navigate to backend directory
cd ex-buy-sell-apis

# Install dependencies (if not already installed)
npm install

# Start the backend server
npm run start:dev
```

Backend will run on: **http://localhost:1230**

### Step 2: Start the Frontend

Open a new terminal:

```bash
# Make sure you're in the project root directory
npm run dev
```

Frontend will run on: **http://localhost:5173**

---

## Using Docker (Easiest Method)

If you have Docker installed:

```bash
# Navigate to backend directory
cd ex-buy-sell-apis

# Start all services (API, Redis, RabbitMQ)
docker-compose up
```

Then in another terminal, start the frontend:

```bash
npm run dev
```

---

## Environment Variables

Make sure you have the required environment variables set up:

### Frontend (.env in project root):
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
VITE_API_BASE_URL=http://localhost:1230
```

### Backend (ex-buy-sell-apis/.env):
```
DATABASE_URL=your-mongodb-connection-string
PORT=1230
JWT_SECRET=your-jwt-secret
# ... other variables
```

---

## Preview Commands Summary

| Command | Description | Port |
|---------|-------------|------|
| `npm run dev` | Start frontend dev server | 5173 |
| `npm run preview` | Preview production build | 5173 |
| `npm run build` | Build for production | - |
| `cd ex-buy-sell-apis && npm run start:dev` | Start backend API | 1230 |

---

## Troubleshooting

- **Port already in use**: Change the port in `vite.config.ts` or use `npm run dev -- --port 3000`
- **Backend not connecting**: Make sure MongoDB is running and DATABASE_URL is correct
- **CORS errors**: Check that backend CORS is configured correctly

























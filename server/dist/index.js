import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import aiRouter from './routes/ai.js';
import feedRouter from './routes/feed.js';
import communitiesRouter from './routes/communities.js';
import postsRouter from './routes/posts.js';
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const CLIENT_URL = process.env.CLIENT_URL ||
    process.env.CLIENT_ORIGIN ||
    'http://localhost:5173';
// Allow cookies (refresh tokens) and Authorization headers from the Vite frontend
app.use(cors({
    origin: CLIENT_URL,
    credentials: true,
}));
// Parse JSON payloads and HttpOnly cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/feed', feedRouter);
app.use('/api/communities', communitiesRouter);
app.use('/api/posts', postsRouter);
// 404 Handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Global Error Handler
app.use((err, _req, res, _next) => {
    const status = err.status;
    if (status && status < 500) {
        res.status(status).json({ error: err.message });
        return;
    }
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});
app.listen(PORT, () => {
    console.log(`[server] Express API running at http://localhost:${PORT}`);
    console.log(`[server] Allowed CORS origin: ${CLIENT_URL}`);
    console.log(`[server] Health check at http://localhost:${PORT}/api/health`);
});
export default app;

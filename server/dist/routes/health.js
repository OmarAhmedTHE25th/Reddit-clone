import { Router } from 'express';
import prisma from '../db/prisma.js';
const router = Router();
router.get('/', async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'ok',
            database: 'connected to Neon',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json({
            status: 'error',
            database: 'unavailable',
            error: error instanceof Error ? error.message : 'Unknown database error',
        });
    }
});
export default router;

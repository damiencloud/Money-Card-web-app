import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import { organizationRouter, branchesRouter } from './organization.routes.js';
import { staffRouter, permissionsRouter } from './staff.routes.js';
import { cardsRouter } from './cards.routes.js';
import { sessionsRouter } from './sessions.routes.js';
import { productsRouter, inventoryRouter } from './products.routes.js';
import analyticsRoutes from './analytics.routes.js';
import publicRoutes from './public.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import reportsRoutes from './reports.routes.js';
import { getPublicPlans } from '../controllers/subscription.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/database.js';
import { sendSuccess } from '../utils/response.js';

const apiRouter = Router();

// Healthcheck
apiRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return sendSuccess(res, {
      status: 'HEALTHY',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch {
    return res.status(503).json({
      success: false,
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      timestamp: new Date().toISOString(),
    });
  }
});

// Top-level Plans catalog (readable by all authenticated users)
apiRouter.get('/plans', requireAuth, getPublicPlans);

// Domain Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/public', publicRoutes);
apiRouter.use('/organization', organizationRouter);
apiRouter.use('/branches', branchesRouter);
apiRouter.use('/permissions', permissionsRouter);
apiRouter.use('/staff', staffRouter);
apiRouter.use('/cards', cardsRouter);
apiRouter.use('/card-sessions', sessionsRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/subscription', subscriptionRoutes);
apiRouter.use('/reports', reportsRoutes);

export default apiRouter;

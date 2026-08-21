import { Router } from 'express';
import {
  getOrganizationProfile,
  updateOrganizationProfile,
  getBranches,
  createBranch,
  getBranchById,
  updateBranch,
} from '../controllers/organization.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { Role } from '@prisma/client';

export const organizationRouter = Router();
organizationRouter.use(requireAuth);
organizationRouter.get('/', getOrganizationProfile);
organizationRouter.patch('/', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), updateOrganizationProfile);

export const branchesRouter = Router();
branchesRouter.use(requireAuth);
branchesRouter.get('/', getBranches);
branchesRouter.post('/', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), createBranch);
branchesRouter.get('/:id', getBranchById);
branchesRouter.patch('/:id', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), updateBranch);
branchesRouter.put('/:id', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), updateBranch);

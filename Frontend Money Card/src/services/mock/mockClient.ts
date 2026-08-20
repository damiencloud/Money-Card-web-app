import { mockAuthHandlers } from './handlers/auth';
import { mockOrganizationsHandlers } from './handlers/organizations';
import { mockBranchesHandlers } from './handlers/branches';
import { mockStaffHandlers } from './handlers/staff';
import { mockCardsHandlers } from './handlers/cards';
import { mockSessionsHandlers } from './handlers/sessions';
import { mockProductsHandlers } from './handlers/products';
import { mockInventoryHandlers } from './handlers/inventory';
import { mockAnalyticsHandlers } from './handlers/analytics';
import { mockSubscriptionsHandlers } from './handlers/subscriptions';
import { mockUserPortalHandlers } from './handlers/userPortal';
import { mockStore } from './store';

export const mockClient = {
  auth: mockAuthHandlers,
  organizations: mockOrganizationsHandlers,
  branches: mockBranchesHandlers,
  staff: mockStaffHandlers,
  cards: mockCardsHandlers,
  sessions: mockSessionsHandlers,
  products: mockProductsHandlers,
  inventory: mockInventoryHandlers,
  analytics: mockAnalyticsHandlers,
  reports: {
    getReports: mockAnalyticsHandlers.getReports,
    downloadReportPdf: mockAnalyticsHandlers.downloadReportPdf,
  },
  plans: mockSubscriptionsHandlers,
  subscriptions: mockSubscriptionsHandlers,
  userPortal: mockUserPortalHandlers,
  resetStore: () => mockStore.resetStore(),
};

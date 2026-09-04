import {
  SEED_ORGANIZATIONS,
  SEED_BRANCHES,
  SEED_STAFF_USERS,
  SEED_STAFF_ENTITIES,
  SEED_CARDS,
  SEED_SESSIONS,
  SEED_PRODUCTS,
  SEED_INVENTORY,
  SEED_TRANSACTIONS,
  SEED_PAYMENTS,
  SEED_PLANS,
  SEED_SUBSCRIPTIONS,
  SEED_SUBSCRIPTION_PAYMENTS,
  SEED_PLAN_REQUESTS,
  SEED_AUDIT_LOGS,
  SEED_CUSTOMER_HISTORY_EVENTS,
} from './data/seed';
import { generateSecureToken } from '../../utils/cryptoRandom';

import type {
  Organization,
  Branch,
  Staff,
  Card,
  CardSession,
  Product,
  InventoryItem,
  Transaction,
  Payment,
  Plan,
  Subscription,
  SubscriptionPayment,
  PlanChangeRequest,
  AuditLog,
  AuthUser,
  CustomerHistoryEvent,
} from '@/types';

class MockStore {
  public organizations: Organization[] = [];
  public branches: Branch[] = [];
  public staffUsers: (AuthUser & { passwordHash: string; status?: 'ACTIVE' | 'INACTIVE' })[] = [];
  public staffEntities: Staff[] = [];
  public cards: Card[] = [];
  public sessions: CardSession[] = [];
  public products: Product[] = [];
  public inventory: InventoryItem[] = [];
  public transactions: Transaction[] = [];
  public payments: Payment[] = [];
  public plans: Plan[] = [];
  public subscriptions: Subscription[] = [];
  public subscriptionPayments: SubscriptionPayment[] = [];
  public planRequests: PlanChangeRequest[] = [];
  public auditLogs: AuditLog[] = [];
  public customerHistoryEvents: CustomerHistoryEvent[] = [];

  constructor() {
    this.resetStore();
  }

  public reset(): void {
    this.resetStore();
  }

  public resetStore(): void {
    this.organizations = JSON.parse(JSON.stringify(SEED_ORGANIZATIONS));
    this.branches = JSON.parse(JSON.stringify(SEED_BRANCHES));
    this.staffUsers = JSON.parse(JSON.stringify(SEED_STAFF_USERS));
    this.staffEntities = JSON.parse(JSON.stringify(SEED_STAFF_ENTITIES));
    this.cards = JSON.parse(JSON.stringify(SEED_CARDS));
    this.sessions = JSON.parse(JSON.stringify(SEED_SESSIONS));
    this.products = JSON.parse(JSON.stringify(SEED_PRODUCTS));
    this.inventory = JSON.parse(JSON.stringify(SEED_INVENTORY));
    this.transactions = JSON.parse(JSON.stringify(SEED_TRANSACTIONS));
    this.payments = JSON.parse(JSON.stringify(SEED_PAYMENTS));
    this.plans = JSON.parse(JSON.stringify(SEED_PLANS));
    this.subscriptions = JSON.parse(JSON.stringify(SEED_SUBSCRIPTIONS));
    this.subscriptionPayments = JSON.parse(JSON.stringify(SEED_SUBSCRIPTION_PAYMENTS));
    this.planRequests = JSON.parse(JSON.stringify(SEED_PLAN_REQUESTS));
    this.auditLogs = JSON.parse(JSON.stringify(SEED_AUDIT_LOGS));
    this.customerHistoryEvents = JSON.parse(JSON.stringify(SEED_CUSTOMER_HISTORY_EVENTS));
  }

  // ── Helpers for UUID & Timestamp ──
  public generateId(prefix: string): string {
    return generateSecureToken(prefix);
  }

  public getTimestamp(): string {
    return new Date().toISOString();
  }
}

export const mockStore = new MockStore();

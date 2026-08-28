import {
  PrismaClient,
  Role,
  PermissionCode,
  BillingInterval,
  SubscriptionStatus,
  PaymentStatus,
  CardStatus,
  ProductStatus,
  CardHistoryAction,
  UserStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ALL_PERMISSIONS: PermissionCode[] = [
  PermissionCode.CARD_VIEW,
  PermissionCode.CARD_ISSUE,
  PermissionCode.CARD_RETURN,
  PermissionCode.CARD_BLOCK,
  PermissionCode.CARD_UNBLOCK,
  PermissionCode.RECHARGE,
  PermissionCode.PURCHASE,
  PermissionCode.REFUND,
  PermissionCode.SESSION_VIEW,
  PermissionCode.PRODUCT_VIEW,
  PermissionCode.PRODUCT_MANAGE,
  PermissionCode.INVENTORY_VIEW,
  PermissionCode.INVENTORY_MANAGE,
  PermissionCode.INVENTORY_IMPORT,
  PermissionCode.VIEW_ANALYTICS,
  PermissionCode.VIEW_REPORTS,
  PermissionCode.STAFF_VIEW,
  PermissionCode.STAFF_MANAGE,
  PermissionCode.BRANCH_VIEW,
  PermissionCode.BRANCH_MANAGE,
];

const STAFF_DEFAULT_PERMISSIONS: PermissionCode[] = [
  PermissionCode.CARD_VIEW,
  PermissionCode.CARD_ISSUE,
  PermissionCode.CARD_RETURN,
  PermissionCode.CARD_BLOCK,
  PermissionCode.CARD_UNBLOCK,
  PermissionCode.RECHARGE,
  PermissionCode.PURCHASE,
  PermissionCode.REFUND,
  PermissionCode.SESSION_VIEW,
  PermissionCode.PRODUCT_VIEW,
  PermissionCode.INVENTORY_VIEW,
  PermissionCode.VIEW_ANALYTICS,
];

async function ensureUser(userData: {
  id: string;
  email: string;
  name: string;
  role: Role;
  defaultPassword: string;
  organizationId: string | null;
  permissions: PermissionCode[];
  branchIds?: string[];
}) {
  const cleanEmail = userData.email.toLowerCase().replace(/\s+/g, '');
  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: { permissions: true, assignedBranches: true },
  });

  const passwordHash = await bcrypt.hash(userData.defaultPassword, 10);

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        id: userData.id,
        email: cleanEmail,
        passwordHash,
        name: userData.name,
        role: userData.role,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
        organizationId: userData.organizationId,
      },
    });

    for (const perm of userData.permissions) {
      await prisma.userPermission.create({
        data: { userId: created.id, permission: perm },
      });
    }

    if (userData.branchIds && userData.branchIds.length > 0) {
      for (const bId of userData.branchIds) {
        await prisma.userBranch.create({
          data: { userId: created.id, branchId: bId },
        });
      }
    }

    console.log(`✅ Created user: ${cleanEmail} (${userData.role})`);
    return created;
  } else {
    // If user exists, update password hash to support standard password if needed, ensure active status
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        status: UserStatus.ACTIVE,
        passwordHash, // Set known valid password hash
        organizationId: existing.organizationId || userData.organizationId,
      },
    });

    // Ensure permissions
    const existingPerms = new Set(existing.permissions.map((p) => p.permission));
    for (const perm of userData.permissions) {
      if (!existingPerms.has(perm)) {
        await prisma.userPermission.create({
          data: { userId: existing.id, permission: perm },
        });
      }
    }

    // Ensure branch assignments
    if (userData.branchIds && userData.branchIds.length > 0) {
      const existingBranchIds = new Set(existing.assignedBranches.map((b) => b.branchId));
      for (const bId of userData.branchIds) {
        if (!existingBranchIds.has(bId)) {
          await prisma.userBranch.create({
            data: { userId: existing.id, branchId: bId },
          });
        }
      }
    }

    console.log(`ℹ️ Updated/Verified user: ${cleanEmail} (${userData.role})`);
    return existing;
  }
}

async function main() {
  console.log('🌱 Seeding Money Card Database with all accounts and idempotent demo records...');

  // 1. Ensure Global Plans
  const plans = [
    {
      id: 'plan_001',
      name: 'Starter',
      price: 999.0,
      billingInterval: BillingInterval.MONTHLY,
      branchLimit: 1,
      staffLimit: 2,
      cardLimit: 50,
      description: 'Essential plan for single-counter snack bars & small food kiosks.',
      features: ['1 Branch', '2 Staff accounts', '50 Smart cards', 'Basic Analytics'],
      isPopular: false,
    },
    {
      id: 'plan_002',
      name: 'Standard',
      price: 1999.0,
      billingInterval: BillingInterval.MONTHLY,
      branchLimit: 2,
      staffLimit: 5,
      cardLimit: 200,
      description: 'Standard plan for multi-counter cafeterias with full POS & inventory.',
      features: ['2 Branches', '5 Staff accounts', '200 Smart cards', 'PDF Analytics Reports', 'CSV Inventory Import'],
      isPopular: true,
    },
    {
      id: 'plan_003',
      name: 'Enterprise',
      price: 4999.0,
      billingInterval: BillingInterval.MONTHLY,
      branchLimit: 10,
      staffLimit: 25,
      cardLimit: 1000,
      description: 'Enterprise multi-branch plan for university and corporate food courts.',
      features: ['10 Branches', '25 Staff accounts', '1000 Smart cards', 'Priority Support', 'Custom Overrides'],
      isPopular: false,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { id: p.id },
      update: { name: p.name, price: p.price, branchLimit: p.branchLimit, staffLimit: p.staffLimit, cardLimit: p.cardLimit },
      create: p,
    });
  }

  // 2. Ensure Organization
  const org = await prisma.organization.upsert({
    where: { id: 'org_001' },
    update: { name: 'Acme Cafeterias' },
    create: {
      id: 'org_001',
      name: 'Acme Cafeterias',
      planId: 'plan_002',
      email: 'contact@acmecafeteria.com',
      phone: '+91 98765 43210',
      address: 'Tech Park Tower B, Food Court',
    },
  });

  // Ensure Subscription
  const existingSub = await prisma.subscription.findFirst({
    where: { organizationId: org.id },
  });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        id: 'sub_org_001',
        organizationId: org.id,
        planId: 'plan_002',
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        renewalDate: new Date(Date.now() + 30 * 86400000),
        paymentStatus: PaymentStatus.SUCCESS,
      },
    });
  }

  // 3. Ensure Branches
  const mainBranch = await prisma.branch.upsert({
    where: { id: 'branch_001' },
    update: { name: 'Main Cafeteria' },
    create: {
      id: 'branch_001',
      organizationId: org.id,
      name: 'Main Cafeteria',
      location: 'Ground Floor, Building 1',
    },
  });

  const branchTwo = await prisma.branch.upsert({
    where: { id: 'branch_002' },
    update: { name: 'Executive Lounge' },
    create: {
      id: 'branch_002',
      organizationId: org.id,
      name: 'Executive Lounge',
      location: '2nd Floor, Building 2',
    },
  });

  // 4. Ensure Super Admin Accounts
  await ensureUser({
    id: 'usr_superadmin',
    email: 'amigosiamoneycard@gmail.com',
    name: 'Platform Super Admin',
    role: Role.SUPER_ADMIN,
    defaultPassword: 'password', // Standard password
    organizationId: null,
    permissions: ALL_PERMISSIONS,
  });

  await ensureUser({
    id: 'super_admin_001',
    email: 'admin@platform.com',
    name: 'Platform Super Admin',
    role: Role.SUPER_ADMIN,
    defaultPassword: 'password',
    organizationId: null,
    permissions: ALL_PERMISSIONS,
  });

  // 5. Ensure Org Admin Accounts
  await ensureUser({
    id: 'usr_orgadmin',
    email: 'admin@maincafe.com',
    name: 'Acme General Manager',
    role: Role.ORG_ADMIN,
    defaultPassword: 'password', // Standard password
    organizationId: org.id,
    permissions: ALL_PERMISSIONS,
    branchIds: [mainBranch.id, branchTwo.id],
  });

  await ensureUser({
    id: 'org_admin_001',
    email: 'admin@acme.com',
    name: 'Acme Org Admin',
    role: Role.ORG_ADMIN,
    defaultPassword: 'password',
    organizationId: org.id,
    permissions: ALL_PERMISSIONS,
    branchIds: [mainBranch.id, branchTwo.id],
  });

  // 6. Ensure Staff Accounts (including eros@staff.com, staff@maincafe.com, staff@example.com)
  const staffUser = await ensureUser({
    id: 'usr_staff_eros',
    email: 'eros@staff.com',
    name: 'Eros Counter Staff',
    role: Role.STAFF,
    defaultPassword: 'password', // Standard password
    organizationId: org.id,
    permissions: STAFF_DEFAULT_PERMISSIONS,
    branchIds: [mainBranch.id, branchTwo.id],
  });

  await ensureUser({
    id: 'usr_staff_001',
    email: 'staff@maincafe.com',
    name: 'Rahul Counter Staff',
    role: Role.STAFF,
    defaultPassword: 'password',
    organizationId: org.id,
    permissions: STAFF_DEFAULT_PERMISSIONS,
    branchIds: [mainBranch.id],
  });

  await ensureUser({
    id: 'staff_001',
    email: 'staff@example.com',
    name: 'John Staff',
    role: Role.STAFF,
    defaultPassword: 'password',
    organizationId: org.id,
    permissions: STAFF_DEFAULT_PERMISSIONS,
    branchIds: [mainBranch.id],
  });

  await ensureUser({
    id: 'staff_002',
    email: 'staff@moneycard.io',
    name: 'Alex Counter Staff',
    role: Role.STAFF,
    defaultPassword: 'password',
    organizationId: org.id,
    permissions: STAFF_DEFAULT_PERMISSIONS,
    branchIds: [mainBranch.id],
  });

  // 7. Ensure Products & Inventory
  const productsData = [
    { name: 'Veg Burger', price: 120.0, categories: ['Veg', 'Fast Food'], stock: 50 },
    { name: 'Cold Coffee', price: 80.0, categories: ['Beverage'], stock: 100 },
    { name: 'Deluxe Thali', price: 220.0, categories: ['Veg', 'Lunch'], stock: 35 },
    { name: 'Chicken Wrap', price: 150.0, categories: ['Non-Veg', 'Fast Food'], stock: 40 },
    { name: 'Crispy Fries', price: 60.0, categories: ['Veg', 'Snack'], stock: 80 },
    { name: 'Masala Chai', price: 25.0, categories: ['Beverage', 'Breakfast'], stock: 150 },
  ];

  for (const prod of productsData) {
    const existingProd = await prisma.product.findFirst({
      where: { organizationId: org.id, itemName: prod.name },
    });

    let prodId = existingProd?.id;
    if (!existingProd) {
      const created = await prisma.product.create({
        data: {
          organizationId: org.id,
          itemName: prod.name,
          price: prod.price,
          category: prod.categories,
          status: ProductStatus.ACTIVE,
        },
      });
      prodId = created.id;
    }

    if (prodId) {
      await prisma.branchInventory.upsert({
        where: {
          branchId_productId: {
            branchId: mainBranch.id,
            productId: prodId,
          },
        },
        update: {},
        create: {
          branchId: mainBranch.id,
          productId: prodId,
          quantity: prod.stock,
          lowStockThreshold: 10,
        },
      });
    }
  }

  // 8. Ensure Physical Cards
  const cardConfigs = [
    { num: 'MC-001', status: CardStatus.ACTIVE, token: 'qr_token_mc001_8a7b9c' },
    { num: 'MC-002', status: CardStatus.ACTIVE, token: 'qr_token_mc002_3f4e5d' },
    { num: 'MC-003', status: CardStatus.BLOCKED, token: 'qr_token_mc003_9k8j7h' },
    { num: 'MC-004', status: CardStatus.AVAILABLE, token: 'qr_token_mc004_1a2b3c' },
    { num: 'MC-005', status: CardStatus.AVAILABLE, token: 'qr_token_mc005_7x8y9z' },
    { num: 'MC 104', status: CardStatus.ACTIVE, token: 'qr_token_mc104_998877' },
    { num: 'MC 105', status: CardStatus.BLOCKED, token: 'qr_token_mc105_665544' },
  ];

  const dbCards: Record<string, any> = {};
  for (const cfg of cardConfigs) {
    const card = await prisma.card.upsert({
      where: {
        organizationId_physicalCardNumber: {
          organizationId: org.id,
          physicalCardNumber: cfg.num,
        },
      },
      update: { status: cfg.status },
      create: {
        organizationId: org.id,
        physicalCardNumber: cfg.num,
        qrToken: cfg.token,
        status: cfg.status,
      },
    });
    dbCards[cfg.num] = card;
  }

  // 9. Ensure Customer Sessions
  const sessionConfigs = [
    {
      cardNum: 'MC-001',
      customerName: 'Alex Morgan',
      customerPhone: '9876543210',
      balance: 450.0,
      status: 'ACTIVE',
      cycle: 1,
    },
    {
      cardNum: 'MC-002',
      customerName: 'Sarah Connor',
      customerPhone: '9123456780',
      balance: 320.0,
      status: 'ACTIVE',
      cycle: 1,
    },
    {
      cardNum: 'MC-003',
      customerName: 'David Miller',
      customerPhone: '9988776655',
      balance: 150.0,
      status: 'ACTIVE',
      cycle: 1,
    },
    {
      cardNum: 'MC 104',
      customerName: 'Michael Scott',
      customerPhone: '9765432109',
      balance: 600.0,
      status: 'ACTIVE',
      cycle: 2,
    },
    {
      cardNum: 'MC 105',
      customerName: 'John Doe',
      customerPhone: '9876501234',
      balance: 450.0,
      status: 'ACTIVE',
      cycle: 1,
    },
  ];

  const dbSessions: Record<string, any> = {};
  for (const sc of sessionConfigs) {
    const card = dbCards[sc.cardNum];
    if (!card) continue;

    const existingSession = await prisma.cardSession.findFirst({
      where: { cardId: card.id, status: 'ACTIVE' },
    });

    if (!existingSession) {
      const createdSession = await prisma.cardSession.create({
        data: {
          organizationId: org.id,
          branchId: mainBranch.id,
          cardId: card.id,
          sessionToken: `stok_${card.physicalCardNumber.replace(/\s+/g, '_')}_${Date.now()}`,
          balance: sc.balance,
          status: sc.status as any,
          cycleNumber: sc.cycle,
          sessionCardNumber: `${card.physicalCardNumber}_${sc.cycle}`,
          customerName: sc.customerName,
          customerPhone: sc.customerPhone,
          issuedByUserId: staffUser.id,
          issuedAt: new Date(Date.now() - 3600 * 1000 * 24),
        },
      });
      dbSessions[sc.cardNum] = createdSession;

      await prisma.transaction.create({
        data: {
          sessionId: createdSession.id,
          branchId: mainBranch.id,
          staffUserId: staffUser.id,
          type: 'RECHARGE_CASH' as any,
          amount: sc.balance + 100,
          balanceBefore: 0,
          balanceAfter: sc.balance + 100,
          paymentMethod: 'CASH',
        },
      });

      await prisma.transaction.create({
        data: {
          sessionId: createdSession.id,
          branchId: mainBranch.id,
          staffUserId: staffUser.id,
          type: 'PURCHASE' as any,
          amount: 100,
          balanceBefore: sc.balance + 100,
          balanceAfter: sc.balance,
          paymentMethod: 'CARD_BALANCE',
          items: [{ itemName: 'Veg Burger', quantity: 1, unitPrice: 100, totalPrice: 100 }],
        },
      });
    } else {
      dbSessions[sc.cardNum] = existingSession;
    }
  }

  // 10. Ensure Customer History Events
  const historyEventConfigs = [
    {
      cardNum: 'MC 105',
      customerName: 'John Doe',
      customerPhone: '9876501234',
      action: CardHistoryAction.CARD_BLOCKED,
      previousStatus: CardStatus.ACTIVE,
      newStatus: CardStatus.BLOCKED,
      performedByName: staffUser.name,
      performedByUserId: staffUser.id,
      reason: 'Reported lost by customer at Counter 1',
      createdAt: new Date(Date.now() - 3600 * 1000 * 3),
    },
    {
      cardNum: 'MC-003',
      customerName: 'David Miller',
      customerPhone: '9988776655',
      action: CardHistoryAction.CARD_BLOCKED,
      previousStatus: CardStatus.ACTIVE,
      newStatus: CardStatus.BLOCKED,
      performedByName: staffUser.name,
      performedByUserId: staffUser.id,
      reason: 'Suspicious multiple recharges flagged',
      createdAt: new Date(Date.now() - 3600 * 1000 * 6),
    },
    {
      cardNum: 'MC-001',
      customerName: 'Alex Morgan',
      customerPhone: '9876543210',
      action: CardHistoryAction.CARD_ISSUED,
      previousStatus: CardStatus.AVAILABLE,
      newStatus: CardStatus.ACTIVE,
      performedByName: staffUser.name,
      performedByUserId: staffUser.id,
      reason: 'New card session issued to customer',
      createdAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
    {
      cardNum: 'MC 105',
      customerName: 'John Doe',
      customerPhone: '9876501234',
      action: CardHistoryAction.CARD_UNBLOCKED,
      previousStatus: CardStatus.BLOCKED,
      newStatus: CardStatus.ACTIVE,
      performedByName: 'Acme General Manager',
      performedByUserId: staffUser.id,
      reason: 'Card found by customer and verified identity',
      createdAt: new Date(Date.now() - 3600 * 1000 * 1),
    },
  ];

  for (const he of historyEventConfigs) {
    const card = dbCards[he.cardNum];
    if (!card) continue;

    const existingEvent = await prisma.customerHistoryEvent.findFirst({
      where: {
        organizationId: org.id,
        cardId: card.id,
        action: he.action,
        reason: he.reason,
      },
    });

    if (!existingEvent) {
      await prisma.customerHistoryEvent.create({
        data: {
          organizationId: org.id,
          cardId: card.id,
          sessionId: dbSessions[he.cardNum]?.id || null,
          customerName: he.customerName,
          customerPhone: he.customerPhone,
          physicalCardNumber: he.cardNum,
          action: he.action,
          previousStatus: he.previousStatus,
          newStatus: he.newStatus,
          performedByName: he.performedByName,
          performedByUserId: he.performedByUserId,
          branchId: mainBranch.id,
          branchName: mainBranch.name,
          reason: he.reason,
          createdAt: he.createdAt,
        },
      });
    }
  }

  console.log('🎉 All users, cards, customer history, and sessions verified successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

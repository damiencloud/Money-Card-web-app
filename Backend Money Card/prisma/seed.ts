import { PrismaClient, Role, PermissionCode, BillingInterval, SubscriptionStatus, PaymentStatus, CardStatus, ProductStatus } from '@prisma/client';
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
  PermissionCode.RECHARGE,
  PermissionCode.PURCHASE,
  PermissionCode.SESSION_VIEW,
  PermissionCode.PRODUCT_VIEW,
  PermissionCode.INVENTORY_VIEW,
];

async function main() {
  console.log('🌱 Starting Money Card M0 V10 database seeding...');

  // 1. Clear Existing Data (in reverse dependency order)
  await prisma.transaction.deleteMany({});
  await prisma.cardSession.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.branchInventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.userPermission.deleteMany({});
  await prisma.userBranch.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subscriptionPayment.deleteMany({});
  await prisma.planChangeRequest.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.plan.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  // 2. Seed Global Plans
  const planStandard = await prisma.plan.create({
    data: {
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
  });

  const planStarter = await prisma.plan.create({
    data: {
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
  });

  const planEnterprise = await prisma.plan.create({
    data: {
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
  });

  console.log('✅ Global plans seeded (Starter, Standard, Enterprise).');

  // 3. Seed Master Super Admin Account
  const superAdminPasswordHash = await bcrypt.hash('SuperAdmin@123', 10);
  const superAdmin = await prisma.user.create({
    data: {
      id: 'usr_superadmin',
      email: 'superadmin@moneycard.platform',
      passwordHash: superAdminPasswordHash,
      name: 'Platform Super Admin',
      role: Role.SUPER_ADMIN,
      organizationId: null,
    },
  });

  for (const perm of ALL_PERMISSIONS) {
    await prisma.userPermission.create({
      data: {
        userId: superAdmin.id,
        permission: perm,
      },
    });
  }

  console.log('✅ Root Super Admin created: superadmin@moneycard.platform');

  // 4. Seed Demo Organization (Acme Foods)
  const org = await prisma.organization.create({
    data: {
      id: 'org_001',
      name: 'Acme Cafeterias',
      planId: planStandard.id,
      email: 'contact@acmecafeteria.com',
      phone: '+91 98765 43210',
      address: 'Tech Park Tower B, Food Court',
    },
  });

  // Seed Subscription for Organization
  await prisma.subscription.create({
    data: {
      id: 'sub_org_001',
      organizationId: org.id,
      planId: planStandard.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      renewalDate: new Date(Date.now() + 30 * 86400000),
      paymentStatus: PaymentStatus.SUCCESS,
    },
  });

  // 5. Seed Branches for Organization
  const mainBranch = await prisma.branch.create({
    data: {
      id: 'branch_001',
      organizationId: org.id,
      name: 'Main Cafeteria',
      location: 'Ground Floor, Building 1',
    },
  });

  const branchTwo = await prisma.branch.create({
    data: {
      id: 'branch_002',
      organizationId: org.id,
      name: 'Block B Quick Counter',
      location: '2nd Floor, Building 2',
    },
  });

  console.log('✅ Organization & 2 Branches created (Main Cafeteria, Block B).');

  // 6. Seed Org Admin User
  const orgAdminPasswordHash = await bcrypt.hash('OrgAdmin@123', 10);
  const orgAdmin = await prisma.user.create({
    data: {
      id: 'usr_orgadmin',
      email: 'admin@maincafe.com',
      passwordHash: orgAdminPasswordHash,
      name: 'Acme General Manager',
      role: Role.ORG_ADMIN,
      organizationId: org.id,
    },
  });

  for (const perm of ALL_PERMISSIONS) {
    await prisma.userPermission.create({
      data: {
        userId: orgAdmin.id,
        permission: perm,
      },
    });
  }

  // Assign both branches to Org Admin
  await prisma.userBranch.create({ data: { userId: orgAdmin.id, branchId: mainBranch.id } });
  await prisma.userBranch.create({ data: { userId: orgAdmin.id, branchId: branchTwo.id } });

  console.log('✅ Org Admin created: admin@maincafe.com');

  // 7. Seed Staff User
  const staffPasswordHash = await bcrypt.hash('Staff@123', 10);
  const staffUser = await prisma.user.create({
    data: {
      id: 'usr_staff_001',
      email: 'staff@maincafe.com',
      passwordHash: staffPasswordHash,
      name: 'Rahul Counter Staff',
      role: Role.STAFF,
      organizationId: org.id,
    },
  });

  for (const perm of STAFF_DEFAULT_PERMISSIONS) {
    await prisma.userPermission.create({
      data: {
        userId: staffUser.id,
        permission: perm,
      },
    });
  }

  // Assign Main Cafeteria to Staff
  await prisma.userBranch.create({ data: { userId: staffUser.id, branchId: mainBranch.id } });

  console.log('✅ Staff created: staff@maincafe.com (Assigned: Main Cafeteria)');

  // 8. Seed Products & Inventory
  const productsData = [
    { name: 'Veg Burger', price: 120.0, categories: ['Veg', 'Snacks', 'Lunch'], stock: 50 },
    { name: 'Cold Coffee', price: 80.0, categories: ['Beverages'], stock: 100 },
    { name: 'Deluxe Thali', price: 220.0, categories: ['Veg', 'Lunch', 'Dinner'], stock: 35 },
    { name: 'Chicken Roll', price: 150.0, categories: ['Non-Veg', 'Snacks'], stock: 40 },
    { name: 'Masala Chai', price: 25.0, categories: ['Beverages', 'Breakfast'], stock: 150 },
  ];

  for (const prod of productsData) {
    const createdProduct = await prisma.product.create({
      data: {
        organizationId: org.id,
        itemName: prod.name,
        price: prod.price,
        category: prod.categories,
        status: ProductStatus.ACTIVE,
      },
    });

    await prisma.branchInventory.create({
      data: {
        branchId: mainBranch.id,
        productId: createdProduct.id,
        quantity: prod.stock,
        lowStockThreshold: 10,
      },
    });
  }

  console.log('✅ 5 Products & Branch Inventory stock initialized.');

  // 9. Seed Physical Cards (MC-001 to MC-010)
  for (let i = 1; i <= 10; i++) {
    const cardNum = `MC-${String(i).padStart(3, '0')}`;
    const token = `qtk_mock_card_${String(i).padStart(3, '0')}_prod`;
    const status = i === 3 ? CardStatus.BLOCKED : CardStatus.AVAILABLE;

    await prisma.card.create({
      data: {
        organizationId: org.id,
        physicalCardNumber: cardNum,
        qrToken: token,
        status,
      },
    });
  }

  console.log('✅ 10 Physical Cards created (MC-001 to MC-010).');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

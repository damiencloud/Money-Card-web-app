import { PrismaClient, Role, UserStatus, BillingInterval, PermissionCode } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = Object.values(PermissionCode);

async function main() {
  console.log('🚀 Running Production Database Initialization...');

  // 1. Seed Global Subscription Plans
  const plans = [
    {
      id: 'plan_starter',
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
      id: 'plan_standard',
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
      id: 'plan_enterprise',
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
  console.log('✅ Subscription Plans Initialized (Starter, Standard, Enterprise)');

  // 2. Seed Master Super Admin Account
  const superAdminEmail = (process.env.INITIAL_SUPER_ADMIN_EMAIL || 'amigosiamoneycard@gmail.com').toLowerCase().trim();
  const superAdminPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'SecureProdPassword2026!';

  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      id: 'usr_superadmin',
      email: superAdminEmail,
      passwordHash,
      name: 'Platform Super Admin',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: true, // Prompts admin to set personal password on first login
      organizationId: null,
    },
  });

  // Assign full system permissions to Super Admin
  for (const perm of ALL_PERMISSIONS) {
    await prisma.userPermission.upsert({
      where: {
        userId_permission: {
          userId: superAdmin.id,
          permission: perm,
        },
      },
      update: {},
      create: {
        userId: superAdmin.id,
        permission: perm,
      },
    });
  }

  console.log(`✅ Master Super Admin initialized: ${superAdminEmail}`);
  console.log('🎉 Production Database is clean and ready for real cafeteria onboarding!');
}

main()
  .catch((e) => {
    console.error('❌ Production Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

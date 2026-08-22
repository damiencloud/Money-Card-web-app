import { PrismaClient, Role, PermissionCode, UserStatus } from '@prisma/client';
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

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const name = args[2] || 'Super Administrator';

  if (!email || !password) {
    console.error('\n❌ Usage: npm run create:superadmin <email> <password> [name]');
    console.error('Example: npm run create:superadmin admin2@example.com MyPass@123 "Second Super Admin"\n');
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    console.log(`⚠️ User with email ${cleanEmail} already exists (Role: ${existing.role}).`);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: Role.SUPER_ADMIN,
        organizationId: null,
        passwordHash,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });

    for (const perm of ALL_PERMISSIONS) {
      await prisma.userPermission.upsert({
        where: {
          userId_permission: {
            userId: updated.id,
            permission: perm,
          },
        },
        create: {
          userId: updated.id,
          permission: perm,
        },
        update: {},
      });
    }

    console.log(`✅ Promoted and updated user ${cleanEmail} to SUPER_ADMIN successfully!\n`);
  } else {
    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        name,
        passwordHash,
        role: Role.SUPER_ADMIN,
        organizationId: null,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
        tokenVersion: 1,
      },
    });

    for (const perm of ALL_PERMISSIONS) {
      await prisma.userPermission.create({
        data: {
          userId: newUser.id,
          permission: perm,
        },
      });
    }

    console.log(`\n🎉 New Super Admin account created successfully!`);
    console.log(`   - ID: ${newUser.id}`);
    console.log(`   - Name: ${newUser.name}`);
    console.log(`   - Email: ${newUser.email}`);
    console.log(`   - Role: ${newUser.role}`);
    console.log(`   - Status: ${newUser.status}\n`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Error creating Super Admin:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

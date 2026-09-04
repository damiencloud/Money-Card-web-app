import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log('1. Adding CARD_DELETED to CardHistoryAction enum if not exists...');
  await prisma.$executeRawUnsafe(`
    ALTER TYPE "CardHistoryAction" ADD VALUE IF NOT EXISTS 'CARD_DELETED';
  `);

  console.log('2. Making customer_history_events.cardId nullable and setting ON DELETE SET NULL...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "customer_history_events" ALTER COLUMN "cardId" DROP NOT NULL;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "customer_history_events" DROP CONSTRAINT IF EXISTS "customer_history_events_cardId_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "customer_history_events"
    ADD CONSTRAINT "customer_history_events_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  `);

  console.log('3. Making card_sessions.cardId nullable and setting ON DELETE SET NULL...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "card_sessions" ALTER COLUMN "cardId" DROP NOT NULL;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "card_sessions" DROP CONSTRAINT IF EXISTS "card_sessions_cardId_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "card_sessions"
    ADD CONSTRAINT "card_sessions_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  `);

  console.log('✓ Migration completed successfully.');
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});

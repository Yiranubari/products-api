import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const TOTAL = 200_000;
const CATEGORIES = [
  "Electronics",
  "Books",
  "Clothing",
  "Home",
  "Toys",
  "Sports",
  "Beauty",
  "Grocery",
  "Automotive",
  "Garden",
];

async function main() {
  console.log("Clearing existing products...");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "products" RESTART IDENTITY;`);

  console.log(
    `Inserting ${TOTAL.toLocaleString()} products in one statement...`,
  );
  const start = Date.now();

  const categoriesSql = CATEGORIES.map((c) => `'${c}'`).join(", ");

  await prisma.$executeRawUnsafe(`
    INSERT INTO "products" (name, category, price, created_at, updated_at)
    SELECT
      'Product ' || g.n,
      (ARRAY[${categoriesSql}])[1 + floor(random() * ${CATEGORIES.length})::int],
      round((random() * 990 + 10)::numeric, 2),
      date_trunc('day', now() - (floor(random() * 365)::int || ' days')::interval),
      now()
    FROM generate_series(1, ${TOTAL}) AS g(n);
  `);

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  const count = await prisma.product.count();
  console.log(`Done. ${count.toLocaleString()} products inserted in ${secs}s.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

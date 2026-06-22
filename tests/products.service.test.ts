import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";
import { ProductsService } from "@/modules/products/products.service";
import type { Cursor } from "@/types/product";

const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
const service = new ProductsService(prisma);

const PREFIX = "__pgtest";
const CAT = "__pgtest_main";
const CAT_OTHER = "__pgtest_other";

const T_OLD = new Date("2020-01-01T00:00:00.000Z");
const T_NEW = new Date("2020-01-02T00:00:00.000Z");
const T_NEWEST = new Date("2020-01-03T00:00:00.000Z");

async function cleanup() {
  await prisma.product.deleteMany({
    where: { category: { startsWith: PREFIX } },
  });
}

beforeAll(async () => {
  await cleanup();
  await prisma.product.createMany({
    data: [
      ...Array.from({ length: 15 }, (_, n) => ({
        name: `old-${n}`,
        category: CAT,
        price: 10,
        createdAt: T_OLD,
      })),
      ...Array.from({ length: 15 }, (_, n) => ({
        name: `new-${n}`,
        category: CAT,
        price: 20,
        createdAt: T_NEW,
      })),
    ],
  });
  await prisma.product.createMany({
    data: Array.from({ length: 5 }, (_, n) => ({
      name: `other-${n}`,
      category: CAT_OTHER,
      price: 5,
      createdAt: T_NEW,
    })),
  });
}, 30_000);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
}, 30_000);

async function walkForward(limit: number): Promise<number[]> {
  const ids: number[] = [];
  let cursor: Cursor | undefined;
  for (let i = 0; i < 100; i++) {
    const res = await service.list({
      limit,
      category: CAT,
      direction: "next",
      cursor,
    });
    ids.push(...res.data.map((p) => p.id));
    if (!res.hasNext || !res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return ids;
}

describe("ProductsService.list", () => {
  it("returns newest-first and respects the limit", async () => {
    const res = await service.list({
      limit: 5,
      category: CAT,
      direction: "next",
    });
    expect(res.data).toHaveLength(5);
    expect(res.hasPrev).toBe(false);
    expect(res.prevCursor).toBeNull();
    const ids = res.data.map((p) => p.id);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });

  it("only returns rows from the requested category", async () => {
    const res = await service.list({
      limit: 50,
      category: CAT,
      direction: "next",
    });
    expect(res.data.every((p) => p.category === CAT)).toBe(true);
    expect(res.data).toHaveLength(30);
  });

  it("walks the whole category with no duplicates and no misses", async () => {
    const walked = await walkForward(7);
    const oracle = await prisma.product.findMany({
      where: { category: CAT },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    expect(walked).toEqual(oracle.map((r) => r.id));
    expect(new Set(walked).size).toBe(walked.length);
  });

  it("round-trips forward then backward to the identical first page", async () => {
    const page1 = await service.list({
      limit: 5,
      category: CAT,
      direction: "next",
    });
    const page2 = await service.list({
      limit: 5,
      category: CAT,
      direction: "next",
      cursor: page1.nextCursor!,
    });
    const back = await service.list({
      limit: 5,
      category: CAT,
      direction: "prev",
      cursor: page2.prevCursor!,
    });
    expect(back.data.map((p) => p.id)).toEqual(page1.data.map((p) => p.id));
  });

  it("stays stable when new rows are inserted mid-session", async () => {
    const page1 = await service.list({
      limit: 5,
      category: CAT,
      direction: "next",
    });
    const page1Ids = page1.data.map((p) => p.id);

    await prisma.product.createMany({
      data: Array.from({ length: 5 }, (_, n) => ({
        name: `inserted-${n}`,
        category: CAT,
        price: 99,
        createdAt: T_NEWEST,
      })),
    });
    const insertedIds = (
      await prisma.product.findMany({
        where: { category: CAT, createdAt: T_NEWEST },
        select: { id: true },
      })
    ).map((r) => r.id);

    const page2 = await service.list({
      limit: 5,
      category: CAT,
      direction: "next",
      cursor: page1.nextCursor!,
    });
    const page2Ids = page2.data.map((p) => p.id);

    expect(page2Ids.some((id) => page1Ids.includes(id))).toBe(false);
    expect(page2Ids.some((id) => insertedIds.includes(id))).toBe(false);

    await prisma.product.deleteMany({
      where: { category: CAT, createdAt: T_NEWEST },
    });
  }, 30_000);

  it("handles an empty result cleanly", async () => {
    const res = await service.list({
      limit: 5,
      category: "__pgtest_nonexistent",
      direction: "next",
    });
    expect(res.data).toEqual([]);
    expect(res.hasNext).toBe(false);
    expect(res.nextCursor).toBeNull();
    expect(res.prevCursor).toBeNull();
  });
});

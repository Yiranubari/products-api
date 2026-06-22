import { PrismaClient, Prisma } from "@prisma/client";
import type { Product } from "@prisma/client";
import { Cursor, ListParams, ListResult, Direction } from "@/types/product";

export class ProductsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(params: ListParams): Promise<ListResult> {
    const { limit, category, cursor, direction } = params;
    const goingBack = direction === "prev";

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = goingBack
      ? [{ createdAt: "asc" }, { id: "asc" }]
      : [{ createdAt: "desc" }, { id: "desc" }];

    const where: Prisma.ProductWhereInput = {
      ...(category ? { category } : {}),
      ...(this.keysetFilter(cursor, direction) ?? {}),
    };

    const rows = await this.prisma.product.findMany({
      where,
      orderBy,
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    if (goingBack) page.reverse();

    const first = page[0] ?? null;
    const last = page[page.length - 1] ?? null;
    const cur = (p: Product | null): Cursor | null =>
      p ? { createdAt: p.createdAt, id: p.id } : null;

    let hasNext: boolean;
    let hasPrev: boolean;
    if (!cursor) {
      hasPrev = false;
      hasNext = hasMore;
    } else if (direction === "next") {
      hasPrev = true;
      hasNext = hasMore;
    } else {
      hasNext = true;
      hasPrev = hasMore;
    }

    return {
      data: page,
      nextCursor: hasNext ? cur(last) : null,
      prevCursor: hasPrev ? cur(first) : null,
      hasNext,
      hasPrev,
    };
  }

  private keysetFilter(
    cursor: Cursor | undefined,
    direction: Direction,
  ): Prisma.ProductWhereInput | null {
    if (!cursor) return null;
    const { createdAt, id } = cursor;

    return direction === "next"
      ? {
          OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
        }
      : {
          OR: [{ createdAt: { gt: createdAt } }, { createdAt, id: { gt: id } }],
        };
  }
}

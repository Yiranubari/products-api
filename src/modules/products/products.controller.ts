import { Request, Response } from "express";
import { ProductsService } from "@/modules/products/products.service";
import { listQuerySchema } from "@/modules/products/products.schema";
import { encodeCursor } from "@/lib/cursor";

export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuerySchema.parse(req.query);

    const result = await this.service.list({
      limit: query.limit,
      category: query.category,
      cursor: query.cursor,
      direction: query.direction,
    });

    res.json({
      data: result.data.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      pageInfo: {
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
        nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
        prevCursor: result.prevCursor ? encodeCursor(result.prevCursor) : null,
      },
    });
  };
}

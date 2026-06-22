import { Router } from "express";
import { ProductsController } from "@/modules/products/products.controller";
import { ProductsService } from "@/modules/products/products.service";
import { asyncHandler } from "@/middleware/async-handler";
import { prisma } from "@/db/client";

const service = new ProductsService(prisma);
const controller = new ProductsController(service);

const router = Router();

router.get("/", asyncHandler(controller.list));

export { router as productsRouter };

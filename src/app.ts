import express, { Application } from "express";
import { productsRouter } from "@/modules/products/products.routes";
import { errorHandler } from "@/middleware/error-handler";

export function createApp(): Application {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/products", productsRouter);

  app.use(errorHandler);

  return app;
}

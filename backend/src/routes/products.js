import express from "express";
import { prisma } from "../db.js";

export const productsRouter = express.Router();

// GET /products?search=
productsRouter.get("/", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const where = search
    ? { isActive: true, name: { contains: search, mode: "insensitive" } }
    : { isActive: true };

  const items = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { name: "asc" }
  });
  res.json(items);
});

// POST /products
productsRouter.post("/", async (req, res) => {
  const { name, categoryId, unit, costPrice, salePrice, stockQty, minStockQty } = req.body || {};
  if (!name || !unit) return res.status(400).json({ error: "NAME_UNIT_REQUIRED" });

  const p = await prisma.product.create({
    data: {
      name,
      categoryId: categoryId ?? null,
      unit,
      costPrice: costPrice ?? 0,
      salePrice: salePrice ?? 0,
      stockQty: stockQty ?? 0,
      minStockQty: minStockQty ?? 0
    }
  });
  res.json(p);
});

// PATCH /products/:id
productsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body || {};
  const p = await prisma.product.update({ where: { id }, data });
  res.json(p);
});

// DELETE /products/:id (soft)
productsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const p = await prisma.product.update({ where: { id }, data: { isActive: false } });
  res.json(p);
});

import express from "express";
import { prisma } from "../db.js";

export const purchasesRouter = express.Router();

// POST /purchases
// body: { supplierId?, note?, items:[{productId, qty, costPrice, salePrice?}] }
purchasesRouter.post("/", async (req, res) => {
  const { supplierId, note, items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "ITEMS_REQUIRED" });

  const createdBy = req.user.id;

  const result = await prisma.$transaction(async (tx) => {
    let totalCost = 0;
    for (const it of items) {
      totalCost += Number(it.qty) * Number(it.costPrice);
    }

    const purchase = await tx.purchase.create({
      data: { supplierId: supplierId ?? null, note: note ?? null, totalCost, createdBy }
    });

    for (const it of items) {
      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: Number(it.productId),
          qty: it.qty,
          costPrice: it.costPrice
        }
      });

      // Qoldiq oshadi + tannarx update + (ixtiyoriy) sotuv narx update
      await tx.product.update({
        where: { id: Number(it.productId) },
        data: {
          stockQty: { increment: it.qty },
          costPrice: it.costPrice,
          ...(it.salePrice != null ? { salePrice: it.salePrice } : {})
        }
      });
    }

    return purchase;
  });

  res.json(result);
});

// GET /purchases
purchasesRouter.get("/", async (req, res) => {
  const list = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: true, user: true, items: { include: { product: true } } }
  });
  res.json(list);
});

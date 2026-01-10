import express from "express";
import { prisma } from "../db.js";

export const salesRouter = express.Router();

/**
 * Receipt counter:
 * - Counter table: { key: "receipt_no", value: BigInt }
 * - Each sale gets unique receiptNo
 */
async function nextReceiptNo(tx) {
  const key = "receipt_no";
  const row = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1n },
    update: { value: { increment: 1n } },
  });
  return row.value; // BigInt
}

/**
 * POST /sales
 * Body:
 * {
 *   paymentType: "cash" | "card" | "mixed" | "credit",
 *   discount?: number,
 *   cashAmount?: number,   // only for mixed
 *   cardAmount?: number,   // only for mixed
 *   customerId?: number,   // required for credit
 *   items: [{ productId: number, qty: number }]
 * }
 *
 * Seller is taken from token: req.user.id (login qilgan kassir).
 */
salesRouter.post("/", async (req, res) => {
  try {
    const sellerId = req.user?.id; // ✅ avtomatik sotuvchi
    if (!sellerId) return res.status(401).json({ error: "NO_AUTH_USER" });

    const {
      paymentType,
      discount = 0,
      cashAmount = 0,
      cardAmount = 0,
      customerId = null,
      items,
    } = req.body || {};

    if (!paymentType) return res.status(400).json({ error: "PAYMENT_TYPE_REQUIRED" });
    if (!["cash", "card", "mixed", "credit"].includes(paymentType)) {
      return res.status(400).json({ error: "PAYMENT_TYPE_INVALID" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "ITEMS_REQUIRED" });
    }

    if (paymentType === "credit" && !customerId) {
      return res.status(400).json({ error: "CUSTOMER_REQUIRED_FOR_CREDIT" });
    }

    // mixed bo'lsa, kamida bittasi 0 dan katta bo'lsin
    if (paymentType === "mixed") {
      const ca = Number(cashAmount || 0);
      const cda = Number(cardAmount || 0);
      if (ca <= 0 && cda <= 0) {
        return res.status(400).json({ error: "MIXED_REQUIRES_CASH_OR_CARD" });
      }
    }

    const disc = Number(discount || 0);
    if (Number.isNaN(disc) || disc < 0) {
      return res.status(400).json({ error: "DISCOUNT_INVALID" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) productlarni olib kelamiz
      const productIds = items.map((x) => Number(x.productId)).filter(Boolean);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });

      const pMap = new Map(products.map((p) => [p.id, p]));

      // 2) total hisob + stock tekshiruv
      let rawTotal = 0;

      for (const it of items) {
        const pid = Number(it.productId);
        const qty = Number(it.qty);

        if (!pid || Number.isNaN(pid)) throw new Error("PRODUCT_ID_INVALID");
        if (!qty || Number.isNaN(qty) || qty <= 0) throw new Error("QTY_INVALID");

        const p = pMap.get(pid);
        if (!p) throw new Error("PRODUCT_NOT_FOUND");

        const stock = Number(p.stockQty);
        if (stock < qty) {
          const err = new Error("STOCK_NOT_ENOUGH");
          err.meta = { productName: p.name, stock, requested: qty };
          throw err;
        }

        rawTotal += qty * Number(p.salePrice);
      }

      const finalTotal = Math.max(rawTotal - disc, 0);

      // 3) Receipt raqam
      const receiptNo = await nextReceiptNo(tx);

      // 4) Sale yaratish
      const sale = await tx.sale.create({
        data: {
          receiptNo,
          sellerId: Number(sellerId),
          total: finalTotal,
          discount: disc,
          paymentType,
          cashAmount: paymentType === "mixed" ? Number(cashAmount || 0) : 0,
          cardAmount: paymentType === "mixed" ? Number(cardAmount || 0) : 0,
          customerId: paymentType === "credit" ? Number(customerId) : null,
        },
      });

      // 5) Sale items + stock decrement
      for (const it of items) {
        const pid = Number(it.productId);
        const qty = Number(it.qty);
        const p = pMap.get(pid);

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: pid,
            qty,
            salePrice: p.salePrice, // snapshot
          },
        });

        await tx.product.update({
          where: { id: pid },
          data: { stockQty: { decrement: qty } },
        });
      }

      // 6) Agar nasiya bo'lsa Debt yozamiz
      if (paymentType === "credit") {
        await tx.debt.create({
          data: {
            customerId: Number(customerId),
            saleId: sale.id,
            debtTotal: finalTotal,
            paidTotal: 0,
            status: "open",
          },
        });
      }

      // 7) Return full sale for чек
      const full = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          seller: true,
          customer: true,
          items: { include: { product: true } },
          debt: true,
        },
      });

      return full;
    });

    return res.json(result);
  } catch (e) {
    // Prisma error yoki custom error
    if (e?.message === "STOCK_NOT_ENOUGH") {
      return res.status(400).json({
        error: "STOCK_NOT_ENOUGH",
        meta: e.meta || null,
      });
    }

    if (
      ["PRODUCT_ID_INVALID", "QTY_INVALID", "PRODUCT_NOT_FOUND"].includes(e?.message)
    ) {
      return res.status(400).json({ error: e.message });
    }

    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/**
 * GET /sales?from=YYYY-MM-DD&to=YYYY-MM-DD&paymentType=cash|card|mixed|credit
 */
salesRouter.get("/", async (req, res) => {
  try {
    const { from, to, paymentType } = req.query;

    const where = {};

    if (paymentType && ["cash", "card", "mixed", "credit"].includes(paymentType)) {
      where.paymentType = paymentType;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const list = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        seller: true,
        customer: true,
        items: { include: { product: true } },
        debt: true,
      },
    });

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

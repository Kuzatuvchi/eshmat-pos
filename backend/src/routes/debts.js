import express from "express";
import { prisma } from "../db.js";

export const debtsRouter = express.Router();

// GET /debts?status=open|closed
debtsRouter.get("/", async (req, res) => {
  const status = req.query.status?.toString();
  const where = status ? { status } : {};
  const list = await prisma.debt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: true, sale: { include: { seller: true } }, payments: true }
  });
  res.json(list);
});

// POST /debts/:id/payments
// body: { amount, paymentType }
debtsRouter.post("/:id/payments", async (req, res) => {
  const id = Number(req.params.id);
  const { amount, paymentType } = req.body || {};
  const a = Number(amount);
  if (!a || a <= 0) return res.status(400).json({ error: "BAD_AMOUNT" });
  if (!paymentType || !["cash", "card"].includes(paymentType)) return res.status(400).json({ error: "BAD_PAYMENT_TYPE" });

  const result = await prisma.$transaction(async (tx) => {
    const debt = await tx.debt.findUnique({ where: { id } });
    if (!debt) throw new Error("DEBT_NOT_FOUND");
    if (debt.status === "closed") throw new Error("DEBT_ALREADY_CLOSED");

    await tx.debtPayment.create({
      data: { debtId: id, amount: a, paymentType, createdBy: req.user.id }
    });

    const updated = await tx.debt.update({
      where: { id },
      data: { paidTotal: { increment: a } }
    });

    if (Number(updated.paidTotal) >= Number(updated.debtTotal)) {
      await tx.debt.update({ where: { id }, data: { status: "closed" } });
    }

    return tx.debt.findUnique({
      where: { id },
      include: { customer: true, sale: true, payments: true }
    });
  });

  res.json(result);
});

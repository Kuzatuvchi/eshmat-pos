import express from "express";
import { prisma } from "../db.js";

export const reportsRouter = express.Router();

// GET /reports/daily?date=YYYY-MM-DD
reportsRouter.get("/daily", async (req, res) => {
  const dateStr = (req.query.date || "").toString();
  const d = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(d); start.setHours(0,0,0,0);
  const end = new Date(d); end.setHours(23,59,59,999);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { items: true }
  });

  let total = 0, cash = 0, card = 0, credit = 0;
  for (const s of sales) {
    total += Number(s.total);
    if (s.paymentType === "cash") cash += Number(s.total);
    if (s.paymentType === "card") card += Number(s.total);
    if (s.paymentType === "mixed") { cash += Number(s.cashAmount); card += Number(s.cardAmount); }
    if (s.paymentType === "credit") credit += Number(s.total);
  }

  res.json({ date: start.toISOString().slice(0,10), total, cash, card, credit, count: sales.length });
});

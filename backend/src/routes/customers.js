import express from "express";
import { prisma } from "../db.js";

export const customersRouter = express.Router();

// GET /customers?search=
customersRouter.get("/", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const where = search
    ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } }
        ]
      }
    : {};

  const list = await prisma.customer.findMany({ where, orderBy: { fullName: "asc" } });
  res.json(list);
});

// POST /customers
customersRouter.post("/", async (req, res) => {
  const { fullName, phone, address } = req.body || {};
  if (!fullName || !phone) return res.status(400).json({ error: "NAME_PHONE_REQUIRED" });

  const c = await prisma.customer.create({ data: { fullName, phone, address: address ?? null } });
  res.json(c);
});

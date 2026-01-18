import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { purchasesRouter } from "./routes/purchases.js";
import { salesRouter } from "./routes/sales.js";
import { customersRouter } from "./routes/customers.js";
import { debtsRouter } from "./routes/debts.js";
import { reportsRouter } from "./routes/reports.js";
import { authRequired } from "./middleware/auth.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));

// ✅ CORS — beta uchun eng oson va 100% ishlaydi
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Preflight (OPTIONS) ni ham alohida qo‘llab yuboramiz
app.options("*", cors());

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, app: process.env.APP_NAME || "eshmat-pos" });
});

app.use("/auth", authRouter);

// Protected
app.use("/products", authRequired, productsRouter);
app.use("/purchases", authRequired, purchasesRouter);
app.use("/sales", authRequired, salesRouter);
app.use("/customers", authRequired, customersRouter);
app.use("/debts", authRequired, debtsRouter);
app.use("/reports", authRequired, reportsRouter);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`API running on :${port}`));

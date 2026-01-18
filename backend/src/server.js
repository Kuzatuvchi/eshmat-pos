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

const allow = [
  "https://eshmat-9vkmils8a-sarvarbeks-projects-9923857e.vercel.app",
   /^https:\/\/eshmat-.*\.vercel\.app$/,
];

const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allow.some(o =>
          o instanceof RegExp ? o.test(origin) : o === origin
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



app.get("/", (req, res) => {
  res.json({ ok: true, app: process.env.APP_NAME });
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

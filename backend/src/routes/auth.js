import express from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db.js";
import { signToken } from "../utils.js";
import { authRequired } from "../middleware/auth.js";

export const authRouter = express.Router();

// GET /auth/me
authRouter.get("/me", authRequired, async (req, res) => {
  res.json({
    id: req.user.id,
    fullName: req.user.fullName,
    role: req.user.role,
    login: req.user.login
  });
});


// POST /auth/login
authRouter.post("/login", async (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: "LOGIN_PASSWORD_REQUIRED" });

  const user = await prisma.user.findUnique({ where: { login } });
  if (!user || !user.isActive) return res.status(401).json({ error: "BAD_CREDENTIALS" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "BAD_CREDENTIALS" });

  const token = signToken(
    { id: user.id, role: user.role, fullName: user.fullName, login: user.login },
    process.env.JWT_SECRET
  );

  res.json({ token, user: { id: user.id, role: user.role, fullName: user.fullName, login: user.login } });
});

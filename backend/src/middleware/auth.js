import { verifyToken } from "../utils.js";

export function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "TOKEN_REQUIRED" });

  try {
    const user = verifyToken(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALID" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ error: "NO_USER" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  };
}

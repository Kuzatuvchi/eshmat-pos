import jwt from "jsonwebtoken";

export function signToken(payload, secret, expiresIn = "7d") {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

export function toMoney(n) {
  return Number(n || 0);
}

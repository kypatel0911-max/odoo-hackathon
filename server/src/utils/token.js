import jwt from "jsonwebtoken";

const secret = () => process.env.JWT_SECRET;
const expiresIn = () => process.env.JWT_EXPIRES_IN || "7d";

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, secret(), { expiresIn: expiresIn() });
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}

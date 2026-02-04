
import jwt from "jsonwebtoken";

// middleware to require a valid Bearer JWT
export default function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Authorization header missing" });

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Bad authorization format" });
  }

  const token = parts[1];
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not configured");
      return res.status(500).json({ error: "Server config issue" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // keep only small useful info on req.user
    req.user = { id: payload.uid, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid or expired" });
  }
}


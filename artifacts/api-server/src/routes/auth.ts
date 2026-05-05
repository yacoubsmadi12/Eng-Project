import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const found = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!found.length || found[0].password !== password) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const u = found[0];
  const user = { username: u.username, displayName: u.displayName, plannerName: u.plannerName, role: u.role };
  (req.session as any).user = user;
  res.json(user);
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", (req, res) => {
  const user = (req.session as any).user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(user);
});

export default router;

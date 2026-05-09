import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const user = (req.session as any)?.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

router.get("/users", requireAdmin, async (_req, res) => {
  const users = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    plannerName: usersTable.plannerName,
    role: usersTable.role,
  }).from(usersTable);
  res.json(users);
});

router.post("/users", requireAdmin, async (req, res) => {
  const { username, password, displayName, plannerName, role } = req.body as {
    username: string; password: string; displayName: string; plannerName: string; role?: string;
  };
  if (!username || !password || !displayName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const allowedRoles = ["user", "viewer"];
  const assignedRole = allowedRoles.includes(role ?? "") ? role! : "user";
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length) {
    res.status(400).json({ error: "Username already exists" });
    return;
  }
  const [created] = await db.insert(usersTable).values({
    username, password, displayName, plannerName: plannerName || displayName, role: assignedRole
  }).returning({
    id: usersTable.id, username: usersTable.username,
    displayName: usersTable.displayName, plannerName: usersTable.plannerName, role: usersTable.role
  });
  res.status(201).json(created);
});

router.put("/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { displayName, plannerName, role, password } = req.body as {
    displayName?: string; plannerName?: string; role?: string; password?: string;
  };
  const allowedRoles = ["user", "viewer", "admin"];
  type UserUpdate = { displayName?: string; plannerName?: string; role?: string; password?: string; };
  const updates: UserUpdate = {};
  if (displayName) updates.displayName = displayName;
  if (plannerName) updates.plannerName = plannerName;
  if (role && allowedRoles.includes(role)) updates.role = role;
  if (password) updates.password = password;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" }); return;
  }
  const found = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!found.length) { res.status(404).json({ error: "User not found" }); return; }
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
    id: usersTable.id, username: usersTable.username,
    displayName: usersTable.displayName, plannerName: usersTable.plannerName, role: usersTable.role
  });
  res.json(updated);
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const found = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (found.length && found[0].role === "admin") {
    res.status(403).json({ error: "Cannot delete the admin account" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;

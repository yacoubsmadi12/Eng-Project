import { Router } from "express";
import { db, plansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.get("/plans", requireAuth, async (req, res) => {
  const user = (req.session as any).user;
  const rows = await db.select().from(plansTable);
  const plans = rows.map(r => ({
    id: r.clientId,
    teamName: r.teamName,
    plannerName: r.plannerName,
    planName: r.planName,
    color: r.color,
    km: r.km,
    isNewSites: r.isNewSites,
    hqSiteId: r.hqSiteId,
    dayGroups: r.dayGroups,
    siteIds: r.siteIds,
  }));

  res.json(plans);
});

router.post("/plans/bulk", requireAuth, async (req, res) => {
  const plans = req.body as any[];
  if (!Array.isArray(plans)) { res.status(400).json({ error: "Expected array" }); return; }

  await db.delete(plansTable);

  if (plans.length > 0) {
    const rows = plans.map(p => ({
      clientId: p.id,
      teamName: p.teamName,
      plannerName: p.plannerName,
      planName: p.planName || "",
      color: p.color || "#00d4ff",
      km: p.km || 0,
      isNewSites: p.isNewSites || false,
      hqSiteId: p.hqSiteId || null,
      dayGroups: p.dayGroups,
      siteIds: p.siteIds,
    }));
    await db.insert(plansTable).values(rows);
  }

  res.json({ message: `Saved ${plans.length} plans` });
});

router.put("/plans/:id", requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.id);
  if (isNaN(clientId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const p = req.body as any;
  await db.update(plansTable).set({
    teamName: p.teamName,
    plannerName: p.plannerName,
    planName: p.planName || "",
    color: p.color,
    km: p.km || 0,
    isNewSites: p.isNewSites || false,
    hqSiteId: p.hqSiteId || null,
    dayGroups: p.dayGroups,
    siteIds: p.siteIds,
  }).where(eq(plansTable.clientId, clientId));
  res.json({ message: "Updated" });
});

router.delete("/plans/:id", requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.id);
  if (isNaN(clientId)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(plansTable).where(eq(plansTable.clientId, clientId));
  res.json({ message: "Deleted" });
});

router.delete("/plans", requireAuth, async (_req, res) => {
  await db.delete(plansTable);
  res.json({ message: "All plans cleared" });
});

router.post("/plans/append", requireAuth, (req, res, next) => {
  const role = (req.session as any)?.user?.role;
  if (role !== "admin" && role !== "user") {
    res.status(403).json({ error: "Not allowed" });
    return;
  }
  next();
}, async (req, res) => {
  const plans = req.body as any[];
  if (!Array.isArray(plans)) { res.status(400).json({ error: "Expected array" }); return; }
  if (!plans.length) { res.json({ message: "No plans to append" }); return; }

  const existing = await db.select({ clientId: plansTable.clientId }).from(plansTable);
  const usedIds = new Set(existing.map(r => r.clientId));
  let nextId = usedIds.size ? Math.max(...usedIds) + 1 : 1;

  const rows = plans.map(p => ({
    clientId: (p.id && !usedIds.has(p.id)) ? p.id : nextId++,
    teamName: p.teamName,
    plannerName: p.plannerName,
    planName: p.planName || "",
    color: p.color || "#00d4ff",
    km: p.km || 0,
    isNewSites: p.isNewSites || false,
    hqSiteId: p.hqSiteId || null,
    dayGroups: p.dayGroups,
    siteIds: p.siteIds,
  }));

  await db.insert(plansTable).values(rows);
  res.status(201).json({ message: `Appended ${rows.length} plans` });
});

export default router;

import { Router } from "express";
import { db, sitesTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.get("/sites", requireAuth, async (_req, res) => {
  const rows = await db.select().from(sitesTable);
  const sites = rows.map(r => ({
    id: r.siteId, name: r.name, code: r.code, lat: r.lat, lng: r.lng,
    gov: r.gov, dist: r.dist, subdist: r.subdist, key: r.key,
    pwrclass: r.pwrclass, vendor: r.vendor, cat: r.cat, owner: r.owner,
    tl: r.tl, mw: r.mw, fiber: r.fiber, dwdm: r.dwdm, olt: r.olt,
    ipran: r.ipran, fttm: r.fttm, epa: r.epa, freecool: r.freecool,
    gen: r.gen, sharing: r.sharing, ibs: r.ibs,
    ...(r.extra as object || {}),
  }));
  res.json(sites);
});

router.post("/sites/bulk", requireAuth, async (req, res) => {
  const sites = req.body as any[];
  if (!Array.isArray(sites)) { res.status(400).json({ error: "Expected array" }); return; }

  await db.delete(sitesTable);

  if (sites.length > 0) {
    const rows = sites.map(s => ({
      siteId: String(s.id),
      name: s.name || "",
      code: s.code || "",
      lat: s.lat,
      lng: s.lng,
      gov: s.gov || "",
      dist: s.dist || "",
      subdist: s.subdist || "",
      key: s.key || "",
      pwrclass: s.pwrclass || "",
      vendor: s.vendor || "",
      cat: s.cat || "",
      owner: s.owner || "",
      tl: s.tl || "No",
      mw: s.mw || "No",
      fiber: s.fiber || "No",
      dwdm: s.dwdm || "No",
      olt: s.olt || "No",
      ipran: s.ipran || "No",
      fttm: s.fttm || "No",
      epa: s.epa || "No",
      freecool: s.freecool || "No",
      gen: s.gen || "No",
      sharing: s.sharing || "No",
      ibs: s.ibs || "No",
      extra: {
        gisgov: s.gisgov || "",
        loc: s.loc || "",
        nb: s.nb || "",
        nbcode: s.nbcode || "",
        ftthtype: s.ftthtype || "",
        ftthcode: s.ftthcode || "",
        fttharea: s.fttharea || "",
        dlskey: s.dlskey || "",
        trc: s.trc || "",
        distHQ: s.distHQ || "",
        perdHQ: s.perdHQ || "",
        distAQ: s.distAQ || "",
        perdAQ: s.perdAQ || "",
        type1: s.type1 || "",
        struct: s.struct || "",
        type2: s.type2 || "",
        hight: s.hight || "",
        opdate: s.opdate || "",
        contact: s.contact || "",
        contactn: s.contactn || "",
      },
    }));

    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.insert(sitesTable).values(rows.slice(i, i + CHUNK));
    }
  }

  res.json({ message: `Saved ${sites.length} sites` });
});

router.delete("/sites", requireAuth, async (_req, res) => {
  await db.delete(sitesTable);
  res.json({ message: "All sites cleared" });
});

export default router;

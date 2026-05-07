import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { generatePlans, type SitePoint } from "@/lib/planning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { exportSinglePlan, exportAllPlans } from "@/lib/export";

interface PlanRow { siteId: string; plannerName: string; }
interface NewSiteRow extends SitePoint {}

function normKey(k: string) { return k.toLowerCase().replace(/[\s_\n\r]+/g, ""); }
function findCol(keys: string[], normKeys: string[], ...frags: string[]): string | null {
  for (const frag of frags) {
    const i = normKeys.findIndex(n => n.includes(frag));
    if (i >= 0) return keys[i];
  }
  return null;
}

function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      } catch (err: any) {
        reject(new Error("Failed to read file: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsBinaryString(file);
  });
}

function CapInfo({ n, nT, nD, mPD }: { n: number; nT: number; nD: number; mPD: number }) {
  if (!n) return null;
  if (nT && nD && mPD) {
    const cap = nT * nD * mPD;
    const ok = n <= cap;
    return (
      <div className={`text-xs font-mono px-3 py-2 rounded-md border ${ok ? "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30" : "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30"}`}>
        {n} sites · {nT} teams × {nD} days × {mPD}/day = {cap} capacity{ok ? " ✅" : ` ⚠️ over by ${n - cap}`}
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground font-mono px-3 py-2 rounded-md border bg-muted/40">
      {n} sites loaded · Fill in team requirements above
    </div>
  );
}

function PlanNameBar({ planName, onChange }: { planName: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-0 border rounded-md overflow-hidden bg-card">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-3 py-2 whitespace-nowrap border-r">
        Plan Name
      </span>
      <Input
        type="text"
        placeholder="e.g. Q2 Field Campaign 2025"
        value={planName}
        onChange={e => onChange(e.target.value)}
        className="h-auto border-0 rounded-none text-sm py-2 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}

function HqIdBar({ hqId, onHqIdChange, siteName }: { hqId: string; onHqIdChange: (v: string) => void; siteName?: string | null }) {
  return (
    <div className="flex items-center gap-0 border rounded-md overflow-hidden bg-card">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-3 py-2 whitespace-nowrap border-r">
        🏠 Start Site ID
      </span>
      <Input
        type="text"
        placeholder="e.g. 911"
        value={hqId}
        onChange={e => onHqIdChange(e.target.value || "911")}
        className="h-auto border-0 rounded-none text-sm py-2 focus-visible:ring-0 focus-visible:ring-offset-0 w-24 flex-shrink-0"
      />
      {siteName !== undefined && (
        <span className={`flex items-center gap-2 px-3 text-xs font-mono truncate flex-1 ${siteName ? "text-green-500" : "text-red-400"}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${siteName ? "bg-green-500" : "bg-red-500"}`} />
          {siteName ? siteName : "Site not found"}
        </span>
      )}
    </div>
  );
}

function RequirementsForm({
  values, onChange
}: {
  values: { nTeams: string; nDays: string; maxPD: string; plannerName: string; planName: string };
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { key: "nTeams", label: "Number of Teams", placeholder: "e.g. 3" },
        { key: "nDays", label: "Working Days", placeholder: "e.g. 5" },
        { key: "maxPD", label: "Max Sites/Day/Team", placeholder: "e.g. 8" },
        { key: "plannerName", label: "Default Planner Name", placeholder: "e.g. Ahmed" },
      ].map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <Input
            type={["nTeams", "nDays", "maxPD"].includes(key) ? "number" : "text"}
            min={1}
            placeholder={placeholder}
            value={(values as any)[key]}
            onChange={e => onChange(key, e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      ))}
    </div>
  );
}

function GeneratedPlanList({ plans, sites, onSave, onSaveSingle, saving, savingId, canSave }: {
  plans: any[];
  sites: any[];
  onSave: () => void;
  onSaveSingle: (plan: any) => void;
  saving: boolean;
  savingId: number | null;
  canSave: boolean;
}) {
  if (!plans.length) return null;
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{plans.length} plan{plans.length !== 1 ? "s" : ""} generated</p>
        {canSave ? (
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : `Save All ${plans.length} to DB`}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground italic">View only — Admin can save to DB</span>
        )}
      </div>
      <div className="space-y-2">
        {plans.map((p, i) => (
          <div key={i} className="border rounded-lg px-4 py-3 bg-card">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-sm font-medium truncate">{p.teamName}</span>
                {p.isNewSites && <Badge variant="secondary" className="text-xs py-0 flex-shrink-0">New Sites</Badge>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost" size="sm"
                  className="text-xs h-7 px-2"
                  title="Export Team to Excel"
                  onClick={() => exportSinglePlan(p, sites)}
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export Team
                </Button>
                {canSave && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                    title="Save this plan to ALL PLANS"
                    disabled={savingId === i || saving}
                    onClick={() => onSaveSingle({ ...p, _idx: i })}
                  >
                    {savingId === i ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 ml-5 mt-1 text-xs text-muted-foreground">
              <span>{p.plannerName}</span>
              <span>{p.siteIds.length} sites</span>
              <span>{p.dayGroups.length} days</span>
              {p.km > 0 && <span>~{p.km.toFixed(1)} km</span>}
              {p.planName && <span className="text-foreground/60">{p.planName}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanFileTab({ dbSites, canSave, hqId, onHqIdChange }: { dbSites: any[]; canSave: boolean; hqId: string; onHqIdChange: (v: string) => void; }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [form, setForm] = useState({ nTeams: "", nDays: "", maxPD: "", plannerName: "", planName: "" });
  const [generated, setGenerated] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcel(file);
      if (!rows.length) { toast({ title: "Empty file", variant: "destructive" }); return; }
      const rawKeys = Object.keys(rows[0]);
      const normKeys = rawKeys.map(normKey);
      const idCol = findCol(rawKeys, normKeys, "siteid");
      const nameCol = findCol(rawKeys, normKeys, "plannername", "planner");
      if (!idCol) { toast({ title: "Missing Site_ID column", variant: "destructive" }); return; }
      const parsed: PlanRow[] = rows
        .map(r => ({ siteId: String(r[idCol] ?? "").trim(), plannerName: nameCol ? String(r[nameCol] ?? "").trim() : "" }))
        .filter(r => r.siteId);
      setPlanRows(parsed);
      setFileName(file.name);
      setGenerated([]);
      toast({ title: `${parsed.length} plan sites loaded` });
    } catch (err: any) {
      toast({ title: "Error reading file", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!planRows.length) { toast({ title: "Upload a plan file first", variant: "destructive" }); return; }
    if (!dbSites.length) { toast({ title: "No sites in database. Upload sites first via Admin Panel.", variant: "destructive" }); return; }
    setGenerating(true);
    await new Promise(r => setTimeout(r, 30));
    try {
      const matched: SitePoint[] = planRows.map(pr => {
        const s = dbSites.find((x: any) => x.id === pr.siteId);
        return s ? { ...s, plannerName: pr.plannerName || form.plannerName || "Planner" } : null;
      }).filter(Boolean) as SitePoint[];
      if (!matched.length) {
        toast({ title: "No matches found", description: "Check that Site_IDs match the sites in the database", variant: "destructive" });
        return;
      }
      const hqSite = dbSites.find((s: any) => s.id === hqId) ?? null;
      const pool = matched.filter(s => s.id !== hqId);
      const nTeams = Math.max(1, parseInt(form.nTeams) || 1);
      const nDays = Math.max(1, parseInt(form.nDays) || 999);
      const maxPD = Math.max(1, parseInt(form.maxPD) || 999);
      const plans = generatePlans(pool, hqSite, nTeams, nDays, maxPD, form.plannerName || "Planner", form.planName, false);
      setGenerated(plans);
      toast({ title: `Generated ${plans.length} team plans` });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.plans.append(generated);
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plans saved", description: (res as any).message });
      setGenerated([]);
      setPlanRows([]);
      setFileName("");
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingle = async (plan: any) => {
    const idx = plan._idx;
    setSavingId(idx);
    try {
      const { _idx, ...cleanPlan } = plan;
      const res = await api.plans.append([cleanPlan]);
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plan saved to ALL PLANS", description: (res as any).message });
      setGenerated(prev => prev.filter((_, i) => i !== idx));
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const nT = parseInt(form.nTeams) || 0;
  const nD = parseInt(form.nDays) || 0;
  const mPD = parseInt(form.maxPD) || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Step 1 · Upload Plan File</CardTitle>
          <CardDescription className="text-xs">Excel/CSV with columns: <strong>Site_ID</strong> · <strong>Planner_Name</strong></CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {fileName ? (
              <div>
                <div className="text-2xl mb-1">✅</div>
                <div className="text-sm font-medium text-primary">{planRows.length} Plan Sites Loaded</div>
                <div className="text-xs text-muted-foreground mt-0.5">{fileName} · Click to reload</div>
              </div>
            ) : (
              <div>
                <div className="text-2xl mb-1">📋</div>
                <div className="text-sm font-medium">Upload Plan File</div>
                <div className="text-xs text-muted-foreground mt-0.5">Click to browse</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>
        </CardContent>
      </Card>

      <PlanNameBar planName={form.planName} onChange={v => setForm(f => ({ ...f, planName: v }))} />
      <HqIdBar hqId={hqId} onHqIdChange={onHqIdChange} siteName={dbSites.length > 0 ? (dbSites.find((s: any) => s.id === hqId)?.name ?? null) : undefined} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Step 2 · Team Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RequirementsForm values={form} onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))} />
          <CapInfo n={planRows.length} nT={nT} nD={nD} mPD={mPD} />
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={!planRows.length || generating}
          >
            {generating ? "Generating..." : "🧠 Generate Smart Team Plans"}
          </Button>
        </CardContent>
      </Card>

      <GeneratedPlanList plans={generated} sites={dbSites} onSave={handleSave} onSaveSingle={handleSaveSingle} saving={saving} savingId={savingId} canSave={canSave} />
    </div>
  );
}

function NewSitesTab({ canSave, hqId, onHqIdChange, dbSites }: { canSave: boolean; hqId: string; onHqIdChange: (v: string) => void; dbSites: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [newSites, setNewSites] = useState<NewSiteRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [form, setForm] = useState({ nTeams: "", nDays: "", maxPD: "", plannerName: "", planName: "" });
  const [generated, setGenerated] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcel(file);
      if (!rows.length) { toast({ title: "Empty file", variant: "destructive" }); return; }
      const rawKeys = Object.keys(rows[0]);
      const normKeys = rawKeys.map(normKey);
      const fk = (...frags: string[]) => findCol(rawKeys, normKeys, ...frags);
      const C = {
        name: fk("sitename", "name"), lat: fk("lat"), lng: fk("long", "lng", "lon"),
        id: fk("siteid", "id"), gov: fk("governorate", "gov"), planner: fk("plannername", "planner"),
      };
      if (!C.lat || !C.lng) { toast({ title: "Cannot find Lat/Long columns", variant: "destructive" }); return; }
      if (!C.name) { toast({ title: "Cannot find Site_Name column", variant: "destructive" }); return; }
      const g = (r: any, c: string | null) => c ? String(r[c] ?? "").trim() : "";
      const parsed: NewSiteRow[] = rows.map((r, i) => ({
        id: g(r, C.id) || `NS-${i + 1}`,
        name: g(r, C.name) || `New Site ${i + 1}`,
        lat: parseFloat(r[C.lat!]),
        lng: parseFloat(r[C.lng!]),
        gov: g(r, C.gov),
        plannerName: g(r, C.planner),
      })).filter(s => !isNaN(s.lat) && !isNaN(s.lng));
      if (!parsed.length) { toast({ title: "No valid Lat/Long rows found", variant: "destructive" }); return; }
      setNewSites(parsed);
      setFileName(file.name);
      setGenerated([]);
      toast({ title: `${parsed.length} new sites loaded` });
    } catch (err: any) {
      toast({ title: "Error reading file", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!newSites.length) { toast({ title: "Upload a new sites file first", variant: "destructive" }); return; }
    setGenerating(true);
    await new Promise(r => setTimeout(r, 30));
    try {
      const nTeams = Math.max(1, parseInt(form.nTeams) || 1);
      const nDays = Math.max(1, parseInt(form.nDays) || 999);
      const maxPD = Math.max(1, parseInt(form.maxPD) || 999);
      const plans = generatePlans(newSites, null, nTeams, nDays, maxPD, form.plannerName || "Planner", form.planName || "New Sites Plan", true);
      setGenerated(plans);
      toast({ title: `Generated ${plans.length} team plans for ${newSites.length} new sites` });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.plans.append(generated);
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plans saved", description: (res as any).message });
      setGenerated([]);
      setNewSites([]);
      setFileName("");
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingle = async (plan: any) => {
    const idx = plan._idx;
    setSavingId(idx);
    try {
      const { _idx, ...cleanPlan } = plan;
      const res = await api.plans.append([cleanPlan]);
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plan saved to ALL PLANS", description: (res as any).message });
      setGenerated(prev => prev.filter((_, i) => i !== idx));
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const nT = parseInt(form.nTeams) || 0;
  const nD = parseInt(form.nDays) || 0;
  const mPD = parseInt(form.maxPD) || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Step 1 · Upload New Sites File</CardTitle>
          <CardDescription className="text-xs">Excel/CSV with columns: <strong>Site_Name</strong> · <strong>Lat</strong> · <strong>Long</strong> (+ optional: Site_ID, Governorate, Planner_Name)</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-green-500/50 hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {fileName ? (
              <div>
                <div className="text-2xl mb-1">✅</div>
                <div className="text-sm font-medium text-green-600">{newSites.length} New Sites Loaded</div>
                <div className="text-xs text-muted-foreground mt-0.5">{fileName} · Click to reload</div>
              </div>
            ) : (
              <div>
                <div className="text-2xl mb-1">🆕</div>
                <div className="text-sm font-medium">Upload New Sites Excel</div>
                <div className="text-xs text-muted-foreground mt-0.5">Click to browse</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>
        </CardContent>
      </Card>

      <PlanNameBar planName={form.planName} onChange={v => setForm(f => ({ ...f, planName: v }))} />
      <HqIdBar hqId={hqId} onHqIdChange={onHqIdChange} siteName={dbSites.length > 0 ? (dbSites.find((s: any) => s.id === hqId)?.name ?? null) : undefined} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Step 2 · Team Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RequirementsForm values={form} onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))} />
          <CapInfo n={newSites.length} nT={nT} nD={nD} mPD={mPD} />
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleGenerate}
            disabled={!newSites.length || generating}
          >
            {generating ? "Generating..." : "🧠 Generate Smart Team Plans"}
          </Button>
        </CardContent>
      </Card>

      <GeneratedPlanList plans={generated} sites={dbSites} onSave={handleSave} onSaveSingle={handleSaveSingle} saving={saving} savingId={savingId} canSave={canSave} />
    </div>
  );
}

function PlanCard({ plan, sites, canExport }: { plan: any; sites: any[]; canExport: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const dayGroups: any[] = Array.isArray(plan.dayGroups) ? plan.dayGroups : [];
  const siteCount = Array.isArray(plan.siteIds) ? plan.siteIds.length : 0;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: plan.color || "#00d4ff" }} />
              <CardTitle className="text-sm font-semibold leading-tight">{plan.teamName}</CardTitle>
              {plan.isNewSites && <Badge variant="secondary" className="text-xs">New Sites</Badge>}
            </div>
            {plan.planName && <p className="text-xs text-muted-foreground mt-1 ml-5">{plan.planName}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {canExport && (
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" title="Export to Excel" onClick={() => exportSinglePlan(plan, sites)}>
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Excel
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 flex-shrink-0" onClick={() => setExpanded(v => !v)}>
              {expanded ? "Hide" : "Details"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 ml-5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {siteCount} sites
          </span>
          {plan.km > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7M9 20l6-3M9 20V7m6 13l5.447-2.724A1 1 0 0021 16.382V5.618a1 1 0 00-.553-.894L15 2m0 18V2M9 7l6-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {plan.km.toFixed(1)} km
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {plan.plannerName}
          </span>
          {dayGroups.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
              </svg>
              {dayGroups.length} days
            </span>
          )}
        </div>
      </CardHeader>
      {expanded && dayGroups.length > 0 && (
        <>
          <Separator />
          <CardContent className="pt-3 pb-3">
            <div className="space-y-2">
              {dayGroups.map((dg: any, i: number) => {
                const ids: string[] = Array.isArray(dg.siteIds) ? dg.siteIds : (Array.isArray(dg.sites) ? dg.sites.map((s: any) => s.id ?? s) : []);
                return (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="flex-shrink-0 w-16 font-medium text-muted-foreground pt-0.5">{dg.label || `Day ${i + 1}`}</span>
                    <div className="flex flex-wrap gap-1">
                      {ids.slice(0, 12).map((id: string) => (
                        <span key={id} className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">{id}</span>
                      ))}
                      {ids.length > 12 && <span className="text-muted-foreground text-[11px]">+{ids.length - 12} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [hqId, setHqId] = useState("911");

  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";
  const canExport = isAdmin || isViewer;
  const canSavePlans = isAdmin || user?.role === "user";

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.plans.list(),
  });

  const { data: dbSites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api.sites.list(),
  });

  const filtered = (plans as any[]).filter((p: any) => {
    const q = search.toLowerCase();
    return (
      p.teamName?.toLowerCase().includes(q) ||
      p.plannerName?.toLowerCase().includes(q) ||
      p.planName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-primary-foreground" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
                <path d="M12 8v4l2 2" strokeLinecap="round" />
                <path d="M3 12h2M19 12h2M12 3v2M12 19v2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-semibold text-sm">Z Route Master</span>
            {isAdmin && <Badge className="text-xs py-0" variant="secondary">Admin</Badge>}
            {isViewer && <Badge className="text-xs py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">Viewer</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.displayName}</span>
            {isAdmin && (
              <a href="/admin">
                <Button variant="outline" size="sm">Admin Panel</Button>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <Tabs defaultValue="planning">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="planning" className="flex-1">📋 Planning</TabsTrigger>
            <TabsTrigger value="allplans" className="flex-1">
              📂 All Plans
              {(plans as any[]).length > 0 && (
                <span className="ml-1.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {(plans as any[]).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="newsites" className="flex-1">🆕 New Sites</TabsTrigger>
          </TabsList>

          <TabsContent value="planning">
            <div className="mb-4">
              <h2 className="text-lg font-bold">Generate Smart Team Plans</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload plan file → set requirements → generate · {sitesLoading ? "Loading sites..." : `${(dbSites as any[]).length} sites in DB`}
              </p>
            </div>
            <PlanFileTab dbSites={dbSites as any[]} canSave={canSavePlans} hqId={hqId} onHqIdChange={setHqId} />
          </TabsContent>

          <TabsContent value="allplans">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold">{isAdmin || isViewer ? "All Plans" : "My Plans"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{(plans as any[]).length} plan{(plans as any[]).length !== 1 ? "s" : ""} available</p>
              </div>
              {canExport && (plans as any[]).length > 0 && (
                <Button variant="outline" size="sm" onClick={() => exportAllPlans(plans as any[], dbSites as any[])}>
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export All
                </Button>
              )}
            </div>
            <div className="mb-4">
              <Input
                type="search"
                placeholder="Search by team, planner or plan name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {isLoading && <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading plans...</div>}
            {error && <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md">Failed to load plans: {(error as Error).message}</div>}
            {!isLoading && !error && filtered.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-muted-foreground text-sm">{search ? "No plans match your search" : "No plans yet — generate one in the Planning tab"}</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((plan: any) => (
                <PlanCard key={plan.id} plan={plan} sites={dbSites as any[]} canExport={canExport} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="newsites">
            <div className="mb-4">
              <h2 className="text-lg font-bold">New Sites Planning</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Upload new sites with coordinates → generate field team routes</p>
            </div>
            <NewSitesTab canSave={canSavePlans} hqId={hqId} onHqIdChange={setHqId} dbSites={dbSites as any[]} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

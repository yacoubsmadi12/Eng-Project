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

function HqIdBar({ hqId, onHqIdChange, found }: { hqId: string; onHqIdChange: (v: string) => void; found?: boolean | null }) {
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
        className="h-auto border-0 rounded-none text-sm py-2 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {found != null && (
        <span
          title={found ? "Site found in database" : "Site not found in database"}
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mx-3 ${found ? "bg-green-500" : "bg-red-500"}`}
        />
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

function GeneratedPlanList({ plans, onSave, saving, canSave }: {
  plans: any[];
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
}) {
  if (!plans.length) return null;
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{plans.length} plan{plans.length !== 1 ? "s" : ""} generated</p>
        {canSave ? (
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : `Save ${plans.length} Plan${plans.length !== 1 ? "s" : ""} to DB`}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground italic">View only — Admin can save to DB</span>
        )}
      </div>
      <div className="space-y-2">
        {plans.map((p, i) => (
          <div key={i} className="border rounded-lg px-4 py-3 bg-card">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-sm font-medium">{p.teamName}</span>
              {p.isNewSites && <Badge variant="secondary" className="text-xs py-0">New Sites</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 ml-5 text-xs text-muted-foreground">
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
      <HqIdBar hqId={hqId} onHqIdChange={onHqIdChange} found={dbSites.length > 0 ? dbSites.some((s: any) => s.id === hqId) : null} />

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

      <GeneratedPlanList plans={generated} onSave={handleSave} saving={saving} canSave={canSave} />
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
      <HqIdBar hqId={hqId} onHqIdChange={onHqIdChange} found={dbSites.length > 0 ? dbSites.some((s: any) => s.id === hqId) : null} />

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

      <GeneratedPlanList plans={generated} onSave={handleSave} saving={saving} canSave={canSave} />
    </div>
  );
}

export default function GeneratePage() {
  const { user, logout } = useAuth();
  const [hqId, setHqId] = useState("911");

  const { data: dbSites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api.sites.list(),
  });

  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";
  const canSavePlans = isAdmin || user?.role === "user";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <a href="/" className="flex items-center gap-2.5 hover:opacity-80">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-primary-foreground" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
                  <path d="M12 8v4l2 2" strokeLinecap="round" />
                  <path d="M3 12h2M19 12h2M12 3v2M12 19v2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-semibold text-sm">Z Route Master</span>
            </a>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium">Generate Plans</span>
            {isViewer && <Badge variant="secondary" className="text-xs">View Only</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.displayName}</span>
            <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold">Generate Smart Team Plans</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Auto-distribute sites into teams using geographic clustering · {sitesLoading ? "Loading sites..." : `${(dbSites as any[]).length} sites in database`}
          </p>
        </div>

        <Tabs defaultValue="planfile">
          <TabsList className="mb-5">
            <TabsTrigger value="planfile">From Plan File</TabsTrigger>
            <TabsTrigger value="newsites">New Sites</TabsTrigger>
          </TabsList>
          <TabsContent value="planfile">
            <PlanFileTab dbSites={dbSites as any[]} canSave={canSavePlans} hqId={hqId} onHqIdChange={setHqId} />
          </TabsContent>
          <TabsContent value="newsites">
            <NewSitesTab canSave={canSavePlans} hqId={hqId} onHqIdChange={setHqId} dbSites={dbSites as any[]} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

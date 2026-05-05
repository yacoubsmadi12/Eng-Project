import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

function UsersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", plannerName: "" });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });

  const createMut = useMutation({
    mutationFn: () => api.users.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setShowAdd(false);
      setForm({ username: "", password: "", displayName: "", plannerName: "" });
      toast({ title: "User created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.users.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add User
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Loading...</p>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between gap-3 bg-card border rounded-lg px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{u.displayName}</span>
                  {u.role === "admin" && <Badge variant="secondary" className="text-xs py-0">Admin</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">@{u.username} · {u.plannerName}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                onClick={() => deleteMut.mutate(u.id)}
              >
                Delete
              </Button>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
          )}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: "username", label: "Username", type: "text" },
              { key: "password", label: "Password", type: "password" },
              { key: "displayName", label: "Display Name", type: "text" },
              { key: "plannerName", label: "Planner Name", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type={type}
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !form.username || !form.password || !form.displayName}
            >
              {createMut.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DataTab() {
  const { toast } = useToast();
  const sitesRef = useRef<HTMLInputElement>(null);
  const plansRef = useRef<HTMLInputElement>(null);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [clearSitesLoading, setClearSitesLoading] = useState(false);
  const [clearPlansLoading, setClearPlansLoading] = useState(false);

  const loadJson = (file: File): Promise<any[]> => {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => {
        try { res(JSON.parse(e.target!.result as string)); }
        catch { rej(new Error("Invalid JSON file")); }
      };
      r.readAsText(file);
    });
  };

  const uploadSites = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSitesLoading(true);
    try {
      const data = await loadJson(file);
      const res = await api.sites.bulk(data);
      toast({ title: "Sites uploaded", description: res.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSitesLoading(false);
      if (sitesRef.current) sitesRef.current.value = "";
    }
  };

  const uploadPlans = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlansLoading(true);
    try {
      const data = await loadJson(file);
      const res = await api.plans.bulk(data);
      toast({ title: "Plans uploaded", description: res.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPlansLoading(false);
      if (plansRef.current) plansRef.current.value = "";
    }
  };

  const clearSites = async () => {
    if (!confirm("Clear all sites? This cannot be undone.")) return;
    setClearSitesLoading(true);
    try {
      const res = await api.sites.clear();
      toast({ title: "Done", description: res.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setClearSitesLoading(false);
    }
  };

  const clearPlans = async () => {
    if (!confirm("Clear all plans? This cannot be undone.")) return;
    setClearPlansLoading(true);
    try {
      const res = await api.plans.clear();
      toast({ title: "Done", description: res.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setClearPlansLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Sites Data</CardTitle>
          <CardDescription className="text-xs">Upload a JSON file to replace all site records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={sitesLoading}
              onClick={() => sitesRef.current?.click()}
            >
              {sitesLoading ? "Uploading..." : "Upload Sites JSON"}
            </Button>
            <input ref={sitesRef} type="file" accept=".json" className="hidden" onChange={uploadSites} />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={clearSitesLoading}
              onClick={clearSites}
            >
              {clearSitesLoading ? "Clearing..." : "Clear All Sites"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Plans Data</CardTitle>
          <CardDescription className="text-xs">Upload a JSON file to replace all plan records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={plansLoading}
              onClick={() => plansRef.current?.click()}
            >
              {plansLoading ? "Uploading..." : "Upload Plans JSON"}
            </Button>
            <input ref={plansRef} type="file" accept=".json" className="hidden" onChange={uploadPlans} />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={clearPlansLoading}
              onClick={clearPlans}
            >
              {clearPlansLoading ? "Clearing..." : "Clear All Plans"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user, logout } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

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
            <span className="text-sm font-medium">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.displayName}</span>
            <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold">Admin Panel</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage users and data</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="data">
            <DataTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

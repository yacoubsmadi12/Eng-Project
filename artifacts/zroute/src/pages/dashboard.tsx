import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { exportSinglePlan, exportAllPlans } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

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
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                style={{ backgroundColor: plan.color || "#00d4ff" }}
              />
              <CardTitle className="text-sm font-semibold leading-tight">
                {plan.teamName}
              </CardTitle>
              {plan.isNewSites && (
                <Badge variant="secondary" className="text-xs">New Sites</Badge>
              )}
            </div>
            {plan.planName && (
              <p className="text-xs text-muted-foreground mt-1 ml-5">{plan.planName}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {canExport && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                title="Export to Excel"
                onClick={() => exportSinglePlan(plan, sites)}
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Excel
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 flex-shrink-0"
              onClick={() => setExpanded(v => !v)}
            >
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
                    <span className="flex-shrink-0 w-16 font-medium text-muted-foreground pt-0.5">
                      {dg.label || `Day ${i + 1}`}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ids.slice(0, 12).map((id: string) => (
                        <span key={id} className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">
                          {id}
                        </span>
                      ))}
                      {ids.length > 12 && (
                        <span className="text-muted-foreground text-[11px]">+{ids.length - 12} more</span>
                      )}
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

  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";
  const canExport = isAdmin || isViewer;

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.plans.list(),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api.sites.list(),
    enabled: canExport,
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
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-primary-foreground" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
                <path d="M12 8v4l2 2" strokeLinecap="round" />
                <path d="M3 12h2M19 12h2M12 3v2M12 19v2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-semibold text-sm">Z Route Master</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.displayName}
              {isAdmin && <Badge className="ml-2 text-xs py-0" variant="secondary">Admin</Badge>}
              {isViewer && <Badge className="ml-2 text-xs py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">Viewer</Badge>}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-5 gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {isAdmin ? "All Plans" : isViewer ? "All Plans" : "My Plans"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(plans as any[]).length} plan{(plans as any[]).length !== 1 ? "s" : ""} available
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {canExport && (plans as any[]).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportAllPlans(plans as any[], sites as any[])}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export All
              </Button>
            )}
            {isAdmin && (
              <>
                <a href="/generate">
                  <Button variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Generate Plans
                  </Button>
                </a>
                <a href="/admin">
                  <Button variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Admin Panel
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>

        <div className="mb-4">
          <Input
            type="search"
            placeholder="Search by team, planner or plan name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading plans...
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md">
            Failed to load plans: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-muted-foreground text-sm">
              {search ? "No plans match your search" : "No plans found"}
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan: any) => (
            <PlanCard key={plan.id} plan={plan} sites={sites as any[]} canExport={canExport} />
          ))}
        </div>
      </main>
    </div>
  );
}

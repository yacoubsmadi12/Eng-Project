export const HQ_ID = "911";

export const COLORS = [
  "#00d4ff","#ff6b35","#a78bfa","#34d399","#f87171",
  "#fbbf24","#ec4899","#14b8a6","#6366f1","#84cc16",
  "#f97316","#06b6d4",
];

export interface SitePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  plannerName?: string;
  [key: string]: any;
}

export interface DayGroup {
  day: number;
  date: string;
  siteIds: string[];
}

export interface GeneratedPlan {
  teamName: string;
  plannerName: string;
  planName: string;
  color: string;
  km: number;
  isNewSites: boolean;
  hqSiteId: string | null;
  siteIds: string[];
  dayGroups: DayGroup[];
}

export function hav(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371;
  const dLa = (la2 - la1) * Math.PI / 180;
  const dLo = (lo2 - lo1) * Math.PI / 180;
  const a =
    Math.sin(dLa / 2) ** 2 +
    Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function totDist(arr: SitePoint[]): number {
  let d = 0;
  for (let i = 0; i < arr.length - 1; i++)
    d += hav(arr[i].lat, arr[i].lng, arr[i + 1].lat, arr[i + 1].lng);
  return d;
}

function centroid(cl: SitePoint[]): { lat: number; lng: number } {
  return {
    lat: cl.reduce((s, p) => s + p.lat, 0) / cl.length,
    lng: cl.reduce((s, p) => s + p.lng, 0) / cl.length,
  };
}

export function kMeansCluster(pts: SitePoint[], k: number): SitePoint[][] {
  if (!pts.length) return [];
  if (k <= 1) return [pts];
  if (k >= pts.length) return pts.map(p => [p]);

  const base = [...pts].sort((a, b) => a.lat !== b.lat ? a.lat - b.lat : a.lng - b.lng);
  let clusters: SitePoint[][] = base.map(p => [p]);

  while (clusters.length > k) {
    let bestI = 0, bestJ = 1, bestD = Infinity;
    for (let i = 0; i < clusters.length - 1; i++) {
      const ci = centroid(clusters[i]);
      for (let j = i + 1; j < clusters.length; j++) {
        const cj = centroid(clusters[j]);
        const d = hav(ci.lat, ci.lng, cj.lat, cj.lng);
        if (d < bestD) { bestD = d; bestI = i; bestJ = j; }
      }
    }
    clusters[bestI] = [...clusters[bestI], ...clusters[bestJ]];
    clusters.splice(bestJ, 1);
  }

  for (let pass = 0; pass < pts.length; pass++) {
    const mxIdx = clusters.reduce((bi, c, i) => c.length > clusters[bi].length ? i : bi, 0);
    const mnIdx = clusters.reduce((bi, c, i) => c.length < clusters[bi].length ? i : bi, 0);
    if (clusters[mxIdx].length - clusters[mnIdx].length <= 1) break;
    const rc = centroid(clusters[mnIdx]);
    let pickI = 0, pickD = Infinity;
    clusters[mxIdx].forEach((p, i) => {
      const d = hav(p.lat, p.lng, rc.lat, rc.lng);
      if (d < pickD) { pickD = d; pickI = i; }
    });
    clusters[mnIdx].push(clusters[mxIdx].splice(pickI, 1)[0]);
  }

  return clusters.filter(c => c.length > 0);
}

export function generatePlans(
  pool: SitePoint[],
  hqSite: SitePoint | null,
  nTeams: number,
  nDays: number,
  maxPD: number,
  defaultPlanner: string,
  planName: string,
  isNewSites: boolean,
  colorOffset = 0,
): GeneratedPlan[] {
  const capped = pool.slice(0, nTeams * nDays * maxPD);
  const clusters = kMeansCluster(capped, Math.min(nTeams, capped.length));

  return clusters.map((cluster, ti) => {
    const color = COLORS[(colorOffset + ti) % COLORS.length];
    const teamName = `Team ${ti + 1}`;
    const planners = [...new Set(cluster.map(s => s.plannerName).filter(Boolean))];
    const plannerName = planners.length ? planners.join(" / ") : defaultPlanner;

    const dayGroups: DayGroup[] = [];
    let remaining = [...cluster];
    let cursor: SitePoint = hqSite ?? cluster[0];

    for (let d = 0; d < nDays && remaining.length > 0; d++) {
      const daySize = Math.min(maxPD, remaining.length);
      const daySiteIds: string[] = [];

      for (let s = 0; s < daySize; s++) {
        let bi = 0, bd = Infinity;
        remaining.forEach((site, i) => {
          const dist = hav(cursor.lat, cursor.lng, site.lat, site.lng);
          if (dist < bd) { bd = dist; bi = i; }
        });
        cursor = remaining.splice(bi, 1)[0];
        daySiteIds.push(cursor.id);
      }

      dayGroups.push({ day: d + 1, date: "", siteIds: daySiteIds });
    }

    const siteIds = dayGroups.flatMap(dg => dg.siteIds);
    const sitePts = siteIds.map(id => pool.find(s => s.id === id)!).filter(Boolean);
    const km = totDist(hqSite ? [hqSite, ...sitePts] : sitePts);

    return {
      teamName,
      plannerName,
      planName,
      color,
      km,
      isNewSites,
      hqSiteId: hqSite?.id ?? null,
      siteIds,
      dayGroups,
    };
  });
}

import * as XLSX from "xlsx";

export function exportSinglePlan(plan: any, sites: any[]) {
  const siteMap = new Map(sites.map((s: any) => [s.id, s]));
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const sumData = [
    ["Z Route — Team Plan Export", "", ""],
    ["Plan Name", plan.planName || "—", ""],
    ["Team Name", plan.teamName, ""],
    ["Planner", plan.plannerName, ""],
    ["Total Sites", plan.siteIds?.length ?? 0, ""],
    ["Working Days", plan.dayGroups?.length ?? 0, ""],
    ["Total Distance (km)", plan.km ? Number(plan.km).toFixed(1) : "—", ""],
    ["Generated", new Date().toLocaleString(), ""],
  ];
  const sumWS = XLSX.utils.aoa_to_sheet(sumData);
  sumWS["!cols"] = [{ wch: 22 }, { wch: 28 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, sumWS, "Summary");

  // Sheet 2: Full Route Plan
  const hdr = ["Team", "Planner", "Day", "Stop #", "Site_ID", "Site_Name", "Governorate", "KEY", "Lat", "Lng", "District", "Sub District", "Vendor", "Category", "Power Class", "Owner"];
  const rows: any[][] = [hdr];
  const dayGroups: any[] = Array.isArray(plan.dayGroups) ? plan.dayGroups : [];

  dayGroups.forEach((dg: any) => {
    const dgSiteIds: string[] = Array.isArray(dg.siteIds) ? dg.siteIds : (Array.isArray(dg.sites) ? dg.sites.map((s: any) => s.id ?? s) : []);
    dgSiteIds.forEach((sid, si) => {
      const s = siteMap.get(sid);
      rows.push([
        plan.teamName, plan.plannerName, `Day ${dg.day}`, si + 1,
        sid, s?.name ?? "", s?.gov ?? "", s?.key ?? "",
        s?.lat ?? "", s?.lng ?? "",
        s?.dist ?? "", s?.subdist ?? "",
        s?.vendor ?? "", s?.cat ?? "", s?.pwrclass ?? "", s?.owner ?? "",
      ]);
    });
    rows.push(Array(hdr.length).fill(""));
  });

  const planWS = XLSX.utils.aoa_to_sheet(rows);
  planWS["!cols"] = [{ wch: 10 }, { wch: 16 }, { wch: 8 }, { wch: 7 }, { wch: 11 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, planWS, "Route Plan");

  // Per-day sheets
  dayGroups.forEach((dg: any) => {
    const dHdr = ["Stop #", "Site_ID", "Site_Name", "Governorate", "KEY", "Lat", "Lng", "District", "Vendor", "Category", "Power Class"];
    const dRows: any[][] = [dHdr];
    const dgSiteIds: string[] = Array.isArray(dg.siteIds) ? dg.siteIds : (Array.isArray(dg.sites) ? dg.sites.map((s: any) => s.id ?? s) : []);
    dgSiteIds.forEach((sid, si) => {
      const s = siteMap.get(sid);
      dRows.push([si + 1, sid, s?.name ?? "", s?.gov ?? "", s?.key ?? "", s?.lat ?? "", s?.lng ?? "", s?.dist ?? "", s?.vendor ?? "", s?.cat ?? "", s?.pwrclass ?? ""]);
    });
    const dWS = XLSX.utils.aoa_to_sheet(dRows);
    dWS["!cols"] = [{ wch: 7 }, { wch: 11 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    const sheetName = `Day ${dg.day}${dg.date ? " " + dg.date : ""}`.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, dWS, sheetName);
  });

  XLSX.writeFile(wb, `ZRoute_${plan.teamName.replace(/\s+/g, "_")}_${plan.planName ? plan.planName.replace(/\s+/g, "_") + "_" : ""}${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAllPlans(plans: any[], sites: any[]) {
  if (!plans.length) return;
  const siteMap = new Map(sites.map((s: any) => [s.id, s]));
  const wb = XLSX.utils.book_new();

  // Overview
  const ovHdr = ["Team", "Planner", "Plan Name", "Total Sites", "Days", "Distance (km)"];
  const ovRows: any[][] = [ovHdr, ...plans.map((p: any) => [p.teamName, p.plannerName, p.planName || "—", p.siteIds?.length ?? 0, p.dayGroups?.length ?? 0, p.km ? Number(p.km).toFixed(1) : "—"])];
  const ovWS = XLSX.utils.aoa_to_sheet(ovRows);
  ovWS["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 8 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ovWS, "Overview");

  // Each team sheet
  plans.forEach((plan: any) => {
    const hdr = ["Day", "Stop #", "Site_ID", "Site_Name", "Governorate", "KEY", "Lat", "Lng", "District", "Vendor", "Category", "Power Class"];
    const rows: any[][] = [hdr];
    const dayGroups: any[] = Array.isArray(plan.dayGroups) ? plan.dayGroups : [];
    dayGroups.forEach((dg: any) => {
      const dgSiteIds: string[] = Array.isArray(dg.siteIds) ? dg.siteIds : (Array.isArray(dg.sites) ? dg.sites.map((s: any) => s.id ?? s) : []);
      dgSiteIds.forEach((sid, si) => {
        const s = siteMap.get(sid);
        rows.push([`Day ${dg.day}`, si + 1, sid, s?.name ?? "", s?.gov ?? "", s?.key ?? "", s?.lat ?? "", s?.lng ?? "", s?.dist ?? "", s?.vendor ?? "", s?.cat ?? "", s?.pwrclass ?? ""]);
      });
      rows.push(Array(hdr.length).fill(""));
    });
    const tWS = XLSX.utils.aoa_to_sheet(rows);
    tWS["!cols"] = [{ wch: 8 }, { wch: 7 }, { wch: 11 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, tWS, plan.teamName.substring(0, 31));
  });

  XLSX.writeFile(wb, `ZRoute_AllPlans_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

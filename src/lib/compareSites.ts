import { getCompareSitesUrl } from "./apiBase";

export type CompareSitePayload = {
  site_name: string;
  daily_pm: { date: string; mean: number }[];
};

export type CompareSitesRequestBody = {
  first_site: CompareSitePayload;
  second_site: CompareSitePayload;
  third_site?: CompareSitePayload;
};

export async function postCompareSites(body: CompareSitesRequestBody): Promise<string[]> {
  const res = await fetch(getCompareSitesUrl(), {
    method: "POST",
    headers: { accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`compare_sites: ${res.status} ${res.statusText}${t ? ` — ${t.slice(0, 200)}` : ""}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("compare_sites: response is not a JSON array");
  }
  return data.map((x) => (typeof x === "string" ? x : String(x)));
}

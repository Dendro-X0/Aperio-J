import { NextResponse } from "next/server";
import { matchCityLabelFromGeo } from "@/lib/taxonomy-options";
import { getRequestTranslator } from "@/lib/request-i18n";

interface GeoLookupResult {
  city: string;
  region: string | null;
  source: string;
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    /^fc00:|^fe80:/i.test(ip)
  );
}

async function lookupFromIpApi(ip: string | null): Promise<GeoLookupResult | null> {
  const path =
    ip && !isPrivateIp(ip)
      ? `http://ip-api.com/json/${encodeURIComponent(ip)}`
      : "http://ip-api.com/json/";
  const url = `${path}?fields=status,message,city,regionName`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    status?: string;
    city?: string | null;
    regionName?: string | null;
  };
  if (payload.status !== "success" || !payload.city) return null;

  return {
    city: payload.city,
    region: payload.regionName ?? null,
    source: "ip-api.com",
  };
}

async function lookupFromIpInfo(ip: string | null): Promise<GeoLookupResult | null> {
  const url =
    ip && !isPrivateIp(ip)
      ? `https://ipinfo.io/${encodeURIComponent(ip)}/json`
      : "https://ipinfo.io/json";

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    city?: string | null;
    region?: string | null;
    error?: { message?: string };
  };
  if (payload.error || !payload.city) return null;

  return {
    city: payload.city,
    region: payload.region ?? null,
    source: "ipinfo.io",
  };
}

async function lookupGeo(ip: string | null): Promise<GeoLookupResult | null> {
  const providers = [lookupFromIpApi, lookupFromIpInfo];
  for (const provider of providers) {
    try {
      const result = await provider(ip);
      if (result) return result;
    } catch {
      // try next provider
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { t, locale } = await getRequestTranslator();
  const ip = clientIp(request);

  try {
    const lookup = await lookupGeo(ip);
    if (!lookup) {
      return NextResponse.json({ error: t("api.geoDetectFailed") }, { status: 502 });
    }

    const city = matchCityLabelFromGeo(lookup.city, locale) ?? lookup.city;

    return NextResponse.json({
      city,
      region: lookup.region,
      source: lookup.source,
    });
  } catch {
    return NextResponse.json({ error: t("api.geoDetectFailed") }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { cityIdentityKey, searchMetros } from "@aperio-j/core";
import { getRequestTranslator } from "@/lib/request-i18n";

export async function GET(request: Request) {
  const { locale } = await getRequestTranslator();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const limit = Math.min(20, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "8", 10) || 8));
  const excludeParam = searchParams.get("exclude") ?? "";
  const excludeKeys = new Set(
    excludeParam
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );

  const cities = searchMetros(query, locale, limit, excludeKeys);

  return NextResponse.json({
    cities: cities.map((city) => ({
      ...city,
      identityKey: cityIdentityKey(city.label),
    })),
  });
}

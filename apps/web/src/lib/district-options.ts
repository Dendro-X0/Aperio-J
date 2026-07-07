import { resolveMetro } from "@aperio-j/core";

const DISTRICTS_BY_METRO_ID: Record<string, string[]> = {
  beijing: ["Chaoyang", "Haidian", "Dongcheng", "Xicheng", "Fengtai", "Shijingshan", "Tongzhou"],
  shanghai: ["Pudong", "Minhang", "Jing'an", "Xuhui", "Changning", "Huangpu", "Yangpu"],
  shenzhen: ["Nanshan", "Futian", "Luohu", "Bao'an", "Longgang", "Longhua", "Yantian"],
  guangzhou: ["Tianhe", "Yuexiu", "Haizhu", "Baiyun", "Panyu", "Huangpu"],
  tokyo: ["Shibuya", "Shinjuku", "Chiyoda", "Minato", "Setagaya", "Taito"],
  osaka: ["Kita", "Naniwa", "Chuo", "Tennoji", "Yodogawa"],
  london: ["City of London", "Westminster", "Camden", "Southwark", "Tower Hamlets", "Hackney"],
  "new-york": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"],
  "mexico-city": ["Cuauhtemoc", "Miguel Hidalgo", "Benito Juarez", "Coyoacan", "Iztapalapa"],
  "sao-paulo": ["Centro", "Pinheiros", "Itaim Bibi", "Vila Mariana", "Moema", "Butanta"],
};

/** Suggested districts for selected profile cities (metro-level mapping). */
export function districtSuggestionsForCities(cities: string[]): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const city of cities) {
    const metro = resolveMetro(city);
    if (!metro) continue;
    const districts = DISTRICTS_BY_METRO_ID[metro.slug];
    if (!districts) continue;

    for (const district of districts) {
      const key = district.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      suggestions.push(district);
    }
  }

  return suggestions;
}


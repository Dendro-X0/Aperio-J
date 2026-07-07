/**
 * Generates packages/core/src/catalogs/metros.json from taxonomy nodes + curated seeds.
 * Run: pnpm metro:generate
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nodesPath = join(root, "packages/core/taxonomies/nodes.json");
const outPath = join(root, "packages/core/src/catalogs/metros.json");

const ADZUNA_COUNTRIES = new Set([
  "de", "gb", "us", "au", "at", "be", "br", "ca", "ch", "es", "fr", "in", "it", "mx", "nl", "nz", "pl", "sg", "za",
]);

/** @type {Array<{ country: string; en: string; zh?: string; terms?: string[]; adzunaWhere?: string }>} */
const SEEDS = [
  // Germany
  { country: "de", en: "Berlin", zh: "柏林", adzunaWhere: "Berlin" },
  { country: "de", en: "Hamburg", zh: "汉堡", adzunaWhere: "Hamburg" },
  { country: "de", en: "Munich", zh: "慕尼黑", terms: ["münchen"], adzunaWhere: "München" },
  { country: "de", en: "Cologne", zh: "科隆", terms: ["köln", "koln"], adzunaWhere: "Köln" },
  { country: "de", en: "Frankfurt", zh: "法兰克福", terms: ["frankfurt am main"], adzunaWhere: "Frankfurt" },
  { country: "de", en: "Stuttgart", zh: "斯图加特", adzunaWhere: "Stuttgart" },
  { country: "de", en: "Düsseldorf", zh: "杜塞尔多夫", terms: ["dusseldorf"], adzunaWhere: "Düsseldorf" },
  { country: "de", en: "Leipzig", zh: "莱比锡", adzunaWhere: "Leipzig" },
  { country: "de", en: "Dresden", zh: "德累斯顿", adzunaWhere: "Dresden" },
  { country: "de", en: "Hannover", zh: "汉诺威", adzunaWhere: "Hannover" },
  { country: "de", en: "Nuremberg", zh: "纽伦堡", terms: ["nürnberg", "nurnberg"], adzunaWhere: "Nürnberg" },
  { country: "de", en: "Bonn", zh: "波恩", adzunaWhere: "Bonn" },
  { country: "de", en: "Bremen", zh: "不来梅", adzunaWhere: "Bremen" },
  { country: "de", en: "Dortmund", zh: "多特蒙德", adzunaWhere: "Dortmund" },
  { country: "de", en: "Essen", zh: "埃森", adzunaWhere: "Essen" },
  // UK
  { country: "gb", en: "London", zh: "伦敦", adzunaWhere: "London" },
  { country: "gb", en: "Manchester", zh: "曼彻斯特", adzunaWhere: "Manchester" },
  { country: "gb", en: "Birmingham", zh: "伯明翰", adzunaWhere: "Birmingham" },
  { country: "gb", en: "Edinburgh", zh: "爱丁堡", adzunaWhere: "Edinburgh" },
  { country: "gb", en: "Glasgow", zh: "格拉斯哥", adzunaWhere: "Glasgow" },
  { country: "gb", en: "Leeds", zh: "利兹", adzunaWhere: "Leeds" },
  { country: "gb", en: "Bristol", zh: "布里斯托尔", adzunaWhere: "Bristol" },
  { country: "gb", en: "Liverpool", zh: "利物浦", adzunaWhere: "Liverpool" },
  { country: "gb", en: "Cambridge", zh: "剑桥", adzunaWhere: "Cambridge" },
  { country: "gb", en: "Oxford", zh: "牛津", adzunaWhere: "Oxford" },
  { country: "gb", en: "Belfast", zh: "贝尔法斯特", adzunaWhere: "Belfast" },
  { country: "gb", en: "Cardiff", zh: "卡迪夫", adzunaWhere: "Cardiff" },
  // US
  { country: "us", en: "New York", zh: "纽约", terms: ["nyc", "new york city"], adzunaWhere: "New York" },
  { country: "us", en: "San Francisco", zh: "旧金山", terms: ["sf", "bay area"], adzunaWhere: "San Francisco" },
  { country: "us", en: "Los Angeles", zh: "洛杉矶", terms: ["la"], adzunaWhere: "Los Angeles" },
  { country: "us", en: "Chicago", zh: "芝加哥", adzunaWhere: "Chicago" },
  { country: "us", en: "Seattle", zh: "西雅图", adzunaWhere: "Seattle" },
  { country: "us", en: "Austin", zh: "奥斯汀", adzunaWhere: "Austin" },
  { country: "us", en: "Boston", zh: "波士顿", adzunaWhere: "Boston" },
  { country: "us", en: "Denver", zh: "丹佛", adzunaWhere: "Denver" },
  { country: "us", en: "Atlanta", zh: "亚特兰大", adzunaWhere: "Atlanta" },
  { country: "us", en: "Miami", zh: "迈阿密", adzunaWhere: "Miami" },
  { country: "us", en: "Dallas", zh: "达拉斯", adzunaWhere: "Dallas" },
  { country: "us", en: "Houston", zh: "休斯顿", adzunaWhere: "Houston" },
  { country: "us", en: "Washington", zh: "华盛顿", terms: ["washington dc", "dc"], adzunaWhere: "Washington" },
  { country: "us", en: "Philadelphia", zh: "费城", adzunaWhere: "Philadelphia" },
  { country: "us", en: "Portland", zh: "波特兰", adzunaWhere: "Portland" },
  { country: "us", en: "San Diego", zh: "圣迭戈", adzunaWhere: "San Diego" },
  { country: "us", en: "Phoenix", zh: "凤凰城", adzunaWhere: "Phoenix" },
  { country: "us", en: "Minneapolis", zh: "明尼阿波利斯", adzunaWhere: "Minneapolis" },
  { country: "us", en: "Detroit", zh: "底特律", adzunaWhere: "Detroit" },
  { country: "us", en: "Raleigh", zh: "罗利", adzunaWhere: "Raleigh" },
  // France
  { country: "fr", en: "Paris", zh: "巴黎", adzunaWhere: "Paris" },
  { country: "fr", en: "Lyon", zh: "里昂", adzunaWhere: "Lyon" },
  { country: "fr", en: "Marseille", zh: "马赛", adzunaWhere: "Marseille" },
  { country: "fr", en: "Toulouse", zh: "图卢兹", adzunaWhere: "Toulouse" },
  { country: "fr", en: "Nice", zh: "尼斯", adzunaWhere: "Nice" },
  { country: "fr", en: "Nantes", zh: "南特", adzunaWhere: "Nantes" },
  { country: "fr", en: "Bordeaux", zh: "波尔多", adzunaWhere: "Bordeaux" },
  { country: "fr", en: "Lille", zh: "里尔", adzunaWhere: "Lille" },
  { country: "fr", en: "Strasbourg", zh: "斯特拉斯堡", adzunaWhere: "Strasbourg" },
  // Netherlands
  { country: "nl", en: "Amsterdam", zh: "阿姆斯特丹", adzunaWhere: "Amsterdam" },
  { country: "nl", en: "Rotterdam", zh: "鹿特丹", adzunaWhere: "Rotterdam" },
  { country: "nl", en: "The Hague", zh: "海牙", terms: ["den haag", "'s-gravenhage"], adzunaWhere: "The Hague" },
  { country: "nl", en: "Utrecht", zh: "乌得勒支", adzunaWhere: "Utrecht" },
  { country: "nl", en: "Eindhoven", zh: "埃因霍温", adzunaWhere: "Eindhoven" },
  // Spain
  { country: "es", en: "Madrid", zh: "马德里", adzunaWhere: "Madrid" },
  { country: "es", en: "Barcelona", zh: "巴塞罗那", adzunaWhere: "Barcelona" },
  { country: "es", en: "Valencia", zh: "瓦伦西亚", adzunaWhere: "Valencia" },
  { country: "es", en: "Seville", zh: "塞维利亚", terms: ["sevilla"], adzunaWhere: "Seville" },
  { country: "es", en: "Bilbao", zh: "毕尔巴鄂", adzunaWhere: "Bilbao" },
  // Italy
  { country: "it", en: "Milan", zh: "米兰", terms: ["milano"], adzunaWhere: "Milan" },
  { country: "it", en: "Rome", zh: "罗马", terms: ["roma"], adzunaWhere: "Rome" },
  { country: "it", en: "Turin", zh: "都灵", terms: ["torino"], adzunaWhere: "Turin" },
  { country: "it", en: "Florence", zh: "佛罗伦萨", terms: ["firenze"], adzunaWhere: "Florence" },
  { country: "it", en: "Bologna", zh: "博洛尼亚", adzunaWhere: "Bologna" },
  // Canada
  { country: "ca", en: "Toronto", zh: "多伦多", adzunaWhere: "Toronto" },
  { country: "ca", en: "Vancouver", zh: "温哥华", adzunaWhere: "Vancouver" },
  { country: "ca", en: "Montreal", zh: "蒙特利尔", terms: ["montréal"], adzunaWhere: "Montreal" },
  { country: "ca", en: "Ottawa", zh: "渥太华", adzunaWhere: "Ottawa" },
  { country: "ca", en: "Calgary", zh: "卡尔加里", adzunaWhere: "Calgary" },
  { country: "ca", en: "Edmonton", zh: "埃德蒙顿", adzunaWhere: "Edmonton" },
  { country: "ca", en: "Quebec City", zh: "魁北克城", terms: ["quebec"], adzunaWhere: "Quebec City" },
  // Australia
  { country: "au", en: "Sydney", zh: "悉尼", adzunaWhere: "Sydney" },
  { country: "au", en: "Melbourne", zh: "墨尔本", adzunaWhere: "Melbourne" },
  { country: "au", en: "Brisbane", zh: "布里斯班", adzunaWhere: "Brisbane" },
  { country: "au", en: "Perth", zh: "珀斯", adzunaWhere: "Perth" },
  { country: "au", en: "Adelaide", zh: "阿德莱德", adzunaWhere: "Adelaide" },
  { country: "au", en: "Canberra", zh: "堪培拉", adzunaWhere: "Canberra" },
  // India
  { country: "in", en: "Bangalore", zh: "班加罗尔", terms: ["bengaluru"], adzunaWhere: "Bangalore" },
  { country: "in", en: "Mumbai", zh: "孟买", terms: ["bombay"], adzunaWhere: "Mumbai" },
  { country: "in", en: "Delhi", zh: "德里", terms: ["new delhi"], adzunaWhere: "Delhi" },
  { country: "in", en: "Hyderabad", zh: "海得拉巴", adzunaWhere: "Hyderabad" },
  { country: "in", en: "Chennai", zh: "金奈", terms: ["madras"], adzunaWhere: "Chennai" },
  { country: "in", en: "Pune", zh: "浦那", adzunaWhere: "Pune" },
  { country: "in", en: "Kolkata", zh: "加尔各答", terms: ["calcutta"], adzunaWhere: "Kolkata" },
  { country: "in", en: "Ahmedabad", zh: "艾哈迈达巴德", adzunaWhere: "Ahmedabad" },
  { country: "in", en: "Gurgaon", zh: "古尔冈", terms: ["gurugram"], adzunaWhere: "Gurgaon" },
  // Singapore
  { country: "sg", en: "Singapore", zh: "新加坡", adzunaWhere: "Singapore" },
  // Poland
  { country: "pl", en: "Warsaw", zh: "华沙", terms: ["warszawa"], adzunaWhere: "Warsaw" },
  { country: "pl", en: "Krakow", zh: "克拉科夫", terms: ["kraków", "cracow"], adzunaWhere: "Krakow" },
  { country: "pl", en: "Wroclaw", zh: "弗罗茨瓦夫", terms: ["wrocław"], adzunaWhere: "Wroclaw" },
  { country: "pl", en: "Gdansk", zh: "格但斯克", terms: ["gdańsk"], adzunaWhere: "Gdansk" },
  // Switzerland
  { country: "ch", en: "Zurich", zh: "苏黎世", terms: ["zürich"], adzunaWhere: "Zurich" },
  { country: "ch", en: "Geneva", zh: "日内瓦", terms: ["genève", "geneve"], adzunaWhere: "Geneva" },
  { country: "ch", en: "Basel", zh: "巴塞尔", adzunaWhere: "Basel" },
  { country: "ch", en: "Bern", zh: "伯尔尼", adzunaWhere: "Bern" },
  { country: "ch", en: "Lausanne", zh: "洛桑", adzunaWhere: "Lausanne" },
  // Austria
  { country: "at", en: "Vienna", zh: "维也纳", terms: ["wien"], adzunaWhere: "Vienna" },
  { country: "at", en: "Graz", zh: "格拉茨", adzunaWhere: "Graz" },
  { country: "at", en: "Salzburg", zh: "萨尔茨堡", adzunaWhere: "Salzburg" },
  { country: "at", en: "Linz", zh: "林茨", adzunaWhere: "Linz" },
  // Belgium
  { country: "be", en: "Brussels", zh: "布鲁塞尔", terms: ["bruxelles"], adzunaWhere: "Brussels" },
  { country: "be", en: "Antwerp", zh: "安特卫普", terms: ["antwerpen"], adzunaWhere: "Antwerp" },
  { country: "be", en: "Ghent", zh: "根特", terms: ["gent"], adzunaWhere: "Ghent" },
  // Brazil
  { country: "br", en: "São Paulo", zh: "圣保罗", terms: ["sao paulo"], adzunaWhere: "São Paulo" },
  { country: "br", en: "Rio de Janeiro", zh: "里约热内卢", adzunaWhere: "Rio de Janeiro" },
  { country: "br", en: "Brasília", zh: "巴西利亚", terms: ["brasilia"], adzunaWhere: "Brasília" },
  { country: "br", en: "Belo Horizonte", zh: "贝洛奥里藏特", adzunaWhere: "Belo Horizonte" },
  // Mexico
  { country: "mx", en: "Mexico City", zh: "墨西哥城", terms: ["ciudad de mexico", "cdmx"], adzunaWhere: "Mexico City" },
  { country: "mx", en: "Guadalajara", zh: "瓜达拉哈拉", adzunaWhere: "Guadalajara" },
  { country: "mx", en: "Monterrey", zh: "蒙特雷", adzunaWhere: "Monterrey" },
  // New Zealand
  { country: "nz", en: "Auckland", zh: "奥克兰", adzunaWhere: "Auckland" },
  { country: "nz", en: "Wellington", zh: "惠灵顿", adzunaWhere: "Wellington" },
  { country: "nz", en: "Christchurch", zh: "基督城", adzunaWhere: "Christchurch" },
  // South Africa
  { country: "za", en: "Johannesburg", zh: "约翰内斯堡", adzunaWhere: "Johannesburg" },
  { country: "za", en: "Cape Town", zh: "开普敦", adzunaWhere: "Cape Town" },
  { country: "za", en: "Durban", zh: "德班", adzunaWhere: "Durban" },
  { country: "za", en: "Pretoria", zh: "比勒陀利亚", adzunaWhere: "Pretoria" },
  // China (autocomplete + local discovery; no Adzuna)
  { country: "cn", en: "Shenzhen", zh: "深圳" },
  { country: "cn", en: "Guangzhou", zh: "广州" },
  { country: "cn", en: "Beijing", zh: "北京", terms: ["北京市"] },
  { country: "cn", en: "Shanghai", zh: "上海", terms: ["上海市"] },
  { country: "cn", en: "Chengdu", zh: "成都", terms: ["成都市"] },
  { country: "cn", en: "Hangzhou", zh: "杭州", terms: ["杭州市"] },
  { country: "cn", en: "Wuhan", zh: "武汉", terms: ["武汉市"] },
  { country: "cn", en: "Nanjing", zh: "南京", terms: ["南京市"] },
  { country: "cn", en: "Suzhou", zh: "苏州", terms: ["苏州市"] },
  { country: "cn", en: "Dongguan", zh: "东莞" },
  { country: "cn", en: "Foshan", zh: "佛山" },
  { country: "cn", en: "Huizhou", zh: "惠州" },
  { country: "cn", en: "Chongqing", zh: "重庆" },
  { country: "cn", en: "Tianjin", zh: "天津" },
  { country: "cn", en: "Qingdao", zh: "青岛" },
  { country: "cn", en: "Dalian", zh: "大连" },
  { country: "cn", en: "Xiamen", zh: "厦门" },
  { country: "cn", en: "Changsha", zh: "长沙" },
  { country: "cn", en: "Zhengzhou", zh: "郑州" },
  { country: "cn", en: "Xi'an", zh: "西安", terms: ["xian"] },
  { country: "cn", en: "Kunming", zh: "昆明" },
  { country: "cn", en: "Hefei", zh: "合肥" },
  { country: "cn", en: "Ningbo", zh: "宁波" },
  { country: "cn", en: "Wuxi", zh: "无锡" },
  { country: "cn", en: "Zhongshan", zh: "中山" },
  { country: "cn", en: "Zhuhai", zh: "珠海" },
  // Hong Kong
  { country: "hk", en: "Hong Kong", zh: "香港", terms: ["hongkong"] },
  // Japan
  { country: "jp", en: "Tokyo", zh: "东京", terms: ["東京"] },
  { country: "jp", en: "Osaka", zh: "大阪", terms: ["大阪"] },
  { country: "jp", en: "Yokohama", zh: "横滨", terms: ["横浜"] },
  { country: "jp", en: "Nagoya", zh: "名古屋" },
  { country: "jp", en: "Kyoto", zh: "京都" },
  { country: "jp", en: "Fukuoka", zh: "福冈", terms: ["福岡"] },
  { country: "jp", en: "Sapporo", zh: "札幌" },
  { country: "jp", en: "Kobe", zh: "神户", terms: ["神戸"] },
  // South Korea
  { country: "kr", en: "Seoul", zh: "首尔", terms: ["서울"] },
  { country: "kr", en: "Busan", zh: "釜山", terms: ["부산"] },
  { country: "kr", en: "Incheon", zh: "仁川", terms: ["인천"] },
  { country: "kr", en: "Daegu", zh: "大邱" },
  { country: "kr", en: "Daejeon", zh: "大田" },
];

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueTerms(...groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const raw of group) {
      const term = String(raw).trim().toLowerCase();
      if (!term || seen.has(term)) continue;
      seen.add(term);
      out.push(term);
    }
  }
  return out;
}

function seedToMetro(seed, taxonomyId) {
  const slug = slugify(seed.en);
  const labels = { en: seed.en };
  if (seed.zh) labels["zh-CN"] = seed.zh;

  const matchTerms = uniqueTerms(
    [seed.en],
    seed.terms ?? [],
    seed.zh ? [seed.zh] : [],
  );

  const metro = {
    id: `metro:${slug}`,
    slug,
    countryCode: seed.country,
    labels,
    matchTerms,
  };

  if (taxonomyId) metro.taxonomyId = taxonomyId;

  if (ADZUNA_COUNTRIES.has(seed.country)) {
    metro.adzuna = {
      country: seed.country,
      where: seed.adzunaWhere ?? seed.en,
    };
  }

  return metro;
}

function taxonomyToSeed(node) {
  const en = node.labels.en ?? node.labels["zh-CN"] ?? node.id.replace("city:", "");
  const zh = node.labels["zh-CN"];
  const country = inferCountryFromNode(node);
  return {
    country,
    en,
    zh,
    terms: node.matchTerms ?? [],
    taxonomyId: node.id,
  };
}

function inferCountryFromNode(node) {
  const id = node.id;
  const cnIds = new Set([
    "city:shenzhen", "city:guangzhou", "city:dongguan", "city:foshan", "city:huizhou",
    "city:beijing", "city:shanghai", "city:chengdu", "city:wuhan", "city:nanjing", "city:suzhou",
  ]);
  if (cnIds.has(id)) return "cn";
  if (id === "city:hongkong") return "hk";
  if (id === "city:tokyo" || id === "city:osaka") return "jp";
  if (id === "city:paris") return "fr";
  if (id === "city:london") return "gb";
  if (id === "city:frankfurt" || id === "city:bonn" || id === "city:berlin") return "de";
  if (id === "city:amsterdam") return "nl";
  if (id === "city:newyork" || id === "city:sanfrancisco") return "us";
  if (id === "city:toronto") return "ca";
  if (id === "city:sydney") return "au";
  if (id === "city:singapore") return "sg";
  return "us";
}

const nodes = JSON.parse(readFileSync(nodesPath, "utf8"));
const taxonomyCities = nodes.nodes.filter((n) => n.kind === "city" && n.id !== "city:remote");

const bySlug = new Map();

for (const node of taxonomyCities) {
  const seed = taxonomyToSeed(node);
  const metro = seedToMetro(seed, node.id);
  bySlug.set(metro.slug, metro);
}

for (const seed of SEEDS) {
  const slug = slugify(seed.en);
  if (bySlug.has(slug)) {
    const existing = bySlug.get(slug);
    if (seed.zh && !existing.labels["zh-CN"]) existing.labels["zh-CN"] = seed.zh;
    existing.matchTerms = uniqueTerms(existing.matchTerms, [seed.en], seed.terms ?? [], seed.zh ? [seed.zh] : []);
    if (ADZUNA_COUNTRIES.has(seed.country) && !existing.adzuna) {
      existing.adzuna = { country: seed.country, where: seed.adzunaWhere ?? seed.en };
    }
    continue;
  }
  bySlug.set(slug, seedToMetro(seed));
}

const metros = [...bySlug.values()].sort((a, b) => a.labels.en.localeCompare(b.labels.en));

const catalog = {
  meta: {
    version: "1",
    generatedAt: new Date().toISOString(),
    count: metros.length,
  },
  metros,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Wrote ${metros.length} metros to ${outPath}`);

// English names for the cities and districts we cover. Data values stay in Chinese; this is display only.
import type { City, Lang } from "./types";

export const CITY_EN: Record<City, string> = { 臺北市: "Taipei City", 新北市: "New Taipei City" };

export const DISTRICT_EN: Record<string, string> = {
  // Taipei
  中正區: "Zhongzheng", 大同區: "Datong", 中山區: "Zhongshan", 松山區: "Songshan", 大安區: "Da'an", 萬華區: "Wanhua",
  信義區: "Xinyi", 士林區: "Shilin", 北投區: "Beitou", 內湖區: "Neihu", 南港區: "Nangang", 文山區: "Wenshan",
  // New Taipei
  板橋區: "Banqiao", 三重區: "Sanchong", 中和區: "Zhonghe", 永和區: "Yonghe", 新莊區: "Xinzhuang", 新店區: "Xindian",
  樹林區: "Shulin", 鶯歌區: "Yingge", 三峽區: "Sanxia", 淡水區: "Tamsui", 汐止區: "Xizhi", 瑞芳區: "Ruifang",
  土城區: "Tucheng", 蘆洲區: "Luzhou", 五股區: "Wugu", 泰山區: "Taishan", 林口區: "Linkou", 深坑區: "Shenkeng",
  石碇區: "Shiding", 坪林區: "Pinglin", 三芝區: "Sanzhi", 石門區: "Shimen", 八里區: "Bali", 平溪區: "Pingxi",
  雙溪區: "Shuangxi", 貢寮區: "Gongliao", 金山區: "Jinshan", 萬里區: "Wanli", 烏來區: "Wulai",
};

/** Districts in display order: data order in Chinese, alphabetical in English. */
export function sortDistricts<T extends { district: string }>(list: T[], lang: Lang): T[] {
  return lang === "en" ? [...list].sort((a, b) => (DISTRICT_EN[a.district] ?? a.district).localeCompare(DISTRICT_EN[b.district] ?? b.district)) : list;
}

export function cityName(city: City, lang: Lang): string {
  return lang === "en" ? CITY_EN[city] : city;
}

export function districtName(district: string, lang: Lang): string {
  return lang === "en" ? `${DISTRICT_EN[district] ?? district} District` : district;
}

/** "臺北市萬華區" / "Wanhua District, Taipei City" */
export function placeName(city: City, district: string, lang: Lang): string {
  return lang === "en" ? `${districtName(district, lang)}, ${CITY_EN[city]}` : `${city}${district}`;
}

import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title}｜CareMap 照護地圖` : "CareMap 照護地圖｜兩分鐘看懂長照";
  }, [title]);
}

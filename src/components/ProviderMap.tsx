import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLang } from "@/components/LanguageProvider";
import { phoneDisplay, phoneHref } from "@/lib/data";
import { TIER_LABELS } from "@/lib/i18n";
import type { Provider } from "@/lib/types";

// Browser-only: imported lazily from the map page, never at module top level elsewhere.
const TIER_COLOR = { A: "#0F5257", B: "#E9A23B", C: "#2E7D5B" } as const;

export default function ProviderMap({ center, providers }: { center: { lat: number; lng: number }; providers: Provider[] }) {
  const { lang } = useLang();
  const pts = providers.filter((p) => p.lat != null && p.lng != null).slice(0, 600);
  return (
    <MapContainer key={`${center.lat},${center.lng}`} center={[center.lat, center.lng]} zoom={14} scrollWheelZoom={false} className="h-72 w-full rounded-2xl sm:h-96">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pts.map((p) => (
        <CircleMarker key={p.id} center={[p.lat!, p.lng!]} radius={p.tier === "A" ? 9 : 7} pathOptions={{ color: "#fff", weight: 1.5, fillColor: TIER_COLOR[p.tier], fillOpacity: 0.9 }}>
          <Popup>
            {/* divs, not <p>: Leaflet's popup CSS adds large margins to paragraphs */}
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{p.name}</div>
              <div>
                {p.tier} · {TIER_LABELS[p.tier][lang]}
              </div>
              <div>{(lang === "zh" ? p.services : p.services_en).join("、")}</div>
              {p.phone && (
                <a href={phoneHref(p.phone)} className="font-semibold text-primary">
                  {phoneDisplay(p.phone)}
                </a>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

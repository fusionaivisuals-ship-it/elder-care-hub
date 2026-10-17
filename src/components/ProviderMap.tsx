import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLang } from "@/components/LanguageProvider";
import { addressFor, directionsUrls, nameFor, phoneDisplay, phoneHref } from "@/lib/data";
import { dict } from "@/lib/i18n";

// Browser-only: always imported lazily, never at module top level elsewhere.

export interface MapPlace {
  id: string;
  name: string;
  name_en?: string;
  address: string;
  address_en?: string;
  lat: number;
  lng: number;
  phone?: string;
  color: string;
  /** Short line under the name (tier, services, beds…), already in the reader's language. */
  detail?: string;
  big?: boolean;
}

/** Leaflet measures its box once; re-measure whenever the container changes size (tabs, fonts, rotation). */
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/** Fly to the place picked in the list and open its popup. */
function Focus({ id, markers, nonce }: { id?: string; markers: React.MutableRefObject<Map<string, LeafletCircleMarker>>; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (!id) return;
    const m = markers.current.get(id);
    if (!m) return;
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.5 });
    const t = window.setTimeout(() => m.openPopup(), 550);
    return () => window.clearTimeout(t);
  }, [id, nonce, map, markers]);
  return null;
}

export default function ProviderMap({ center, places, focusId, focusNonce = 0 }: { center: { lat: number; lng: number }; places: MapPlace[]; focusId?: string; focusNonce?: number }) {
  const { lang } = useLang();
  const markers = useRef(new Map<string, LeafletCircleMarker>());
  const L = (k: keyof typeof dict) => dict[k][lang];

  return (
    <MapContainer key={`${center.lat},${center.lng}`} center={[center.lat, center.lng]} zoom={14} scrollWheelZoom={false} className="h-80 w-full rounded-2xl sm:h-[28rem]">
      {/* OpenStreetMap standard tiles: no API key needed (CARTO basemaps require a key on non-localhost domains) */}
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      <KeepSized />
      <Focus id={focusId} markers={markers} nonce={focusNonce} />
      {places.slice(0, 800).map((p) => {
        const nav = directionsUrls(p);
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={p.big ? 10 : 8}
            pathOptions={{ color: "#fff", weight: 2, fillColor: p.color, fillOpacity: 0.95 }}
            ref={(m) => {
              if (m) markers.current.set(p.id, m);
              else markers.current.delete(p.id);
            }}
          >
            {/* divs, not <p>: Leaflet's popup CSS adds large margins to paragraphs */}
            <Popup>
              <div className="min-w-[200px] space-y-1.5 text-sm">
                <div className="font-semibold leading-snug">{nameFor(p, lang)}</div>
                {lang === "en" && p.name_en && <div className="text-xs text-muted-foreground">{p.name}</div>}
                {p.detail && <div>{p.detail}</div>}
                <div className="text-xs text-muted-foreground">{addressFor(p, lang)}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.phone && (
                    <a href={phoneHref(p.phone)} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold !text-white">
                      {L("call")} {phoneDisplay(p.phone)}
                    </a>
                  )}
                  <a href={nav.google} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5 text-xs font-semibold !text-primary">
                    Google {L("navShort")}
                  </a>
                  <a href={nav.apple} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5 text-xs font-semibold !text-primary">
                    Apple {L("navShort")}
                  </a>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

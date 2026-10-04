"use client";

import { useEffect, useRef, useState } from "react";
import type { CampCluster, MapBounds, MapViewport } from "@/lib/maps/types";

export type CampMapItem = {
  _id: string;
  camp_name: string;
  camp_type: string;
  camp_capacity: string;
  camp_occupancy: number | null;
  visited_status: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  province: string;
  city: string;
  area: string;
};

export type CustomMapPin = {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
};

type CampMapProps = {
  camps: CampMapItem[];
  customPins?: CustomMapPin[];
  customPinsFocusKey?: number;
  focusedCampId?: string;
  focusedCamp?: CampMapItem | null;
  clusters?: CampCluster[];
  filterKey?: string;
  fitBounds?: MapBounds | null;
  onViewportChanged?: (viewport: MapViewport) => void;
  onClusterSelected?: (bounds: MapBounds) => void;
  focusedCampKey?: number;
  isLoading?: boolean;
  hasCountrySelection: boolean;
  onDirectionsRequested: (destination: { latitude: number; longitude: number }) => void;
};

declare global {
  interface Window {
    __eqGoogleMapsPromise?: Promise<any>;
  }
}

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };
const DEFAULT_ZOOM = 5;
const CUSTOM_PIN_COLOR = "#9333ea";
const CUSTOM_PIN_BORDER_COLOR = "#7e22ce";

const STATUS_META: Record<string, { color: string; softColor: string }> = {
  "Just Added": {
    color: "#b91c1c",
    softColor: "rgba(185, 28, 28, 0.14)",
  },
  "To Visit": {
    color: "#d97706",
    softColor: "rgba(217, 119, 6, 0.16)",
  },
  Visited: {
    color: "#facc15",
    softColor: "rgba(250, 204, 21, 0.18)",
  },
  Awarded: {
    color: "#16a34a",
    softColor: "rgba(22, 163, 74, 0.16)",
  },
  "On Hold / Cancelled": {
    color: "#000000",
    softColor: "rgba(15, 23, 42, 0.22)",
  },
};

const loadGoogleMaps = async (apiKey: string) => {
  if (typeof window === "undefined") {
    throw new Error("Google Maps can only be loaded in the browser.");
  }

  const googleMaps = (window as any).google;

  if (googleMaps?.maps) {
    return googleMaps;
  }

  if (window.__eqGoogleMapsPromise) {
    return window.__eqGoogleMapsPromise;
  }

  window.__eqGoogleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps="eq-camp-map"]') as HTMLScriptElement | null;

    const handleLoad = () => {
      const loadedGoogleMaps = (window as any).google;

      if (loadedGoogleMaps?.maps) {
        resolve(loadedGoogleMaps);
      } else {
        reject(new Error("Google Maps loaded without the maps namespace."));
      }
    };

    const handleError = () => reject(new Error("Failed to load Google Maps script."));

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "eq-camp-map";
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  return window.__eqGoogleMapsPromise;
};

const getMarkerIconUrl = (color: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42" fill="none">
      <path d="M17 1C8.163 1 1 8.163 1 17c0 11.5 13.47 22.5 15.18 23.86a1.36 1.36 0 0 0 1.64 0C19.53 39.5 33 28.5 33 17 33 8.163 25.837 1 17 1Z" fill="${color}" stroke="white" stroke-width="1.8"/>
      <circle cx="17" cy="17" r="6.3" fill="white" fill-opacity="0.9"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
};

const createInfoWindowContent = (
  camp: CampMapItem,
  onDirectionsRequested: CampMapProps["onDirectionsRequested"]
) => {
  const wrapper = document.createElement("div");
  wrapper.style.maxWidth = "260px";
  wrapper.style.padding = "6px 4px 2px";
  wrapper.style.color = "#0f172a";
  wrapper.style.fontFamily = "Arial, sans-serif";

  const title = document.createElement("div");
  title.textContent = camp.camp_name;
  title.style.fontSize = "15px";
  title.style.fontWeight = "700";
  title.style.marginBottom = "8px";
  wrapper.appendChild(title);

  const status = document.createElement("span");
  status.textContent = camp.visited_status;
  status.style.display = "inline-block";
  status.style.padding = "4px 8px";
  status.style.marginBottom = "10px";
  status.style.borderRadius = "999px";
  status.style.fontSize = "12px";
  status.style.fontWeight = "600";
  status.style.background = STATUS_META[camp.visited_status]?.softColor || STATUS_META["Just Added"].softColor;
  status.style.color = STATUS_META[camp.visited_status]?.color || STATUS_META["Just Added"].color;
  wrapper.appendChild(status);

  const lines = [
    `${camp.country}${camp.region ? ` / ${camp.region}` : ""}${camp.province ? ` / ${camp.province}` : ""}`,
    `${camp.city || "No city"}${camp.area ? ` / ${camp.area}` : ""}`,
    `Capacity: ${camp.camp_capacity || "N/A"}`,
    `Occupancy: ${camp.camp_occupancy ?? "N/A"}`,
    `Coordinates: ${camp.latitude}, ${camp.longitude}`,
  ];

  lines.forEach((line) => {
    const row = document.createElement("div");
    row.textContent = line;
    row.style.fontSize = "12px";
    row.style.marginBottom = "5px";
    row.style.lineHeight = "1.35";
    wrapper.appendChild(row);
  });

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "12px";
  actions.style.marginTop = "12px";
  actions.style.alignItems = "center";
  actions.style.flexWrap = "wrap";

  const link = document.createElement("a");
  link.href = `/admin/enquiries/camps/${camp._id}`;
  link.textContent = "Open camp";
  link.style.display = "inline-flex";
  link.style.alignItems = "center";
  link.style.justifyContent = "center";
  link.style.minHeight = "34px";
  link.style.padding = "0 12px";
  link.style.borderRadius = "999px";
  link.style.background = "#e6fffb";
  link.style.border = "1px solid #99f6e4";
  link.style.fontSize = "12px";
  link.style.fontWeight = "700";
  link.style.color = "#0f766e";
  link.style.textDecoration = "none";
  actions.appendChild(link);

  const direction = document.createElement("button");
  direction.type = "button";
  direction.textContent = "Direction";
  direction.style.display = "inline-flex";
  direction.style.alignItems = "center";
  direction.style.justifyContent = "center";
  direction.style.minHeight = "38px";
  direction.style.padding = "0 16px";
  direction.style.borderRadius = "999px";
  direction.style.fontSize = "13px";
  direction.style.fontWeight = "700";
  direction.style.color = "#ffffff";
  direction.style.background = "#2563eb";
  direction.style.border = "1px solid #1d4ed8";
  direction.style.boxShadow = "0 8px 18px rgba(37, 99, 235, 0.22)";
  direction.style.cursor = "pointer";
  direction.addEventListener("click", () => {
    onDirectionsRequested({ latitude: camp.latitude, longitude: camp.longitude });
  });
  actions.appendChild(direction);

  wrapper.appendChild(actions);

  return wrapper;
};

const createCustomInfoWindowContent = (
  pin: CustomMapPin,
  onDirectionsRequested: CampMapProps["onDirectionsRequested"]
) => {
  const wrapper = document.createElement("div");
  wrapper.style.maxWidth = "260px";
  wrapper.style.padding = "6px 4px 2px";
  wrapper.style.color = "#0f172a";
  wrapper.style.fontFamily = "Arial, sans-serif";

  const title = document.createElement("div");
  title.textContent = pin.title;
  title.style.fontSize = "15px";
  title.style.fontWeight = "700";
  title.style.marginBottom = "8px";
  wrapper.appendChild(title);

  const description = document.createElement("div");
  description.textContent = pin.description || "Custom pin";
  description.style.fontSize = "12px";
  description.style.marginBottom = "8px";
  description.style.lineHeight = "1.35";
  wrapper.appendChild(description);

  const coordinates = document.createElement("div");
  coordinates.textContent = `Coordinates: ${pin.latitude}, ${pin.longitude}`;
  coordinates.style.fontSize = "12px";
  coordinates.style.marginBottom = "12px";
  coordinates.style.lineHeight = "1.35";
  wrapper.appendChild(coordinates);

  const direction = document.createElement("button");
  direction.type = "button";
  direction.textContent = "Direction";
  direction.style.display = "inline-flex";
  direction.style.alignItems = "center";
  direction.style.justifyContent = "center";
  direction.style.minHeight = "38px";
  direction.style.padding = "0 16px";
  direction.style.borderRadius = "999px";
  direction.style.fontSize = "13px";
  direction.style.fontWeight = "700";
  direction.style.color = "#ffffff";
  direction.style.background = CUSTOM_PIN_COLOR;
  direction.style.border = `1px solid ${CUSTOM_PIN_BORDER_COLOR}`;
  direction.style.boxShadow = "0 8px 18px rgba(147, 51, 234, 0.22)";
  direction.style.cursor = "pointer";
  direction.addEventListener("click", () => {
    onDirectionsRequested({ latitude: pin.latitude, longitude: pin.longitude });
  });
  wrapper.appendChild(direction);

  return wrapper;
};

export default function CampMap({
  camps, clusters = [], customPins = [], customPinsFocusKey = 0, focusedCamp = null,
  focusedCampKey = 0, isLoading = false, hasCountrySelection, onDirectionsRequested,
  filterKey = "", fitBounds, onViewportChanged, onClusterSelected,
}: CampMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef(new Map<string, { marker: any; signature: string }>());
  const viewportCallback = useRef(onViewportChanged);
  viewportCallback.current = onViewportChanged;
  const lastFit = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if (!apiKey) { setMapError("The map is currently unavailable. Please contact your administrator."); return; }
    let cancelled = false;
    let idleListener: any;
    loadGoogleMaps(apiKey).then(google => {
      if (cancelled || !mapRef.current) return;
      const map = new google.maps.Map(mapRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
        mapTypeControl: true, streetViewControl: false, fullscreenControl: false,
        gestureHandling: "greedy", clickableIcons: false, mapTypeId: "roadmap" });
      mapInstanceRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      const report = () => {
        const bounds = map.getBounds();
        if (!bounds) return;
        const ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
        viewportCallback.current?.({ south: sw.lat(), west: sw.lng(), north: ne.lat(), east: ne.lng(), zoom: map.getZoom() || 5 });
      };
      idleListener = map.addListener("idle", report);
      report();
      setReady(true); setMapError(null);
    }).catch(error => { if (!cancelled) setMapError(error instanceof Error ? error.message : "Unable to load the map."); });
    const markers = markersRef.current;
    return () => {
      cancelled = true; idleListener?.remove();
      const google = (window as any).google;
      markers.forEach(({ marker }) => { google?.maps?.event.clearInstanceListeners(marker); marker.setMap(null); });
      markers.clear(); infoWindowRef.current?.close(); mapInstanceRef.current = null;
    };
  }, [apiKey]);

  // Filter changes fit once. Refreshes and panning never pull the camera back.
  useEffect(() => {
    if (!ready || fitBounds === undefined || lastFit.current === filterKey) return;
    lastFit.current = filterKey;
    const map = mapInstanceRef.current;
    if (fitBounds) {
      if (fitBounds.south === fitBounds.north && fitBounds.west === fitBounds.east) {
        map.setCenter({ lat: fitBounds.south, lng: fitBounds.west }); map.setZoom(14);
      } else {
        map.fitBounds(fitBounds);
        (window as any).google.maps.event.addListenerOnce(map, "idle", () => { if (map.getZoom() > 14) map.setZoom(14); });
      }
    } else { map.setCenter(DEFAULT_CENTER); map.setZoom(DEFAULT_ZOOM); }
  }, [ready, fitBounds, filterKey]);

  useEffect(() => {
    if (!ready) return;
    const map = mapInstanceRef.current, google = (window as any).google;
    const entries = [
      ...camps.filter(camp => camp._id !== focusedCamp?._id).map(camp => ({ key: `camp:${camp._id}`, value: camp, type: "camp" })),
      ...(focusedCamp ? [{ key: `camp:${focusedCamp._id}`, value: focusedCamp, type: "camp" }] : []),
      ...clusters.map(cluster => ({ key: `cluster:${cluster.id}`, value: cluster, type: "cluster" })),
      ...customPins.map(pin => ({ key: `custom:${pin.id}`, value: pin, type: "custom" })),
    ];
    const wanted = new Set(entries.map(entry => entry.key));
    markersRef.current.forEach(({ marker }, key) => {
      if (!wanted.has(key)) { google.maps.event.clearInstanceListeners(marker); marker.setMap(null); markersRef.current.delete(key); }
    });
    entries.forEach(({ key, value, type }) => {
      const item: any = value;
      const signature = JSON.stringify(item);
      const existing = markersRef.current.get(key);
      if (existing?.signature === signature) return;
      if (existing) { google.maps.event.clearInstanceListeners(existing.marker); existing.marker.setMap(null); }
      const isCluster = type === "cluster";
      const color = type === "custom" ? CUSTOM_PIN_COLOR : (STATUS_META[item.visited_status] || STATUS_META["Just Added"]).color;
      const marker = new google.maps.Marker({ position: { lat: item.latitude, lng: item.longitude }, map,
        title: isCluster ? `${item.count} facilities. Select to zoom or browse.` : item.camp_name || item.title,
        ...(isCluster ? { label: { text: String(item.count), color: "white", fontWeight: "700" }, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 22, fillColor: "#0891b2", fillOpacity: 0.95, strokeColor: "white", strokeWeight: 2 } }
          : { icon: { url: getMarkerIconUrl(color), scaledSize: new google.maps.Size(34, 42), anchor: new google.maps.Point(17, 42) } }),
      });
      marker.addListener("click", () => {
        if (isCluster) {
          if (map.getZoom() >= 18 || (item.bounds.south === item.bounds.north && item.bounds.west === item.bounds.east)) {
            onClusterSelected?.({ south: Math.max(-90, item.bounds.south - 0.000001), north: Math.min(90, item.bounds.north + 0.000001), west: Math.max(-180, item.bounds.west - 0.000001), east: Math.min(180, item.bounds.east + 0.000001) });
          } else { map.fitBounds(item.bounds); }
          return;
        }
        infoWindowRef.current.setContent(type === "custom" ? createCustomInfoWindowContent(item, onDirectionsRequested) : createInfoWindowContent(item, onDirectionsRequested));
        infoWindowRef.current.open({ map, anchor: marker });
      });
      markersRef.current.set(key, { marker, signature });
    });
  }, [ready, camps, clusters, customPins, focusedCamp, onDirectionsRequested, onClusterSelected]);

  useEffect(() => {
    if (!ready || !focusedCamp) return;
    const map = mapInstanceRef.current;
    map.setCenter({ lat: focusedCamp.latitude, lng: focusedCamp.longitude }); map.setZoom(14);
    const entry = markersRef.current.get(`camp:${focusedCamp._id}`);
    if (entry) { infoWindowRef.current.setContent(createInfoWindowContent(focusedCamp, onDirectionsRequested)); infoWindowRef.current.open({ map, anchor: entry.marker }); }
  }, [ready, focusedCamp, focusedCampKey, onDirectionsRequested]);
  useEffect(() => {
    if (!ready || !customPins.length) return;
    const pin = customPins[0], map = mapInstanceRef.current;
    map.setCenter({ lat: pin.latitude, lng: pin.longitude }); map.setZoom(14);
    const entry = markersRef.current.get(`custom:${pin.id}`);
    if (entry) { infoWindowRef.current.setContent(createCustomInfoWindowContent(pin, onDirectionsRequested)); infoWindowRef.current.open({ map, anchor: entry.marker }); }
  }, [ready, customPins, customPinsFocusKey, onDirectionsRequested]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-800/80 bg-slate-950/80">
      <div ref={mapRef} className="h-[520px] w-full md:h-[640px]" />

      {mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/92 p-6 text-center">
          <div className="max-w-md rounded-3xl border border-amber-500/30 bg-amber-950/30 px-6 py-5 text-sm text-amber-100">
            {mapError}
          </div>
        </div>
      ) : null}

      {!mapError && !hasCountrySelection && customPins.length === 0 ? (
        <div className="absolute left-4 top-4 rounded-full border border-slate-700/80 bg-slate-950/85 px-4 py-2 text-xs font-medium text-slate-300 shadow-lg shadow-slate-950/40">
          Select a country to load camp pins.
        </div>
      ) : null}

      {!mapError && hasCountrySelection && !isLoading && camps.length === 0 && clusters.length === 0 && customPins.length === 0 ? (
        <div className="absolute left-4 top-4 rounded-full border border-slate-700/80 bg-slate-950/85 px-4 py-2 text-xs font-medium text-slate-300 shadow-lg shadow-slate-950/40">
          No facilities in this map area. Move the map or change the filters.
        </div>
      ) : null}

      {!mapError && isLoading ? (
        <div className="pointer-events-none absolute right-4 top-4">
          <div className="rounded-full border border-cyan-500/30 bg-slate-950/90 px-4 py-2 text-sm text-cyan-100">
            Loading map pins...
          </div>
        </div>
      ) : null}
    </div>
  );
}

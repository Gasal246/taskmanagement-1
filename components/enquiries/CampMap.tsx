"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CampCluster, MapBounds, MapViewport } from "@/lib/maps/types";
import { cn } from "@/lib/utils";

export type CampMapItem = {
  _id: string;
  enquiry_id?: string;
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
  className?: string;
  enquiryBasePath?: string;
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
  onStatusChange?: (status: "loading" | "ready" | "error") => void;
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

const STATUS_META: Record<string, { color: string; softColor: string; textColor: string }> = {
  "Just Added": {
    color: "#b91c1c",
    textColor: "#fca5a5",
    softColor: "rgba(185, 28, 28, 0.14)",
  },
  "To Visit": {
    color: "#d97706",
    textColor: "#fbbf24",
    softColor: "rgba(217, 119, 6, 0.16)",
  },
  Visited: {
    color: "#facc15",
    textColor: "#fde047",
    softColor: "rgba(250, 204, 21, 0.18)",
  },
  Awarded: {
    color: "#16a34a",
    textColor: "#6ee7b7",
    softColor: "rgba(22, 163, 74, 0.16)",
  },
  "On Hold / Cancelled": {
    color: "#000000",
    textColor: "#e2e8f0",
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

const createPopupShell = (heading: string) => {
  const wrapper = document.createElement("div");
  wrapper.className = "map-pin-popup";
  const title = document.createElement("h3");
  title.className = "map-pin-popup__title";
  title.textContent = heading;
  wrapper.appendChild(title);
  return wrapper;
};

const appendPopupDetail = (wrapper: HTMLElement, text: string, className = "") => {
  const row = document.createElement("div");
  row.className = `map-pin-popup__detail ${className}`;
  row.textContent = text;
  wrapper.appendChild(row);
};

const createDirectionButton = (
  destination: { latitude: number; longitude: number },
  onDirectionsRequested: CampMapProps["onDirectionsRequested"],
  custom = false
) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `map-pin-popup__action map-pin-popup__action--direction${custom ? " map-pin-popup__action--custom" : ""}`;
  button.textContent = "Direction";
  button.addEventListener("click", () => onDirectionsRequested(destination));
  return button;
};

const createInfoWindowContent = (
  camp: CampMapItem,
  onDirectionsRequested: CampMapProps["onDirectionsRequested"],
  enquiryBasePath?: string
) => {
  const wrapper = createPopupShell(camp.camp_name);
  const statusMeta = STATUS_META[camp.visited_status] || STATUS_META["Just Added"];
  const status = document.createElement("span");
  status.className = "map-pin-popup__status";
  status.textContent = camp.visited_status;
  status.style.background = statusMeta.softColor;
  status.style.color = statusMeta.textColor;
  wrapper.appendChild(status);

  const location = document.createElement("div");
  location.className = "map-pin-popup__location";
  appendPopupDetail(location, `${camp.country}${camp.region ? ` / ${camp.region}` : ""}${camp.province ? ` / ${camp.province}` : ""}`);
  appendPopupDetail(location, `${camp.city || "No city"}${camp.area ? ` / ${camp.area}` : ""}`);
  wrapper.appendChild(location);

  const metrics = document.createElement("dl");
  metrics.className = "map-pin-popup__metrics";
  for (const [label, value] of [["Capacity", camp.camp_capacity || "N/A"], ["Occupancy", String(camp.camp_occupancy ?? "N/A")]]) {
    const cell = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    cell.append(term, description);
    metrics.appendChild(cell);
  }
  wrapper.appendChild(metrics);
  appendPopupDetail(wrapper, `Coordinates: ${camp.latitude}, ${camp.longitude}`, "map-pin-popup__coordinates");

  const actions = document.createElement("div");
  actions.className = "map-pin-popup__actions";
  if (!enquiryBasePath || camp.enquiry_id) {
    const link = document.createElement("a");
    link.href = enquiryBasePath ? `${enquiryBasePath}/${camp.enquiry_id}` : `/admin/enquiries/camps/${camp._id}`;
    link.className = "map-pin-popup__action map-pin-popup__action--open";
    link.textContent = enquiryBasePath ? "Open enquiry" : "Open camp";
    actions.appendChild(link);
  }
  actions.appendChild(createDirectionButton(camp, onDirectionsRequested));
  wrapper.appendChild(actions);
  return wrapper;
};

const createCustomInfoWindowContent = (
  pin: CustomMapPin,
  onDirectionsRequested: CampMapProps["onDirectionsRequested"]
) => {
  const wrapper = createPopupShell(pin.title);
  appendPopupDetail(wrapper, pin.description || "Custom pin", "map-pin-popup__location");
  appendPopupDetail(wrapper, `Coordinates: ${pin.latitude}, ${pin.longitude}`, "map-pin-popup__coordinates");
  const actions = document.createElement("div");
  actions.className = "map-pin-popup__actions";
  actions.appendChild(createDirectionButton(pin, onDirectionsRequested, true));
  wrapper.appendChild(actions);
  return wrapper;
};

export default function CampMap({
  camps, enquiryBasePath, clusters = [], customPins = [], customPinsFocusKey = 0, focusedCamp = null,
  focusedCampKey = 0, isLoading = false, hasCountrySelection, onDirectionsRequested,
  filterKey = "", fitBounds, onViewportChanged, onClusterSelected, className, onStatusChange,
}: CampMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const activePinKey = useRef<string | null>(null);
  const directionsCallback = useRef(onDirectionsRequested);
  directionsCallback.current = onDirectionsRequested;
  const closePopup = useCallback(() => {
    infoWindowRef.current?.close();
    activePinKey.current = null;
  }, []);
  const showPopup = useCallback((key: string, content: HTMLElement, marker: any, toggle = false) => {
    if (toggle && activePinKey.current === key) {
      closePopup();
      return;
    }
    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open({ map: mapInstanceRef.current, anchor: marker });
    activePinKey.current = key;
  }, [closePopup]);
  const requestDirections = useCallback((destination: { latitude: number; longitude: number }) => directionsCallback.current(destination), []);
  const markersRef = useRef(new Map<string, { marker: any; signature: string }>());
  const viewportCallback = useRef(onViewportChanged);
  viewportCallback.current = onViewportChanged;
  const lastFit = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    onStatusChange?.(mapError ? "error" : ready ? "ready" : "loading");
  }, [ready, mapError, onStatusChange]);

  useEffect(() => {
    if (!apiKey) { setMapError("The map is currently unavailable. Please contact your administrator."); return; }
    let cancelled = false;
    let idleListener: any;
    let mapClickListener: any;
    let closeListener: any;
    loadGoogleMaps(apiKey).then(google => {
      if (cancelled || !mapRef.current) return;
      const map = new google.maps.Map(mapRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
        mapTypeControl: true, streetViewControl: false, fullscreenControl: false,
        mapTypeControlOptions: { position: google.maps.ControlPosition?.BOTTOM_LEFT },
        zoomControlOptions: { position: google.maps.ControlPosition?.LEFT_CENTER },
        gestureHandling: "greedy", clickableIcons: false, mapTypeId: "roadmap" });
      mapInstanceRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 360, ariaLabel: "Location details" });
      closeListener = infoWindowRef.current.addListener?.("closeclick", () => { activePinKey.current = null; });
      mapClickListener = map.addListener("click", closePopup);
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
      cancelled = true; idleListener?.remove(); mapClickListener?.remove(); closeListener?.remove();
      const google = (window as any).google;
      markers.forEach(({ marker }) => { google?.maps?.event.clearInstanceListeners(marker); marker.setMap(null); });
      markers.clear(); closePopup(); mapInstanceRef.current = null;
    };
  }, [apiKey, closePopup]);

  // The same map instance survives fullscreen and responsive layout changes.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const observer = new ResizeObserver(() => {
      const map = mapInstanceRef.current;
      const center = map.getCenter?.();
      (window as any).google.maps.event.trigger?.(map, "resize");
      if (center) map.setCenter(center);
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [ready]);

  // Filter changes fit once. Refreshes and panning never pull the camera back.
  useEffect(() => {
    if (!ready || fitBounds === undefined || lastFit.current === filterKey) return;
    lastFit.current = filterKey;
    closePopup();
    const map = mapInstanceRef.current;
    if (fitBounds) {
      if (fitBounds.south === fitBounds.north && fitBounds.west === fitBounds.east) {
        map.setCenter({ lat: fitBounds.south, lng: fitBounds.west }); map.setZoom(14);
      } else {
        map.fitBounds(fitBounds);
        (window as any).google.maps.event.addListenerOnce(map, "idle", () => { if (map.getZoom() > 14) map.setZoom(14); });
      }
    } else { map.setCenter(DEFAULT_CENTER); map.setZoom(DEFAULT_ZOOM); }
  }, [ready, fitBounds, filterKey, closePopup]);

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
      if (!wanted.has(key)) { if (activePinKey.current === key) closePopup(); google.maps.event.clearInstanceListeners(marker); marker.setMap(null); markersRef.current.delete(key); }
    });
    entries.forEach(({ key, value, type }) => {
      const item: any = value;
      const signature = JSON.stringify([item, enquiryBasePath]);
      const existing = markersRef.current.get(key);
      if (existing?.signature === signature) return;
      if (existing) { if (activePinKey.current === key) closePopup(); google.maps.event.clearInstanceListeners(existing.marker); existing.marker.setMap(null); }
      const isCluster = type === "cluster";
      const color = type === "custom" ? CUSTOM_PIN_COLOR : (STATUS_META[item.visited_status] || STATUS_META["Just Added"]).color;
      const marker = new google.maps.Marker({ position: { lat: item.latitude, lng: item.longitude }, map,
        title: isCluster ? `${item.count} facilities. Select to zoom or browse.` : item.camp_name || item.title,
        ...(isCluster ? { label: { text: String(item.count), color: "white", fontWeight: "700" }, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 22, fillColor: "#0891b2", fillOpacity: 0.95, strokeColor: "white", strokeWeight: 2 } }
          : { icon: { url: getMarkerIconUrl(color), scaledSize: new google.maps.Size(34, 42), anchor: new google.maps.Point(17, 42) } }),
      });
      marker.addListener("click", () => {
        if (isCluster) {
          closePopup();
          if (map.getZoom() >= 18 || (item.bounds.south === item.bounds.north && item.bounds.west === item.bounds.east)) {
            onClusterSelected?.({ south: Math.max(-90, item.bounds.south - 0.000001), north: Math.min(90, item.bounds.north + 0.000001), west: Math.max(-180, item.bounds.west - 0.000001), east: Math.min(180, item.bounds.east + 0.000001) });
          } else { map.fitBounds(item.bounds); }
          return;
        }
        showPopup(key, type === "custom" ? createCustomInfoWindowContent(item, requestDirections) : createInfoWindowContent(item, requestDirections, enquiryBasePath), marker, true);
      });
      markersRef.current.set(key, { marker, signature });
    });
  }, [ready, camps, enquiryBasePath, clusters, customPins, focusedCamp, requestDirections, onClusterSelected, closePopup, showPopup]);

  useEffect(() => {
    if (!ready || !focusedCamp) return;
    const map = mapInstanceRef.current;
    map.setCenter({ lat: focusedCamp.latitude, lng: focusedCamp.longitude }); map.setZoom(14);
    const entry = markersRef.current.get(`camp:${focusedCamp._id}`);
    if (entry) showPopup(`camp:${focusedCamp._id}`, createInfoWindowContent(focusedCamp, requestDirections, enquiryBasePath), entry.marker);
  }, [ready, focusedCamp, enquiryBasePath, focusedCampKey, requestDirections, showPopup]);
  useEffect(() => {
    if (!ready || !customPins.length) return;
    const pin = customPins[0], map = mapInstanceRef.current;
    map.setCenter({ lat: pin.latitude, lng: pin.longitude }); map.setZoom(14);
    const entry = markersRef.current.get(`custom:${pin.id}`);
    if (entry) showPopup(`custom:${pin.id}`, createCustomInfoWindowContent(pin, requestDirections), entry.marker);
  }, [ready, customPins, customPinsFocusKey, requestDirections, showPopup]);

  return (
    <div className={cn("facility-map relative h-[520px] overflow-hidden rounded-[28px] border border-slate-800/80 bg-slate-950/80 md:h-[640px]", className)}>
      <div ref={mapRef} className="h-full w-full" />

      {mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/92 p-6 text-center">
          <div className="max-w-md rounded-3xl border border-amber-500/30 bg-amber-950/30 px-6 py-5 text-sm text-amber-100">
            {mapError}
          </div>
        </div>
      ) : null}

      {!mapError && !hasCountrySelection && customPins.length === 0 ? (
        <div className="pointer-events-none absolute left-3 top-20 max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/15 bg-slate-950/40 px-4 py-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-xl sm:left-5">
          Select a country to load camp pins.
        </div>
      ) : null}

      {!mapError && hasCountrySelection && !isLoading && camps.length === 0 && clusters.length === 0 && customPins.length === 0 ? (
        <div className="pointer-events-none absolute left-3 top-20 max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/15 bg-slate-950/40 px-4 py-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-xl sm:left-5">
          No facilities in this map area. Move the map or change the filters.
        </div>
      ) : null}

    </div>
  );
}

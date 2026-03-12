"use client";

import { useEffect, useRef, useState } from "react";

type CampMapItem = {
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

type CampMapProps = {
  camps: CampMapItem[];
  isLoading?: boolean;
  hasCountrySelection: boolean;
};

declare global {
  interface Window {
    __eqGoogleMapsPromise?: Promise<any>;
  }
}

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };
const DEFAULT_ZOOM = 5;

const STATUS_META: Record<string, { color: string; softColor: string }> = {
  Visited: {
    color: "#15803d",
    softColor: "rgba(21, 128, 61, 0.16)",
  },
  "To Visit": {
    color: "#d97706",
    softColor: "rgba(217, 119, 6, 0.16)",
  },
  Cancelled: {
    color: "#2563eb",
    softColor: "rgba(37, 99, 235, 0.16)",
  },
  "Just Added": {
    color: "#b91c1c",
    softColor: "rgba(185, 28, 28, 0.14)",
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

const createInfoWindowContent = (camp: CampMapItem) => {
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

  const link = document.createElement("a");
  link.href = `/admin/enquiries/camps/${camp._id}`;
  link.textContent = "Open camp";
  link.style.display = "inline-block";
  link.style.marginTop = "8px";
  link.style.fontSize = "12px";
  link.style.fontWeight = "700";
  link.style.color = "#0f766e";
  link.style.textDecoration = "none";
  wrapper.appendChild(link);

  return wrapper;
};

export default function CampMap({ camps, isLoading = false, hasCountrySelection }: CampMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if (!apiKey) {
      setMapError("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to render the map.");
      return;
    }

    let isCancelled = false;

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (isCancelled || !mapRef.current) return;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: "greedy",
            clickableIcons: false,
            mapTypeId: "roadmap",
          });

          infoWindowRef.current = new google.maps.InfoWindow();
        }

        setMapError(null);
      })
      .catch((error) => {
        if (!isCancelled) {
          setMapError(error instanceof Error ? error.message : "Failed to load Google Maps.");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const google = (window as any).google;

    if (!map || !google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (!camps.length) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    markersRef.current = camps.map((camp) => {
      const meta = STATUS_META[camp.visited_status] || STATUS_META["Just Added"];
      const marker = new google.maps.Marker({
        position: { lat: camp.latitude, lng: camp.longitude },
        map,
        title: camp.camp_name,
        icon: {
          url: getMarkerIconUrl(meta.color),
          scaledSize: new google.maps.Size(34, 42),
          anchor: new google.maps.Point(17, 42),
        },
      });

      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;
        infoWindowRef.current.setContent(createInfoWindowContent(camp));
        infoWindowRef.current.open({ map, anchor: marker });
      });

      bounds.extend(marker.getPosition());
      return marker;
    });

    if (camps.length === 1) {
      map.setCenter({ lat: camps[0].latitude, lng: camps[0].longitude });
      map.setZoom(14);
      return;
    }

    map.fitBounds(bounds);
    google.maps.event.addListenerOnce(map, "idle", () => {
      if (map.getZoom() > 14) {
        map.setZoom(14);
      }
    });
  }, [camps]);

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

      {!mapError && !hasCountrySelection ? (
        <div className="absolute left-4 top-4 rounded-full border border-slate-700/80 bg-slate-950/85 px-4 py-2 text-xs font-medium text-slate-300 shadow-lg shadow-slate-950/40">
          Select a country to load camp pins.
        </div>
      ) : null}

      {!mapError && hasCountrySelection && !isLoading && camps.length === 0 ? (
        <div className="absolute left-4 top-4 rounded-full border border-slate-700/80 bg-slate-950/85 px-4 py-2 text-xs font-medium text-slate-300 shadow-lg shadow-slate-950/40">
          No camps with coordinates match the selected filters.
        </div>
      ) : null}

      {!mapError && isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px]">
          <div className="rounded-full border border-cyan-500/30 bg-slate-950/90 px-4 py-2 text-sm text-cyan-100">
            Loading map pins...
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import ListPagination from "@/components/shared/ListPagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { MapBounds, MapViewport } from "@/lib/maps/types";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CampMap, { type CampMapItem, type CustomMapPin } from "@/components/enquiries/CampMap";
import {
  useAddEqCustomMapPin,
  useDeleteEqCustomMapPin,
  useGetEqCountries,
  useGetEqCustomMapPins,
  useGetEqRegions,
  useGetEqProvince,
  useGetEqCampsForMap,
  useUpdateEqCustomMapPin,
} from "@/query/enquirymanager/queries";
import { ArrowLeft, ChevronDown, Ellipsis, LoaderCircle, LocateFixed, MapPinned, Maximize2, Minimize2, Navigation, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";

const STATUS_META = [
  { key: "Just Added", label: "Just Added", color: "bg-red-700", chipClassName: "border-red-200/60 bg-red-100/95 text-red-950", countKey: "justAdded" },
  { key: "To Visit", label: "To Visit", color: "bg-orange-500", chipClassName: "border-orange-300/60 bg-orange-400/95 text-orange-950", countKey: "toVisit" },
  { key: "Visited", label: "Visited", color: "bg-yellow-400", chipClassName: "border-yellow-200/60 bg-yellow-200/95 text-yellow-950", countKey: "visited" },
  { key: "Awarded", label: "Awarded", color: "bg-green-600", chipClassName: "border-emerald-200/60 bg-emerald-200/95 text-emerald-950", countKey: "awarded" },
  { key: "On Hold / Cancelled", label: "On Hold / Cancel", color: "bg-black", chipClassName: "border-white/15 bg-black/90 text-white", countKey: "cancelled" },
] as const;

const parseCoordinateInput = (value: string) => {
  const normalized = value.trim().toUpperCase().replace(/[°º]/g, "").replace(/,/g, ".");
  const direction = normalized.match(/[NSEW]/)?.[0];
  const numberMatch = normalized.match(/-?\d+(?:\.\d+)?/);

  if (!numberMatch) return null;

  let coordinate = Number(numberMatch[0]);
  if (!Number.isFinite(coordinate)) return null;

  if (direction === "S" || direction === "W") {
    coordinate = -Math.abs(coordinate);
  }
  if (direction === "N" || direction === "E") {
    coordinate = Math.abs(coordinate);
  }

  return coordinate;
};

const parseGoogleMapLink = (value: string) => {
  let decodedValue = value.trim();
  try {
    decodedValue = decodeURIComponent(decodedValue);
  } catch {
    decodedValue = value.trim();
  }

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /\/(?:search|place|dir)\/[^?]*?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = decodedValue.match(pattern);
    if (match) {
      return {
        latitude: Number(match[1]),
        longitude: Number(match[2]),
      };
    }
  }

  return null;
};

const isValidCoordinates = (latitude: number, longitude: number) => {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

const isAppleDevice = () => {
  const userAgent = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) || (userAgent.includes("Mac") && "ontouchend" in document);
};

const openPreferredMap = (pin: Pick<CustomMapPin, "latitude" | "longitude">, provider: "google-app" | "apple" | "google-web") => {
  const destination = `${pin.latitude},${pin.longitude}`;
  const googleWebUrl = new URL("https://www.google.com/maps/dir/");
  googleWebUrl.searchParams.set("api", "1");
  googleWebUrl.searchParams.set("destination", destination);
  googleWebUrl.searchParams.set("travelmode", "driving");

  if (provider === "apple") {
    const appleMapsUrl = new URL("https://maps.apple.com/");
    appleMapsUrl.searchParams.set("daddr", destination);
    appleMapsUrl.searchParams.set("dirflg", "d");
    window.location.assign(appleMapsUrl.toString());
    return;
  }

  if (provider === "google-web") {
    window.location.assign(googleWebUrl.toString());
    return;
  }

  const appUrl = isAppleDevice() ? `comgooglemaps://?daddr=${destination}&directionsmode=driving` : `google.navigation:q=${destination}&mode=d`;
  const fallbackUrl = googleWebUrl.toString();
  const fallbackTimer = window.setTimeout(() => {
    window.location.assign(fallbackUrl);
  }, 1200);

  const clearFallback = () => {
    window.clearTimeout(fallbackTimer);
    window.removeEventListener("pagehide", clearFallback);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      clearFallback();
    }
  };

  window.addEventListener("pagehide", clearFallback, { once: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.location.href = appUrl;
};

export default function EnquiriesMapPage({ audience = "admin" }: { audience?: "admin" | "staff" }) {
  const isStaff = audience === "staff";
  const router = useRouter();
  const [mapViewElement, setMapViewElement] = useState<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [country_id, setCountry] = useState("");
  const [region_id, setRegion] = useState("");
  const [province_id, setProvince] = useState("");
  const [selectedCustomPinId, setSelectedCustomPinId] = useState("");
  const [customPinFocusKey, setCustomPinFocusKey] = useState(0);
  const [selectedCampId, setSelectedCampId] = useState("");
  const [selectedCamp, setSelectedCamp] = useState<CampMapItem | null>(null);
  const [viewport, setViewport] = useState<(MapViewport & { filterKey: string }) | null>(null);
  const [locationPage, setLocationPage] = useState(1);
  const [listBounds, setListBounds] = useState<MapBounds | null>(null);
  const [campFocusKey, setCampFocusKey] = useState(0);
  const [locationListDialogOpen, setLocationListDialogOpen] = useState(false);
  const [locationListSearch, setLocationListSearch] = useState("");
  const [customPinSearch, setCustomPinSearch] = useState("");
  const [customPinDialogOpen, setCustomPinDialogOpen] = useState(false);
  const [editingCustomPinId, setEditingCustomPinId] = useState("");
  const [deletingCustomPin, setDeletingCustomPin] = useState<CustomMapPin | null>(null);
  const [directionsTarget, setDirectionsTarget] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showAppleMapsOption, setShowAppleMapsOption] = useState(false);
  const [locationMode, setLocationMode] = useState<"link" | "coordinates">("link");
  const [customPinForm, setCustomPinForm] = useState({
    title: "",
    description: "",
    googleMapLink: "",
    latitude: "",
    longitude: "",
  });
  const [customPinError, setCustomPinError] = useState("");

  const { mutateAsync: GetCountries, isPending: isCountriesLoading } = useGetEqCountries();
  const { data: regions, isLoading: isRegionsLoading } = useGetEqRegions(country_id);
  const { data: provinces, isLoading: isProvincesLoading } = useGetEqProvince(region_id);
  const { data: customPinsData, isLoading: isCustomPinsLoading, refetch: refetchCustomPins } = useGetEqCustomMapPins(!isStaff);
  const { mutateAsync: AddCustomMapPin, isPending: isAddingCustomPin } = useAddEqCustomMapPin();
  const { mutateAsync: UpdateCustomMapPin, isPending: isUpdatingCustomPin } = useUpdateEqCustomMapPin();
  const { mutateAsync: DeleteCustomMapPin, isPending: isDeletingCustomPin } = useDeleteEqCustomMapPin();

  const mapQuery = useMemo(() => ({ country_id, region_id, province_id }), [country_id, region_id, province_id]);
  const filterKey = JSON.stringify(mapQuery);
  const debouncedViewport = useDebouncedValue(viewport, 250);
  const debouncedLocationSearch = useDebouncedValue(locationListSearch);
  const listScope = JSON.stringify([filterKey, debouncedLocationSearch, listBounds]);
  const [locationPageScope, setLocationPageScope] = useState("");
  const currentLocationPage = locationPageScope === listScope ? locationPage : 1;
  const overview = useGetEqCampsForMap({ ...mapQuery, mode: "overview" }, !!country_id, audience);
  const { data: mapData, isFetching: isMapFetching, isError: isMapError, refetch: refetchMap } = useGetEqCampsForMap({
    ...mapQuery, mode: "viewport", ...(debouncedViewport || {}), filterKey: undefined,
  }, !!country_id && !!debouncedViewport && debouncedViewport.filterKey === filterKey, audience);
  const locations = useGetEqCampsForMap({ ...mapQuery, mode: "list", ...(listBounds || {}), search: debouncedLocationSearch, page: currentLocationPage, limit: 50 }, !!country_id && locationListDialogOpen, audience);
  // Keep the map locked through the debounce gap before the next pin request.
  // A failed request must release the lock so its retry controls remain usable.
  const waitingForViewport = !!country_id && !isMapError && !overview.isError && (
    viewport?.filterKey !== filterKey || JSON.stringify(viewport) !== JSON.stringify(debouncedViewport)
  );
  const isMapBusy = mapStatus === "loading" || isCountriesLoading || isCustomPinsLoading
    || (!!country_id && isRegionsLoading) || (!!region_id && isProvincesLoading) || (
    mapStatus === "ready" && !!country_id && (overview.isFetching || isMapFetching || waitingForViewport)
  );
  const onViewportChanged = useCallback((value: MapViewport) => {
    setViewport(current => {
      const next = { ...value, filterKey };
      return JSON.stringify(current) === JSON.stringify(next) ? current : next;
    });
  }, [filterKey]);
  const onClusterSelected = useCallback((bounds: MapBounds) => {
    setListBounds(bounds); setLocationListSearch(""); setLocationListDialogOpen(true);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === mapViewElement;
      setIsFullscreen(active);
      if (!active) fullscreenButtonRef.current?.focus();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [mapViewElement]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      // Browsers without the Fullscreen API use the same layout within the window.
      if (event.key === "Escape" && !document.fullscreenElement && !filterOpen && !locationListDialogOpen && !directionsTarget) {
        setIsFullscreen(false);
        fullscreenButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [isFullscreen, filterOpen, locationListDialogOpen, directionsTarget]);

  const toggleFullscreen = async () => {
    setFilterOpen(false);
    if (isFullscreen) {
      if (document.fullscreenElement === mapViewElement) await document.exitFullscreen();
      else setIsFullscreen(false);
      fullscreenButtonRef.current?.focus();
      return;
    }
    if (!mapViewElement) return;
    setIsFullscreen(true);
    try {
      await mapViewElement.requestFullscreen?.();
    } catch {
      // Keep the full-window layout when native fullscreen is unavailable.
    }
  };

  const fetchCountries = async () => {
    const res = await GetCountries();
    if (res?.status === 200) {
      setCountries(res?.countries || []);
    }
  };

  const updateCustomPinForm = (key: keyof typeof customPinForm, value: string) => {
    setCustomPinForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
    setCustomPinError("");
  };

  const resetCustomPinForm = () => {
    setCustomPinForm({
      title: "",
      description: "",
      googleMapLink: "",
      latitude: "",
      longitude: "",
    });
    setLocationMode("link");
    setCustomPinError("");
  };

  const openAddCustomPinDialog = () => {
    setEditingCustomPinId("");
    resetCustomPinForm();
    setCustomPinDialogOpen(true);
  };

  const openEditCustomPinDialog = (pin: CustomMapPin) => {
    setEditingCustomPinId(pin.id);
    setCustomPinForm({
      title: pin.title,
      description: pin.description,
      googleMapLink: "",
      latitude: String(pin.latitude),
      longitude: String(pin.longitude),
    });
    setLocationMode("coordinates");
    setCustomPinError("");
    setCustomPinDialogOpen(true);
  };

  const openDirectionsDialog = useCallback((pin: Pick<CustomMapPin, "latitude" | "longitude">) => {
    setDirectionsTarget({
      latitude: pin.latitude,
      longitude: pin.longitude,
    });
  }, []);

  const handleOpenDirections = (provider: "google-app" | "apple" | "google-web") => {
    if (!directionsTarget) return;
    openPreferredMap(directionsTarget, provider);
    setDirectionsTarget(null);
  };

  const handleSaveCustomPin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = customPinForm.title.trim();
    const description = customPinForm.description.trim();
    let coordinates: { latitude: number; longitude: number } | null = null;

    if (!title) {
      setCustomPinError("Add a title for the custom pin.");
      return;
    }

    if (locationMode === "link") {
      coordinates = parseGoogleMapLink(customPinForm.googleMapLink);
    } else {
      const latitude = parseCoordinateInput(customPinForm.latitude);
      const longitude = parseCoordinateInput(customPinForm.longitude);
      coordinates = latitude === null || longitude === null ? null : { latitude, longitude };
    }

    if (!coordinates || !isValidCoordinates(coordinates.latitude, coordinates.longitude)) {
      setCustomPinError("Add a valid Google Maps link or latitude and longitude.");
      return;
    }

    const payload = {
      title,
      description,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };
    const res = editingCustomPinId ? await UpdateCustomMapPin({ id: editingCustomPinId, ...payload }) : await AddCustomMapPin(payload);

    if (res?.status !== (editingCustomPinId ? 200 : 201)) {
      setCustomPinError(res?.message || "Failed to save custom pin.");
      return;
    }

    if (editingCustomPinId === selectedCustomPinId) {
      setCustomPinFocusKey((currentKey) => currentKey + 1);
    }

    resetCustomPinForm();
    setEditingCustomPinId("");
    setCustomPinDialogOpen(false);
    await refetchCustomPins();
  };

  const handleDeleteCustomPin = async () => {
    if (!deletingCustomPin) return;

    const res = await DeleteCustomMapPin(deletingCustomPin.id);
    if (res?.status !== 200) return;

    if (deletingCustomPin.id === selectedCustomPinId) {
      setSelectedCustomPinId("");
    }

    setDeletingCustomPin(null);
    await refetchCustomPins();
  };

  useEffect(() => {
    fetchCountries();
    setShowAppleMapsOption(isAppleDevice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const camps: CampMapItem[] = useMemo(() => mapData?.camps || [], [mapData?.camps]);
  const customPins: CustomMapPin[] = useMemo(() => isStaff ? [] : customPinsData?.pins || [], [isStaff, customPinsData?.pins]);
  const summary = overview.data?.summary || {
    total: 0,
    visited: 0,
    toVisit: 0,
    awarded: 0,
    cancelled: 0,
    justAdded: 0,
  };
  const selectedCustomPin = customPins.find((pin) => pin.id === selectedCustomPinId);
  const hasMapFilter = Boolean(country_id || region_id || province_id);
  const isSavingCustomPin = isAddingCustomPin || isUpdatingCustomPin;
  const filteredCustomPins = useMemo(() => {
    const searchValue = customPinSearch.trim().toLowerCase();
    if (!searchValue) return customPins;

    return customPins.filter((pin) =>
      [pin.title, pin.description, `${pin.latitude}`, `${pin.longitude}`]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue)
    );
  }, [customPins, customPinSearch]);
  const filteredLocationList: CampMapItem[] = locations.data?.camps || [];
  const clusters = useMemo(() => mapData?.clusters || [], [mapData?.clusters]);
  const displayedCustomPins = useMemo(() => selectedCustomPin ? [selectedCustomPin] : [], [selectedCustomPin]);

  const overlayClassName = "border border-white/15 bg-slate-950/40 text-white shadow-lg shadow-black/15 backdrop-blur-xl";
  const mapPortalContainer = isFullscreen ? mapViewElement : undefined;

  return (
    <div className="p-3 pb-10 sm:p-5 sm:pb-10">
      <nav aria-label="Breadcrumb">
        <button
          type="button"
          onClick={() => router.push(isStaff ? "/staff/enquiry" : "/admin/enquiries")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>{isStaff ? "Enquiries" : "Dashboard"}</span>
          <span aria-hidden="true" className="text-slate-500">/</span>
          <span className="font-medium text-slate-100">Facility Map</span>
        </button>
      </nav>

      <div className="mt-3 space-y-4">
        <header className="rounded-[24px] border border-slate-800/80 bg-slate-900/75 px-5 py-4 sm:px-6 sm:py-5">
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">Camp map by country, region, and province</h1>
          <p className="mt-2 max-w-6xl text-sm leading-relaxed text-slate-300/80">
            {isStaff
              ? "Facilities linked to enquiries you can see in your enquiry list are plotted here, including newly added facilities awaiting approval."
              : "Facilities linked to your businesses’ enquiries are plotted here, including newly added facilities awaiting approval."}{" "}
            Marker colors follow the enquiry status. Enquiry coordinates are used when available, with saved facility coordinates as a fallback.
          </p>
        </header>

        <section
          ref={setMapViewElement}
          aria-label="Facility map"
          aria-busy={isMapBusy}
          data-map-fullscreen={isFullscreen}
          className={isFullscreen
            ? "fixed inset-0 z-[60] h-[100dvh] w-full overflow-hidden bg-slate-950"
            : "relative isolate h-[calc(100dvh-20rem)] min-h-[540px] w-full overflow-hidden rounded-[28px] border border-slate-700/80 bg-slate-950 sm:min-h-[560px]"}
        >
          <div inert={isMapBusy} className="h-full">
            <CampMap
              className="h-full rounded-none border-0 md:h-full"
              camps={camps}
              enquiryBasePath={isStaff ? "/staff/enquiry" : undefined}
              customPins={displayedCustomPins}
              clusters={clusters}
              filterKey={filterKey}
              fitBounds={country_id ? overview.data?.bounds : null}
              focusedCamp={selectedCampId ? selectedCamp : null}
              onViewportChanged={onViewportChanged}
              onClusterSelected={onClusterSelected}
              customPinsFocusKey={customPinFocusKey}
              focusedCampId={selectedCampId}
              focusedCampKey={campFocusKey}
              isLoading={isMapBusy}
              onStatusChange={setMapStatus}
              hasCountrySelection={!!country_id}
              onDirectionsRequested={openDirectionsDialog}
            />

            <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-5rem)] items-center gap-2 sm:left-5 sm:top-5 sm:gap-3">
              <Popover open={filterOpen} onOpenChange={open => { if (!isMapBusy) setFilterOpen(open); }}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isMapBusy}
                    className={`${overlayClassName} h-10 shrink-0 gap-1.5 rounded-xl px-2.5 text-xs hover:bg-slate-950/60 sm:h-11 sm:gap-2 sm:px-4 sm:text-sm ${country_id ? "text-white hover:text-white" : "text-yellow-300 hover:text-yellow-200"}`}
                  >
                    {country_id && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />}
                    {country_id ? "Filter" : "Select a country"}
                    <ChevronDown size={14} aria-hidden="true" className={`hidden transition-transform sm:block ${filterOpen ? "rotate-180" : ""}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  container={mapViewElement}
                  inert={isMapBusy}
                  align="start"
                  side="bottom"
                  sideOffset={10}
                  collisionPadding={12}
                  collisionBoundary={mapViewElement}
                  style={{ maxHeight: "min(420px, var(--radix-popover-content-available-height))" }}
                  className={`${overlayClassName} w-[min(320px,calc(100vw-2rem))] max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl p-4`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold">Map filters</h2>
                    <button type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)} className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="map-country" className="text-xs text-slate-200">Country</Label>
                      <Select disabled={isMapBusy} value={country_id} onValueChange={value => {
                        setCountry(value); setRegion(""); setProvince(""); setSelectedCampId("");
                      }}>
                        <SelectTrigger id="map-country" className="border-white/20 bg-slate-950/30 text-white">
                          <SelectValue placeholder={isCountriesLoading ? "Loading countries..." : "Select country"} />
                        </SelectTrigger>
                        <SelectContent container={mapViewElement} inert={isMapBusy} className="border-slate-700 bg-slate-950 text-slate-100">
                          {countries.map((country: any) => <SelectItem key={country._id} value={country._id}>{country.country_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="map-region" className="text-xs text-slate-200">Region</Label>
                      <Select disabled={isMapBusy || !country_id} value={region_id} onValueChange={value => {
                        setRegion(value); setProvince(""); setSelectedCampId("");
                      }}>
                        <SelectTrigger id="map-region" className="border-white/20 bg-slate-950/30 text-white">
                          <SelectValue placeholder={isRegionsLoading ? "Loading regions..." : "Select region"} />
                        </SelectTrigger>
                        <SelectContent container={mapViewElement} inert={isMapBusy} className="border-slate-700 bg-slate-950 text-slate-100">
                          {regions?.region?.map((region: any) => <SelectItem key={region._id} value={region._id}>{region.region_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="map-province" className="text-xs text-slate-200">Province</Label>
                      <Select disabled={isMapBusy || !region_id} value={province_id} onValueChange={value => {
                        setProvince(value); setSelectedCampId("");
                      }}>
                        <SelectTrigger id="map-province" className="border-white/20 bg-slate-950/30 text-white">
                          <SelectValue placeholder={isProvincesLoading ? "Loading provinces..." : "Select province"} />
                        </SelectTrigger>
                        <SelectContent container={mapViewElement} inert={isMapBusy} className="border-slate-700 bg-slate-950 text-slate-100">
                          {provinces?.provinces?.map((province: any) => <SelectItem key={province._id} value={province._id}>{province.province_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" disabled={isMapBusy || !hasMapFilter} className="w-full gap-2 rounded-lg border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white" onClick={() => {
                      setCountry(""); setRegion(""); setProvince(""); setSelectedCampId(""); setListBounds(null);
                    }}>
                      <RotateCcw size={14} /> Reset filters
                    </Button>
                    {!!overview.data?.unmappedTotal && <p className="text-xs leading-relaxed text-amber-200">{overview.data.unmappedTotal} facilities in these filters need valid coordinates to appear on the map.</p>}
                  </div>
                </PopoverContent>
              </Popover>

              {!!country_id && <Button type="button" disabled={isMapBusy} variant="outline" className={`${overlayClassName} h-10 gap-1.5 rounded-xl px-2.5 text-xs hover:bg-slate-950/60 hover:text-white sm:h-11 sm:gap-2 sm:px-4 sm:text-sm`} onClick={() => {
                setFilterOpen(false); setLocationListSearch(""); setListBounds(null); setLocationListDialogOpen(true);
              }}>
                <MapPinned size={16} aria-hidden="true" /> Find Location
              </Button>}
            </div>

            <Button
              ref={fullscreenButtonRef}
              disabled={isMapBusy}
              type="button"
              variant="outline"
              size="icon"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
              className={`${overlayClassName} absolute right-3 top-3 z-20 h-10 w-10 rounded-xl hover:bg-slate-950/60 hover:text-white sm:right-5 sm:top-5 sm:h-11 sm:w-11`}
            >
              {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
            </Button>

            {(isMapError || overview.isError) && <div role="alert" className={`${overlayClassName} absolute left-3 right-3 top-20 z-20 flex max-w-lg items-center justify-between gap-3 rounded-xl p-3 text-sm text-red-100 sm:left-5`}>
              Unable to load facilities.
              <Button size="sm" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => { overview.refetch(); refetchMap(); }}>Retry</Button>
            </div>}

            <Collapsible defaultOpen className={`${overlayClassName} absolute bottom-9 right-3 z-10 w-[210px] rounded-2xl p-2 sm:right-5 sm:w-[230px]`}>
              <CollapsibleTrigger disabled={isMapBusy} className="group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-xs font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                <span>Facility statuses</span>
                <span className="flex items-center gap-2 text-slate-200">
                  <span className="tabular-nums">{overview.isFetching ? "…" : summary.total}</span>
                  <ChevronDown size={15} className="transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-1.5">
                  {STATUS_META.map(status => <div key={status.key} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs font-medium ${status.chipClassName}`}>
                    <span>{status.label}</span>
                    <span className="tabular-nums font-semibold">{overview.isFetching ? "…" : summary[status.countKey]}</span>
                  </div>)}
                </div>
                {!!country_id && <p aria-live="polite" className="px-2 pb-1 pt-2 text-[11px] text-slate-200">
                  {isMapFetching ? "Updating map area…" : `${mapData?.visibleTotal ?? 0} facilities in view`}
                </p>}
              </CollapsibleContent>
            </Collapsible>
          </div>
          {isMapBusy && (
            <div className="absolute inset-0 z-[60] flex cursor-wait items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
              <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/70 px-6 py-4 text-sm font-medium text-slate-100 shadow-2xl backdrop-blur-xl">
                <LoaderCircle size={22} aria-hidden="true" className="shrink-0 animate-spin text-cyan-300 motion-reduce:animate-none" />
                Loading, please wait…
              </div>
            </div>
          )}
        </section>

        {!isStaff && <fieldset disabled={isMapBusy} inert={isMapBusy} className="min-w-0">
          <section className="rounded-[28px] border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Custom Pins</h2>
                <p className="text-xs text-slate-400">Add a location and show it on the map when needed.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={customPinSearch}
                  onChange={(event) => setCustomPinSearch(event.target.value)}
                  placeholder="Search custom pins..."
                  className="w-full border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 sm:w-72"
                />
                <Button type="button" className="rounded-full bg-purple-600 text-white hover:bg-purple-700" onClick={openAddCustomPinDialog}>
                  <Plus size={14} className="mr-2" /> Add Direction
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {isCustomPinsLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
                  Loading custom pins...
                </div>
              ) : customPins.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
                  No custom pins added.
                </div>
              ) : filteredCustomPins.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
                  No custom pins match your search.
                </div>
              ) : (
                filteredCustomPins.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-purple-600" />
                        <p className="truncate text-sm font-semibold text-slate-100">{pin.title}</p>
                      </div>
                      {pin.description ? <p className="mt-1 text-sm text-slate-400">{pin.description}</p> : null}
                      <p className="mt-2 text-xs text-slate-500">
                        {pin.latitude}, {pin.longitude}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="rounded-full border-purple-500/70 bg-slate-900/70 text-purple-300 hover:bg-purple-950/60 hover:text-purple-100"
                        aria-label={`Show ${pin.title} on map`}
                        title="Show on map"
                        onClick={() => {
                          setSelectedCampId("");
                          setSelectedCustomPinId(pin.id);
                          setCustomPinFocusKey((currentKey) => currentKey + 1);
                        }}
                      >
                        <LocateFixed size={16} />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="rounded-full border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                            aria-label={`Open actions for ${pin.title}`}
                            title="Actions"
                          >
                            <Ellipsis size={16} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-40 border-slate-800 bg-slate-950 p-2 text-slate-100">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-900"
                            onClick={() => openEditCustomPinDialog(pin)}
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-300 hover:bg-red-950/40"
                            onClick={() => setDeletingCustomPin(pin)}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </PopoverContent>
                      </Popover>
                      <Button type="button" className="rounded-full bg-purple-600 text-white hover:bg-purple-700" onClick={() => openDirectionsDialog(pin)}>
                        <Navigation size={14} className="mr-2" /> Direction
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </fieldset>}
      </div>

      {!isStaff && <Dialog
        open={customPinDialogOpen}
        onOpenChange={(open) => {
          setCustomPinDialogOpen(open);
          if (!open) {
            resetCustomPinForm();
            setEditingCustomPinId("");
          }
        }}
      >
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingCustomPinId ? "Edit Direction" : "Add Direction"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingCustomPinId ? "Update this custom purple pin." : "Add a custom purple pin using a Google Maps link or coordinates."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveCustomPin}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant={locationMode === "link" ? "default" : "outline"}
                className={locationMode === "link" ? "bg-purple-600 text-white hover:bg-purple-700" : "border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800"}
                onClick={() => {
                  setLocationMode("link");
                  setCustomPinError("");
                }}
              >
                Google Map Link
              </Button>
              <Button
                type="button"
                variant={locationMode === "coordinates" ? "default" : "outline"}
                className={
                  locationMode === "coordinates" ? "bg-purple-600 text-white hover:bg-purple-700" : "border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
                }
                onClick={() => {
                  setLocationMode("coordinates");
                  setCustomPinError("");
                }}
              >
                Latitude / Longitude
              </Button>
            </div>

            {locationMode === "link" ? (
              <div>
                <Label htmlFor="googleMapLink" className="text-slate-300">
                  Google Map Link
                </Label>
                <Input
                  id="googleMapLink"
                  value={customPinForm.googleMapLink}
                  onChange={(event) => updateCustomPinForm("googleMapLink", event.target.value)}
                  placeholder="https://www.google.com/maps/..."
                  className="mt-2 border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="customPinLatitude" className="text-slate-300">
                    Latitude
                  </Label>
                  <Input
                    id="customPinLatitude"
                    value={customPinForm.latitude}
                    onChange={(event) => updateCustomPinForm("latitude", event.target.value)}
                    placeholder="25.2048 or 25.2048 N"
                    className="mt-2 border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <Label htmlFor="customPinLongitude" className="text-slate-300">
                    Longitude
                  </Label>
                  <Input
                    id="customPinLongitude"
                    value={customPinForm.longitude}
                    onChange={(event) => updateCustomPinForm("longitude", event.target.value)}
                    placeholder="55.2708 or 55.2708 E"
                    className="mt-2 border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="customPinTitle" className="text-slate-300">
                Title
              </Label>
              <Input
                id="customPinTitle"
                value={customPinForm.title}
                onChange={(event) => updateCustomPinForm("title", event.target.value)}
                placeholder="Pin title"
                className="mt-2 border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div>
              <Label htmlFor="customPinDescription" className="text-slate-300">
                Description
              </Label>
              <Textarea
                id="customPinDescription"
                value={customPinForm.description}
                onChange={(event) => updateCustomPinForm("description", event.target.value)}
                placeholder="Pin description"
                className="mt-2 border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            {customPinError ? <p className="text-sm text-red-300">{customPinError}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800" onClick={() => setCustomPinDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700" disabled={isSavingCustomPin}>
                {isSavingCustomPin ? "Saving..." : editingCustomPinId ? "Update Pin" : "Add Pin"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>}

      <Dialog open={!!directionsTarget} onOpenChange={(open) => !open && setDirectionsTarget(null)}>
        <DialogContent container={mapPortalContainer} className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open Directions</DialogTitle>
            <DialogDescription className="text-slate-400">Choose how you want to open the route.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Button type="button" className="bg-purple-600 text-white hover:bg-purple-700" onClick={() => handleOpenDirections("google-app")}>
              Google Maps App
            </Button>
            {showAppleMapsOption ? (
              <Button type="button" variant="outline" className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800" onClick={() => handleOpenDirections("apple")}>
                Apple Maps
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800" onClick={() => handleOpenDirections("google-web")}>
              Google Maps Web
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!isStaff && <AlertDialog open={!!deletingCustomPin} onOpenChange={(open) => !open && setDeletingCustomPin(null)}>
        <AlertDialogContent className="border-slate-800 bg-slate-950 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Pin</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will delete {deletingCustomPin?.title ? `"${deletingCustomPin.title}"` : "this custom pin"} from your saved custom pins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" disabled={isDeletingCustomPin} onClick={handleDeleteCustomPin}>
              {isDeletingCustomPin ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}

      <Dialog open={locationListDialogOpen} onOpenChange={setLocationListDialogOpen}>
        <DialogContent container={mapPortalContainer} className="max-h-[88dvh] max-w-[94vw] overflow-y-auto overflow-x-hidden border-slate-800 bg-slate-950 text-slate-100 sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Location List</DialogTitle>
            <DialogDescription className="text-slate-400">Search all facilities in the selected filters. Cluster selections narrow the list to that area.</DialogDescription>
          </DialogHeader>

          <Input
            value={locationListSearch}
            onChange={(event) => setLocationListSearch(event.target.value)}
            placeholder="Search locations..."
            className="border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
          />

          {listBounds && <Button variant="outline" onClick={() => setListBounds(null)}>Search all filtered locations</Button>}
          {locations.isError && <p role="alert" className="text-red-300">Unable to load locations. <Button variant="outline" onClick={() => locations.refetch()}>Retry</Button></p>}
          <ListPagination label="locations" pagination={locations.data?.pagination} busy={locations.isFetching} onPage={page => { setLocationPageScope(listScope); setLocationPage(page); }} />
          <div className="space-y-3">
            {locations.isFetching ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
                Loading locations...
              </div>
            ) : locations.isError ? null : filteredLocationList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
                No locations match the selected filters.
              </div>
            ) : (
              filteredLocationList.map((camp) => (
                <div
                  key={camp._id}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${STATUS_META.find((status) => status.key === camp.visited_status)?.color || "bg-red-700"}`} />
                      <p className="min-w-0 whitespace-normal break-words text-sm font-semibold leading-5 text-slate-100">{camp.camp_name}</p>
                    </div>
                    <p className="mt-1 whitespace-normal break-words text-sm text-slate-400">
                      {camp.country}
                      {camp.region ? ` / ${camp.region}` : ""}
                      {camp.province ? ` / ${camp.province}` : ""}
                    </p>
                    <p className="mt-2 whitespace-normal break-words text-xs text-slate-500">
                      {camp.latitude}, {camp.longitude}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="rounded-full border-cyan-500/70 bg-slate-900/70 text-cyan-300 hover:bg-cyan-950/60 hover:text-cyan-100"
                      aria-label={`Show ${camp.camp_name} on map`}
                      title="Show on map"
                      onClick={() => {
                        setSelectedCustomPinId("");
                        setSelectedCampId(camp._id);
                        setSelectedCamp(camp);
                        setCampFocusKey((currentKey) => currentKey + 1);
                        setLocationListDialogOpen(false);
                      }}
                    >
                      <LocateFixed size={16} />
                    </Button>
                    <Button type="button" className="rounded-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => openDirectionsDialog(camp)}>
                      <Navigation size={14} className="mr-2" /> Direction
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

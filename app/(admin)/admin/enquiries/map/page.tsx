"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
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
import { EarthIcon, Ellipsis, LocateFixed, MapPinned, Navigation, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

const STATUS_META = [
  { key: "Just Added", label: "Just Added", color: "bg-red-700", countKey: "justAdded" },
  { key: "To Visit", label: "To Visit", color: "bg-orange-500", countKey: "toVisit" },
  { key: "Visited", label: "Visited", color: "bg-yellow-400", countKey: "visited" },
  { key: "Awarded", label: "Awarded", color: "bg-green-600", countKey: "awarded" },
  { key: "On Hold / Cancelled", label: "On Hold / Cancelled", color: "bg-black", countKey: "cancelled" },
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

const openGoogleDirections = (pin: Pick<CustomMapPin, "latitude" | "longitude">) => {
  const destination = `${pin.latitude},${pin.longitude}`;

  const openDirections = (origin?: string) => {
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", destination);
    url.searchParams.set("travelmode", "driving");
    if (origin) {
      url.searchParams.set("origin", origin);
    }
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  if (!navigator.geolocation) {
    openDirections();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      openDirections(`${position.coords.latitude},${position.coords.longitude}`);
    },
    () => {
      openDirections();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
    }
  );
};

export default function EnquiriesMapPage() {
  const router = useRouter();
  const [countries, setCountries] = useState<any[]>([]);
  const [country_id, setCountry] = useState("");
  const [region_id, setRegion] = useState("");
  const [province_id, setProvince] = useState("");
  const [selectedCustomPinId, setSelectedCustomPinId] = useState("");
  const [customPinFocusKey, setCustomPinFocusKey] = useState(0);
  const [selectedCampId, setSelectedCampId] = useState("");
  const [campFocusKey, setCampFocusKey] = useState(0);
  const [locationListDialogOpen, setLocationListDialogOpen] = useState(false);
  const [locationListSearch, setLocationListSearch] = useState("");
  const [customPinSearch, setCustomPinSearch] = useState("");
  const [customPinDialogOpen, setCustomPinDialogOpen] = useState(false);
  const [editingCustomPinId, setEditingCustomPinId] = useState("");
  const [deletingCustomPin, setDeletingCustomPin] = useState<CustomMapPin | null>(null);
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
  const { data: customPinsData, isLoading: isCustomPinsLoading, refetch: refetchCustomPins } = useGetEqCustomMapPins();
  const { mutateAsync: AddCustomMapPin, isPending: isAddingCustomPin } = useAddEqCustomMapPin();
  const { mutateAsync: UpdateCustomMapPin, isPending: isUpdatingCustomPin } = useUpdateEqCustomMapPin();
  const { mutateAsync: DeleteCustomMapPin, isPending: isDeletingCustomPin } = useDeleteEqCustomMapPin();

  const mapQuery = useMemo(
    () => ({
      country_id,
      region_id,
      province_id,
    }),
    [country_id, region_id, province_id]
  );

  const { data: mapData, isLoading: isMapLoading, isFetching: isMapFetching } = useGetEqCampsForMap(mapQuery, !!country_id);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const camps: CampMapItem[] = useMemo(() => mapData?.camps || [], [mapData?.camps]);
  const customPins: CustomMapPin[] = useMemo(() => customPinsData?.pins || [], [customPinsData?.pins]);
  const summary = mapData?.summary || {
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
  const filteredLocationList = useMemo(() => {
    const searchValue = locationListSearch.trim().toLowerCase();
    if (!searchValue) return camps;

    return camps.filter((camp) =>
      [camp.camp_name, camp.country, camp.region, camp.province, camp.city, camp.area, `${camp.latitude}`, `${camp.longitude}`]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue)
    );
  }, [camps, locationListSearch]);

  return (
    <div className="p-4 pb-10">
      <Breadcrumb>
        <BreadcrumbList className="flex items-center gap-1 text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace("/admin/enquiries")} className="pl-2">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Camp Map</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-4 space-y-4">
        <section className="overflow-hidden rounded-[28px] border border-slate-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.16),_transparent_25%),linear-gradient(135deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.96))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/80">Enquiries Geography</p>
              <h1 className="text-2xl font-semibold text-slate-50">Camp map by country, region, and province</h1>
              <p className="text-sm text-slate-300/80">
                Approved camps with saved coordinates are plotted here. Marker colors follow each camp&apos;s
                <span className="font-semibold text-slate-100"> map status</span>, including newly added camps without a saved visit state.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-full border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-900"
              onClick={() => {
                setCountry("");
                setRegion("");
                setProvince("");
                setSelectedCampId("");
              }}
            >
              <RotateCcw size={14} className="mr-2" /> Reset Filters
            </Button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Map Filters</h2>
                  <p className="text-xs text-slate-400">Filter the visible camp pins.</p>
                </div>
                <MapPinned size={16} className="text-cyan-300" />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-400">Country</p>
                  <Select
                    value={country_id}
                    onValueChange={(value) => {
                      setCountry(value);
                      setRegion("");
                      setProvince("");
                      setSelectedCampId("");
                    }}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-900/70 text-slate-100">
                      <SelectValue placeholder={isCountriesLoading ? "Loading countries..." : "Select country"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country: any) => (
                        <SelectItem key={country._id} value={country._id}>
                          {country.country_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-400">Region</p>
                  <Select
                    disabled={!country_id}
                    value={region_id}
                    onValueChange={(value) => {
                      setRegion(value);
                      setProvince("");
                      setSelectedCampId("");
                    }}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-900/70 text-slate-100">
                      <SelectValue placeholder={isRegionsLoading ? "Loading regions..." : "Select region"} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.region?.map((region: any) => (
                        <SelectItem key={region._id} value={region._id}>
                          {region.region_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-400">Province</p>
                  <Select
                    disabled={!region_id}
                    value={province_id}
                    onValueChange={(value) => {
                      setProvince(value);
                      setSelectedCampId("");
                    }}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-900/70 text-slate-100">
                      <SelectValue placeholder={isProvincesLoading ? "Loading provinces..." : "Select province"} />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces?.provinces?.map((province: any) => (
                        <SelectItem key={province._id} value={province._id}>
                          {province.province_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasMapFilter ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
                    onClick={() => {
                      setLocationListSearch("");
                      setLocationListDialogOpen(true);
                    }}
                  >
                    <MapPinned size={14} className="mr-2" /> Location List
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Legend</h2>
                  <p className="text-xs text-slate-400">Marker colors on the map.</p>
                </div>
                <EarthIcon size={16} className="text-cyan-300" />
              </div>

              <div className="space-y-3">
                {STATUS_META.map((status) => (
                  <div key={status.key} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${status.color}`} />
                      <span className="text-sm text-slate-200">{status.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-100">{summary[status.countKey]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <CampMap
              camps={camps}
              customPins={selectedCustomPin ? [selectedCustomPin] : []}
              customPinsFocusKey={customPinFocusKey}
              focusedCampId={selectedCampId}
              focusedCampKey={campFocusKey}
              isLoading={isMapLoading || isMapFetching}
              hasCountrySelection={!!country_id}
            />
          </div>
        </section>

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
                    <Button type="button" className="rounded-full bg-purple-600 text-white hover:bg-purple-700" onClick={() => openGoogleDirections(pin)}>
                      <Navigation size={14} className="mr-2" /> Direction
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog
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
      </Dialog>

      <AlertDialog open={!!deletingCustomPin} onOpenChange={(open) => !open && setDeletingCustomPin(null)}>
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
      </AlertDialog>

      <Dialog open={locationListDialogOpen} onOpenChange={setLocationListDialogOpen}>
        <DialogContent className="max-h-[88dvh] max-w-[94vw] overflow-y-auto overflow-x-hidden border-slate-800 bg-slate-950 text-slate-100 sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Location List</DialogTitle>
            <DialogDescription className="text-slate-400">Filtered locations from the current map selection.</DialogDescription>
          </DialogHeader>

          <Input
            value={locationListSearch}
            onChange={(event) => setLocationListSearch(event.target.value)}
            placeholder="Search locations..."
            className="border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
          />

          <div className="space-y-3">
            {isMapLoading || isMapFetching ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
                Loading locations...
              </div>
            ) : filteredLocationList.length === 0 ? (
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
                        setCampFocusKey((currentKey) => currentKey + 1);
                        setLocationListDialogOpen(false);
                      }}
                    >
                      <LocateFixed size={16} />
                    </Button>
                    <Button type="button" className="rounded-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => openGoogleDirections(camp)}>
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

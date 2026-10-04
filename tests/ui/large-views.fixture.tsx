import React, { useCallback, useState } from "react";
import CampMap from "@/components/enquiries/CampMap";
import { useCursorPaging } from "@/hooks/use-cursor-paging";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetCalendarFeed } from "@/query/calendar/queries";
import { useGetEqCampsForMap } from "@/query/enquirymanager/queries";
import type { MapViewport } from "@/lib/maps/types";

const checks = (window as any).largeChecks = { maps: [] as any[], markers: [] as any[], fits: 0, markerCreations: 0, viewports: 0, clusterSelections: 0 };
class FakeMap {
  listeners: Record<string, Function> = {};
  zoom = 8;
  bounds = { south: 23, west: 53, north: 26, east: 56 };
  constructor(public element: HTMLElement) { checks.maps.push(this); }
  addListener(name: string, fn: Function) { this.listeners[name] = fn; return { remove: () => delete this.listeners[name] }; }
  getBounds() { return { getNorthEast: () => ({ lat: () => this.bounds.north, lng: () => this.bounds.east }), getSouthWest: () => ({ lat: () => this.bounds.south, lng: () => this.bounds.west }) }; }
  getZoom() { return this.zoom; }
  setZoom(value: number) { this.zoom = value; this.idle(); }
  setCenter() { this.idle(); }
  fitBounds(value: any) { checks.fits++; this.bounds = value; this.idle(); }
  idle() { queueMicrotask(() => this.listeners.idle?.()); }
  pan() { this.bounds = { south: 24, west: 54, north: 25, east: 55 }; this.idle(); }
}
class FakeMarker {
  listeners: Record<string, Function> = {};
  map: any;
  constructor(public options: any) { this.map = options.map; checks.markers.push(this); checks.markerCreations++; }
  addListener(name: string, fn: Function) { this.listeners[name] = fn; }
  setMap(map: any) { this.map = map; }
}
(window as any).google = { maps: { Map: FakeMap, Marker: FakeMarker, InfoWindow: class { setContent() {} open() {} close() {} }, Size: class {}, Point: class {}, SymbolPath: { CIRCLE: 1 }, event: {
  clearInstanceListeners: (target: any) => { target.listeners = {}; }, addListenerOnce: (_target: any, _name: string, fn: () => void) => queueMicrotask(fn),
} } };
const camp = { _id: "visible-camp", camp_name: "Visible facility", camp_type: "", camp_capacity: "", camp_occupancy: null, visited_status: "Visited", latitude: 24.2, longitude: 54.2, country: "", region: "", province: "", city: "", area: "" };
const bounds = { south: 23, west: 53, north: 26, east: 56 };
const cluster = { id: "dense", count: 10000, latitude: 24.5, longitude: 54.5, bounds: { south: 24.5, west: 54.5, north: 24.5, east: 54.5 } };
export default function LargeViewsFixture() {
  const [search, setSearch] = useState("");
  const paging = useCursorPaging(search);
  const calendar = useGetCalendarFeed({ search, cursor: paging.cursor });
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const debounced = useDebouncedValue(viewport, 250);
  const map = useGetEqCampsForMap({ mode: "viewport", ...(debounced || {}) }, !!debounced);
  const [refresh, setRefresh] = useState(0);
  const directions = useCallback(() => {}, []);
  const changed = useCallback((value: MapViewport) => { checks.viewports++; setViewport(value); }, []);
  const clusterSelected = useCallback(() => { checks.clusterSelections++; }, []);
  return <section id="large-views">
    <h1>Large view behavior</h1>
    <p id="calendar-page">Page {paging.page}: {calendar.data?.items?.[0]?.title || "loading"}</p>
    <p id="calendar-total">{calendar.data?.summary?.total || 0}</p>
    <button id="calendar-next" disabled={calendar.isFetching || !calendar.data?.pagination?.nextCursor} onClick={() => paging.next(calendar.data.pagination.nextCursor)}>Next calendar page</button>
    <button id="calendar-previous" disabled={calendar.isFetching || paging.page === 1} onClick={paging.previous}>Previous calendar page</button>
    <button id="calendar-filter" onClick={() => setSearch("filtered")}>Filter calendar</button>
    <button id="map-pan" onClick={() => checks.maps[0].pan()}>Move map</button>
    <button id="map-refresh" onClick={() => setRefresh(value => value + 1)}>Refresh facilities</button>
    <button id="map-cluster" onClick={() => checks.markers.find((marker: any) => marker.map && marker.options.label)?.listeners.click()}>Browse cluster</button>
    <p id="map-ready">{map.data ? "loaded" : "loading"} {refresh}</p>
    <CampMap camps={[{ ...camp }]} clusters={[cluster]} filterKey="filter-one" fitBounds={bounds} onViewportChanged={changed} onDirectionsRequested={directions} onClusterSelected={clusterSelected} hasCountrySelection />
  </section>;
}

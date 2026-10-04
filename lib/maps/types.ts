export type MapBounds = { south: number; west: number; north: number; east: number };
export type MapViewport = MapBounds & { zoom: number };
export type CampCluster = { id: string; count: number; latitude: number; longitude: number; bounds: MapBounds };

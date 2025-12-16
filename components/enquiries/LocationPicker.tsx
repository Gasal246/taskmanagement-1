"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LocationPicker({ onChange }: any) {
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        onChange({ lat: latitude, lng: longitude });
      },
      () => alert("Unable to retrieve your location")
    );
  };

  return (
    <div className="space-y-2">
      <Button type="button" className="bg-cyan-700" onClick={getLocation}>
        Get Current Location
      </Button>

      {coords.lat && coords.lng && (
        <div className="text-sm text-slate-300">
          <p>Latitude: {coords.lat}</p>
          <p>Longitude: {coords.lng}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";

type LocationPickerProps = {
  onChange: (coords: { lat: number; lng: number }) => void;
  value?: { lat: number | null; lng: number | null };
};

export default function LocationPicker({ onChange, value }: LocationPickerProps) {
  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
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

      {value?.lat !== null && value?.lng !== null && (
        <div className="text-sm text-slate-300">
          <p>Latitude: {value.lat}</p>
          <p>Longitude: {value.lng}</p>
        </div>
      )}
    </div>
  );
}

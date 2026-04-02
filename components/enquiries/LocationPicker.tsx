"use client";

import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

type LocationPickerProps = {
  onChange: (coords: { lat: number; lng: number }) => void;
  value?: { lat: number | null; lng: number | null };
  className?: string;
  buttonClassName?: string;
  showValues?: boolean;
};

export default function LocationPicker({
  onChange,
  value,
  className = "",
  buttonClassName = "",
  showValues = true,
}: LocationPickerProps) {
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
    <div className={`space-y-2 ${className}`.trim()}>
      <Button
        type="button"
        className={`inline-flex items-center gap-2 rounded-lg border border-cyan-800/70 bg-cyan-950/20 px-3 py-2 text-xs font-medium text-cyan-200 hover:border-cyan-600/70 hover:bg-cyan-950/30 ${buttonClassName}`.trim()}
        onClick={getLocation}
      >
        <MapPin className="h-4 w-4" />
        Get Current Location
      </Button>

      {showValues && value && value.lat !== null && value.lng !== null && (
        <div className="text-sm text-slate-300">
          <p>Latitude: {value.lat}</p>
          <p>Longitude: {value.lng}</p>
        </div>
      )}
    </div>
  );
}

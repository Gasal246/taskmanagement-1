"use client"
import { useState, useEffect } from "react";

export default function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-75"
      style={{ backdropFilter: "blur(5px)" }}
    >
      <div className="bg-slate-900 p-6 rounded-lg shadow-lg max-w-md mx-auto text-center">
        <h2 className="text-xl font-semibold text-red-600">Bad Network ⚠️</h2>
        <h3 className="mt-1 text-slate-300">You are currently offline. </h3>
        <p className="text-sm text-slate-400">
          You Should Have An Active Internet Connection To Continue Using TaskManager.
        </p>
      </div>
    </div>
  );
}

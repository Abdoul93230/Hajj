"use client";

import { useState, useEffect } from "react";
import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";

function calculateQibla(lat: number, lng: number): number {
  const makkahLat = 21.4225;
  const makkahLng = 39.8262;
  const dLng = ((makkahLng - lng) * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (makkahLat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function getDistance(lat: number, lng: number): number {
  const R = 6371;
  const makkahLat = (21.4225 * Math.PI) / 180;
  const makkahLng = (39.8262 * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const dLat = makkahLat - lat1;
  const dLng = makkahLng - lng1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(makkahLat) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function QiblaPage() {
  const t = useTranslations("qibla");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [qibla, setQibla] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  function locate() {
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setQibla(calculateQibla(latitude, longitude));
        setDistance(getDistance(latitude, longitude));
        setState("done");
      },
      () => {
        setErrorMsg(t("retry"));
        setState("error");
      }
    );
  }

  useEffect(() => {
    if ("geolocation" in navigator) locate();
  }, []);

  return (
    <div className="py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t("title")}</h1>
          <p className="text-gray-600">{t("subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {state === "idle" && (
            <div>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Compass size={40} className="text-[#0f5132]" />
              </div>
              <p className="text-gray-600 mb-6">{t("idleDesc")}</p>
              <button
                onClick={locate}
                className="bg-[#0f5132] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#0f5132] transition-colors"
              >
                {t("locateBtn")}
              </button>
            </div>
          )}

          {state === "loading" && (
            <div>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Compass size={40} className="text-[#0f5132]" />
              </div>
              <p className="text-gray-600">{t("loadingDesc")}</p>
            </div>
          )}

          {state === "done" && qibla !== null && (
            <div>
              <div className="relative w-48 h-48 mx-auto mb-8">
                <div className="w-full h-full rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center">
                  <div
                    className="absolute w-1 h-20 bg-[#0f5132] rounded-full origin-bottom transition-transform duration-1000"
                    style={{
                      transformOrigin: "bottom center",
                      bottom: "50%",
                      left: "calc(50% - 2px)",
                      transform: `rotate(${qibla}deg)`,
                    }}
                  />
                  <div className="w-4 h-4 rounded-full bg-[#0f5132] z-10" />
                </div>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-500">{t("compassN")}</div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-500">{t("compassS")}</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">{t("compassO")}</div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">{t("compassE")}</div>
              </div>

              <div className="space-y-2 mb-6">
                <p className="text-4xl font-bold text-[#0f5132]">{Math.round(qibla)}°</p>
                <p className="text-gray-600">{t("directionLabel")}</p>
                {distance && (
                  <p className="text-sm text-gray-500">
                    {t("distanceLabel")} <strong>{distance.toLocaleString()} {t("distanceUnit")}</strong>
                  </p>
                )}
              </div>

              <button
                onClick={locate}
                className="text-sm text-[#0f5132] font-medium hover:underline"
              >
                {t("recalculate")}
              </button>
            </div>
          )}

          {state === "error" && (
            <div>
              <p className="text-amber-600 mb-4">{errorMsg}</p>
              <button
                onClick={() => setState("idle")}
                className="bg-[#0f5132] text-white font-semibold px-6 py-2 rounded-lg hover:bg-[#0f5132] transition-colors"
              >
                {t("retry")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

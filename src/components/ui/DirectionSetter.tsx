"use client";

import { useLayoutEffect } from "react";
import { useLocale } from "next-intl";

export default function DirectionSetter() {
  const locale = useLocale();

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.dir = locale === "ar" ? "rtl" : "ltr";
    html.lang = locale;
  }, [locale]);

  return null;
}

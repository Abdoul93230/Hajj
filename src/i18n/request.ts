import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "fr" | "en" | "ar")) {
    locale = routing.defaultLocale;
  }

  // `index.json` = messages du portail (thème + textes par agence) ;
  // `platform.json` = LANDING de la plateforme (namespace « platform »), séparé
  // pour ne pas alourdir le fichier principal et reste éditable indépendamment.
  const [base, platform] = await Promise.all([
    import(`../messages/${locale}/index.json`),
    import(`../messages/${locale}/platform.json`),
  ]);

  return {
    locale,
    messages: {
      ...base.default,
      platform: platform.default,
    },
  };
});

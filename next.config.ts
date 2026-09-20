import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Toutes les images de marque (logo, hero, bannières, galerie) téléversées
        // via /api/superadmin/tenants/[id]/media sont servies depuis Cloudinary.
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default withNextIntl(nextConfig);

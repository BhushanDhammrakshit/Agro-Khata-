import type { MetadataRoute } from "next";

const BASE_URL = "https://www.vajabaki.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register"],
      // Everything else is an authenticated tenant/superadmin area, not meant for indexing.
      disallow: [
        "/dashboard",
        "/customers",
        "/suppliers",
        "/parties",
        "/items",
        "/expenses",
        "/drivers",
        "/vehicles",
        "/payments",
        "/purchase-invoices",
        "/sales-invoices",
        "/transactions",
        "/reports",
        "/profile",
        "/settings",
        "/superadmin",
        "/invoice-pdf",
        "/api",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

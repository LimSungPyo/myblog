import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 로그인해야 보이는 화면이라 검색 결과에 나올 이유가 없다
      disallow: ["/admin/", "/mypage"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}

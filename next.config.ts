import type { NextConfig } from "next";

function originOf(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseConnect = supabaseOrigin
  ? ` ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")}`
  : "";

const adsEnabled = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);
const adScript = adsEnabled
  ? " https://pagead2.googlesyndication.com https://partner.googleadservices.com https://www.googletagservices.com https://adservice.google.com https://fundingchoicesmessages.google.com https://www.google.com"
  : "";
const adConnect = adsEnabled
  ? " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google"
  : "";
const adFrame = adsEnabled
  ? " https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com"
  : "";
const adImage = adsEnabled
  ? " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com"
  : "";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${adScript}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https:${adImage}`,
      "font-src 'self'",
      `connect-src 'self'${supabaseConnect}${adConnect}`,
      `frame-src 'none'${adFrame}`.replace("frame-src 'none' https", "frame-src https"),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

import { createRequire } from "module";
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "cdn.worldvectorlogo.com",
            },
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
        ],
    },

    // ── Security Headers ──────────────────────────────────────
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    { key: "X-XSS-Protection", value: "1; mode=block" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
        ]
    },

    turbopack: {},

    webpack(config, { dev }) {
        if (dev) {
            config.module.rules.unshift({
                test: /\.(jsx|js)$/,
                exclude: /node_modules/,
                enforce: "pre",
                use: [
                    {
                        loader: require.resolve("./component-tagger-loader.js"),
                    },
                ],
            });
        }
        return config;
    },
};

export default nextConfig;

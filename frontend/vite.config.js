import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "prompt",
            injectRegister: "auto",
            manifest: {
                name: "FFXIV Marketboard Analyst",
                short_name: "MB Analyst",
                theme_color: "#c8a84b",
                background_color: "#08081f",
                display: "browser",
                start_url: "/",
                icons: [],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html}"],
                navigateFallback: "/index.html",
                navigateFallbackDenylist: [/^\/api\//],
            },
        }),
    ],
    base: "/",
    build: {
        outDir: "../static",
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        proxy: {
            "/api": "http://127.0.0.1:8000",
        },
    },
});

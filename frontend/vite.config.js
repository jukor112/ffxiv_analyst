import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [react()],
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

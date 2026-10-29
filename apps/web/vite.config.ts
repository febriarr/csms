import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            plugins: [
                {
                    name: "csms-banner",

                    generateBundle(_, bundle) {
                        for (const chunk of Object.values(bundle)) {
                            if (chunk.type !== "chunk") continue;

                            chunk.code = `/*!
 * CSMS
 * Copyright (c) 2026 Febri Ardiansyah
 * Licensed under the MIT License
 */

${chunk.code}`;
                        }
                    },
                },
            ],
        },
    },
});

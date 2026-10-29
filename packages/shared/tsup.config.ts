import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: {
        // tsup 8.x injects the deprecated `baseUrl` option when generating .d.ts,
        // which TypeScript 6 rejects (TS5101). Remove once tsup stops setting it.
        compilerOptions: { ignoreDeprecations: "6.0" },
    },
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: "es2022",
    platform: "neutral",
});

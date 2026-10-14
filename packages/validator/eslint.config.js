import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig(
    { ignores: ["dist"] },
    {
        files: ["src/**/*.ts"],
        extends: [js.configs.recommended, tsPlugin.configs["flat/recommended-type-checked"]],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        },
    }
);

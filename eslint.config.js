import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist/**", "public/**", "node_modules/**", "src/lib/json2go.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The app intentionally bridges untyped WASM packages at a few call
      // sites; the public surfaces are typed at their boundaries.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        matchMedia: "readonly",
      },
    },
  }
);

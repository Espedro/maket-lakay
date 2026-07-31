export const supportedLocales = [
  { code: "en", label: "English" },
  { code: "ht", label: "Kreyol" },
  { code: "fr", label: "Francais" },
] as const;

export type Locale = (typeof supportedLocales)[number]["code"];

export const defaultLocale: Locale = "en";

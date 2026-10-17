import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

/**
 * AG Grid, registered once for the whole app.
 *
 * v36 ships its features as modules and its look as a theme object rather than
 * a stylesheet, so both are set here and every grid imports from this file.
 */
ModuleRegistry.registerModules([AllCommunityModule]);

/** The grid, wearing the site's own colours and fonts. */
export const gridTheme = themeQuartz.withParams({
  accentColor: "var(--brand-riverTeal, #1a7fa6)",
  borderColor: "var(--brand-mutedBorder, #b8d9e8)",
  browserColorScheme: "light",
  fontFamily: "var(--app-font-sans, system-ui)",
  headerBackgroundColor: "var(--brand-muted, #dceef6)",
  headerTextColor: "var(--brand-secondary, #0d2d40)",
  foregroundColor: "var(--brand-text, #0d2d40)",
  backgroundColor: "var(--brand-bgCard, #ffffff)",
  wrapperBorderRadius: "0.75rem",
});

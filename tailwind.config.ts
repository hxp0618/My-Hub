import type { Config } from 'tailwindcss';

export default {
  /**
   * Force Tailwind's `dark:` variants to follow the `.dark` class
   * that ThemeProvider toggles instead of the user's OS preference.
   */
  darkMode: 'class',
} satisfies Config;

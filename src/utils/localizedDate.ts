import { isLanguageValue, StorageKey } from './storageManager';

function getSavedLanguage(): string | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const savedLanguage = localStorage.getItem(StorageKey.LANGUAGE);
    return isLanguageValue(savedLanguage) ? savedLanguage : null;
  } catch {
    return null;
  }
}

export function getPreferredLocale(): string {
  const savedLanguage = getSavedLanguage();
  if (savedLanguage) {
    return savedLanguage;
  }

  if (typeof navigator !== 'undefined') {
    return navigator.language || navigator.languages?.[0] || 'en';
  }

  return 'en';
}

export function formatLocalizedDate(
  timestamp: number,
  locale: string = getPreferredLocale()
): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

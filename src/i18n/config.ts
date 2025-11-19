/**
 * i18next Configuration
 *
 * Multi-language support for Casa & Concierge PMS
 * Languages: English (EN), Portuguese (PT), Spanish (ES)
 *
 * Storage: Browser localStorage
 * Default: English (EN)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation resources
import en from './resources/en.json';
import pt from './resources/pt.json';
import es from './resources/es.json';

// Configure i18next
i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources: {
      en,
      pt,
      es,
    },

    // Default language
    fallbackLng: 'en',

    // Supported languages
    supportedLngs: ['en', 'pt', 'es'],

    // Language detector options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator'],

      // Keys for localStorage
      lookupLocalStorage: 'casa-concierge-language',

      // Cache user language
      caches: ['localStorage'],
    },

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React options
    react: {
      useSuspense: false, // Don't use Suspense for SSR compatibility
    },

    // Namespace options - support multiple namespaces
    defaultNS: 'common',
    ns: ['common', 'todos', 'dashboard', 'properties', 'jobs', 'bookings', 'calendar', 'invoices', 'expenses', 'checkInOut', 'users', 'profile', 'notifications', 'validation', 'language', 'providers', 'checklistTemplates', 'issues', 'messageTemplates', 'bookingDialog', 'taskDialog', 'propertyForm', 'issueDialog', 'jobDialog', 'commissions', 'financialDashboard', 'commissionsAnalytics', 'myCommissions', 'employeeDocuments', 'serviceDocuments', 'documents', 'accessAuthorizations', 'vendorCOIs', 'dialogs', 'contracts', 'media', 'highlights'],

    // Debug mode (disable in production)
    debug: false,

    // Return empty string for missing keys (instead of key itself)
    returnEmptyString: false,

    // Return null for missing keys
    returnNull: false,
  });

export default i18n;

/**
 * Helper function to change language
 */
export const changeLanguage = (language: 'en' | 'pt' | 'es') => {
  i18n.changeLanguage(language);
};

/**
 * Helper function to get current language
 */
export const getCurrentLanguage = (): 'en' | 'pt' | 'es' => {
  return i18n.language as 'en' | 'pt' | 'es';
};

/**
 * Type-safe translation keys
 * Add this to get autocomplete for translation keys
 */
export type TranslationKeys = keyof typeof en;

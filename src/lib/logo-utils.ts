/**
 * Logo utility functions for Casa & Concierge branding
 *
 * Logo variants:
 * - logo-white.png: White/light colored logo (for dark backgrounds like sidebar)
 * - logo-black.png: Black/dark colored logo (for light backgrounds/PDFs)
 */

// Public paths for logo images
export const LOGO_PATHS = {
  /** White logo for dark backgrounds (sidebar, dark headers) */
  WHITE: '/logo-white.png',
  /** Black logo for light backgrounds and PDFs */
  BLACK: '/logo-black.png',
  // Legacy aliases
  DARK: '/logo-white.png',
  LIGHT: '/logo-black.png',
} as const;

// Company branding constants
export const BRANDING = {
  COMPANY_NAME: 'Casa & Concierge',
  SHORT_NAME: 'C&C',
  TAGLINE: 'Property Management Services',
  WEBSITE: 'https://casaandconcierge.com',
  EMAIL: 'info@casaandconcierge.com',
} as const;

// PDF color schemes
export const PDF_COLORS = {
  // Primary brand colors
  PRIMARY: [0, 0, 0] as [number, number, number], // Black
  ACCENT: [0, 0, 0] as [number, number, number], // Black
  SECONDARY: [30, 58, 138] as [number, number, number], // Navy blue

  // Neutral colors
  TEXT: [60, 60, 60] as [number, number, number],
  TEXT_LIGHT: [120, 120, 120] as [number, number, number],
  BACKGROUND_LIGHT: [245, 243, 255] as [number, number, number],
  WHITE: [255, 255, 255] as [number, number, number],
  BLACK: [0, 0, 0] as [number, number, number],

  // Status colors
  SUCCESS: [0, 128, 0] as [number, number, number],
  ERROR: [220, 53, 69] as [number, number, number],
  WARNING: [255, 193, 7] as [number, number, number],
  MUTED: [128, 128, 128] as [number, number, number],
} as const;

/**
 * Load logo image as base64 for PDF embedding
 * @param variant - 'white' (for dark backgrounds) or 'black' (for light backgrounds/PDFs)
 *                  Also accepts legacy 'dark'/'light' values
 * @returns Promise resolving to base64 data URL
 */
export async function loadLogoAsBase64(variant: 'white' | 'black' | 'dark' | 'light' = 'black'): Promise<string> {
  // Map variants to paths
  let path: string;
  if (variant === 'white' || variant === 'dark') {
    path = LOGO_PATHS.WHITE;
  } else {
    path = LOGO_PATHS.BLACK;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      // Use PNG format for both variants (transparency support)
      const dataUrl = canvas.toDataURL('image/png', 0.95);
      resolve(dataUrl);
    };

    img.onerror = () => {
      console.warn(`Failed to load logo from ${path}, using fallback`);
      // Return empty string to indicate logo not available
      resolve('');
    };

    img.src = path;
  });
}

/**
 * Pre-load both logo variants for faster PDF generation
 */
let cachedLogos: { white?: string; black?: string } = {};

export async function preloadLogos(): Promise<void> {
  try {
    const [white, black] = await Promise.all([
      loadLogoAsBase64('white'),
      loadLogoAsBase64('black'),
    ]);
    cachedLogos = { white, black };
    console.log('✅ Logos preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Failed to preload logos:', error);
  }
}

/**
 * Get cached logo base64 (call preloadLogos first for best performance)
 */
export function getCachedLogo(variant: 'white' | 'black' | 'dark' | 'light' = 'black'): string | undefined {
  // Map legacy variants
  const key = (variant === 'dark' || variant === 'white') ? 'white' : 'black';
  return cachedLogos[key];
}

/**
 * Get logo for PDF embedding (async with caching)
 * @param variant - 'black' for PDFs (dark logo on transparent), 'white' for dark backgrounds
 */
export async function getLogoForPDF(variant: 'white' | 'black' | 'dark' | 'light' = 'black'): Promise<string> {
  // Map legacy variants
  const key = (variant === 'dark' || variant === 'white') ? 'white' : 'black';

  // Check cache first
  const cached = cachedLogos[key];
  if (cached) return cached;

  // Load and cache
  const base64 = await loadLogoAsBase64(variant);
  cachedLogos[key] = base64;
  return base64;
}

export default {
  LOGO_PATHS,
  BRANDING,
  PDF_COLORS,
  loadLogoAsBase64,
  preloadLogos,
  getCachedLogo,
  getLogoForPDF,
};

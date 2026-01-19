/**
 * Address formatting utilities
 * Used to display unit names as part of street addresses
 */

export interface AddressFormatOptions {
  address?: string | null;
  unitName?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

/**
 * Format full address with optional unit name included
 * Example: "123 Banana Street, Apt-3, West Ave, NY"
 */
export function formatAddressWithUnit(options: AddressFormatOptions): string {
  const { address, unitName, city, state, postalCode, country } = options;

  const parts: string[] = [];

  if (address) parts.push(address);
  if (unitName) parts.push(unitName);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (postalCode) parts.push(postalCode);
  if (country) parts.push(country);

  return parts.join(', ') || 'No address';
}

/**
 * Format just street address + unit (no city/state)
 * Example: "123 Banana Street, Apt-3"
 */
export function formatStreetWithUnit(
  address?: string | null,
  unitName?: string | null
): string {
  if (!address && !unitName) return '';
  if (!unitName) return address || '';
  if (!address) return unitName;
  return `${address}, ${unitName}`;
}

/**
 * Format city and state
 * Example: "Miami, FL"
 */
export function formatCityState(
  city?: string | null,
  state?: string | null
): string {
  if (!city && !state) return '';
  if (!state) return city || '';
  if (!city) return state;
  return `${city}, ${state}`;
}

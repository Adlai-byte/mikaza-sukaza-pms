/**
 * Utility functions for displaying user information consistently across the application
 */

interface UserDisplay {
  first_name: string;
  last_name: string;
  user_type?: string;
}

/**
 * Format user display as "Full Name / User Type"
 * @param user - User object with first_name, last_name, and user_type
 * @returns Formatted string like "John Doe / Admin"
 */
export function formatUserDisplay(user: UserDisplay | null | undefined): string {
  if (!user) return 'Unknown User';

  const fullName = `${user.first_name} ${user.last_name}`.trim();

  if (!user.user_type) {
    return fullName;
  }

  // Capitalize and format user type
  const userType = user.user_type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return `${fullName} / ${userType}`;
}

/**
 * Format user type for display
 * @param userType - Raw user type string (e.g., "admin", "ops", "property_manager")
 * @returns Formatted user type (e.g., "Admin", "Ops", "Property Manager")
 */
export function formatUserType(userType: string | null | undefined): string {
  if (!userType) return 'User';

  return userType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

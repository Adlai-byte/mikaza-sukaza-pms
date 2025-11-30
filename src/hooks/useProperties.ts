import { usePropertiesOptimized } from './usePropertiesOptimized';

/**
 * Simple wrapper hook for properties list
 * Uses the optimized properties hook under the hood
 */
export const useProperties = () => {
  return usePropertiesOptimized();
};

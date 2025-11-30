/**
 * Supabase Realtime Cache Synchronization
 * Automatically invalidates React Query cache when database changes occur
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export class RealtimeCacheSync {
  private queryClient: QueryClient;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private isEnabled = true;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Initialize all realtime subscriptions
   */
  async initialize() {
    console.log('🔄 Initializing realtime cache sync...');

    try {
      // Subscribe to properties changes
      await this.subscribeToProperties();

      // Subscribe to bookings changes
      await this.subscribeToBookings();

      // Subscribe to financial entries changes
      await this.subscribeToFinancial();

      // Subscribe to users changes
      await this.subscribeToUsers();

      // Subscribe to property-related tables (images, amenities, etc.)
      await this.subscribeToPropertyRelatedTables();

      // Subscribe to expenses changes
      await this.subscribeToExpenses();

      // Subscribe to invoices changes
      await this.subscribeToInvoices();

      // Subscribe to highlights changes
      await this.subscribeToHighlights();

      // Subscribe to units changes
      await this.subscribeToUnits();

      console.log('✅ Realtime cache sync initialized');
    } catch (error) {
      console.error('❌ Failed to initialize realtime sync:', error);
    }
  }

  /**
   * Subscribe to properties table changes
   */
  private async subscribeToProperties() {
    const channel = supabase
      .channel('properties-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'properties',
        },
        (payload) => {
          console.log('🔄 Properties table changed:', payload.eventType);

          // Invalidate properties list
          this.queryClient.invalidateQueries({ queryKey: ['properties', 'list'] });

          // If specific property changed, invalidate its detail
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }

          // Also invalidate old property if it was updated or deleted
          if (payload.old && 'property_id' in payload.old) {
            const propertyId = (payload.old as any).property_id;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
        }
      )
      .subscribe();

    this.subscriptions.set('properties', channel);
  }

  /**
   * Subscribe to bookings table changes
   */
  private async subscribeToBookings() {
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_bookings',
        },
        (payload) => {
          console.log('🔄 Bookings table changed:', payload.eventType);

          // Invalidate bookings queries
          this.queryClient.invalidateQueries({ queryKey: ['bookings'] });
          this.queryClient.invalidateQueries({ queryKey: ['bookings-calendar'] });

          // If booking is for a specific property, invalidate property detail
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
        }
      )
      .subscribe();

    this.subscriptions.set('bookings', channel);
  }

  /**
   * Subscribe to financial entries changes
   */
  private async subscribeToFinancial() {
    const channel = supabase
      .channel('financial-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_financial_entries',
        },
        (payload) => {
          console.log('🔄 Financial entries changed:', payload.eventType);

          // Invalidate financial queries
          this.queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
          this.queryClient.invalidateQueries({ queryKey: ['financial-summary'] });

          // If financial entry is for a specific property, invalidate property detail
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
        }
      )
      .subscribe();

    this.subscriptions.set('financial', channel);
  }

  /**
   * Subscribe to users table changes
   */
  private async subscribeToUsers() {
    const channel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          console.log('🔄 Users table changed:', payload.eventType);

          // Invalidate users list
          this.queryClient.invalidateQueries({ queryKey: ['users', 'list'] });

          // If specific user changed, invalidate their detail
          if (payload.new && 'user_id' in payload.new) {
            const userId = (payload.new as any).user_id;
            this.queryClient.invalidateQueries({
              queryKey: ['users', 'detail', userId],
            });
          }

          // Properties list might have owner info
          this.queryClient.invalidateQueries({ queryKey: ['properties', 'list'] });
        }
      )
      .subscribe();

    this.subscriptions.set('users', channel);
  }

  /**
   * Subscribe to property-related tables (images, amenities, communication, etc.)
   */
  private async subscribeToPropertyRelatedTables() {
    // Property Images
    const imagesChannel = supabase
      .channel('property-images-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_images',
        },
        (payload) => {
          console.log('🔄 Property images changed:', payload.eventType);

          // Invalidate property detail and list
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
          if (payload.old && 'property_id' in payload.old) {
            const propertyId = (payload.old as Record<string, unknown>).property_id as string;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
          this.queryClient.invalidateQueries({ queryKey: ['properties', 'list'] });
        }
      )
      .subscribe();
    this.subscriptions.set('property_images', imagesChannel);

    // Property Amenities (junction table)
    const amenitiesChannel = supabase
      .channel('property-amenities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_amenities',
        },
        (payload) => {
          console.log('🔄 Property amenities changed:', payload.eventType);

          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
          if (payload.old && 'property_id' in payload.old) {
            const propertyId = (payload.old as Record<string, unknown>).property_id as string;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
          this.queryClient.invalidateQueries({ queryKey: ['amenities'] });
        }
      )
      .subscribe();
    this.subscriptions.set('property_amenities', amenitiesChannel);

    // Property Rules (junction table)
    const rulesChannel = supabase
      .channel('property-rules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_rules',
        },
        (payload) => {
          console.log('🔄 Property rules changed:', payload.eventType);

          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
          if (payload.old && 'property_id' in payload.old) {
            const propertyId = (payload.old as Record<string, unknown>).property_id as string;
            this.queryClient.invalidateQueries({
              queryKey: ['properties', 'detail', propertyId],
            });
          }
          this.queryClient.invalidateQueries({ queryKey: ['rules'] });
        }
      )
      .subscribe();
    this.subscriptions.set('property_rules', rulesChannel);

    // Amenities master table
    const amenitiesMasterChannel = supabase
      .channel('amenities-master-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'amenities',
        },
        (payload) => {
          console.log('🔄 Amenities master changed:', payload.eventType);
          this.queryClient.invalidateQueries({ queryKey: ['amenities'] });
          // Also invalidate all property details as amenity info may have changed
          this.queryClient.invalidateQueries({ queryKey: ['properties', 'detail'] });
        }
      )
      .subscribe();
    this.subscriptions.set('amenities', amenitiesMasterChannel);

    // Rules master table
    const rulesMasterChannel = supabase
      .channel('rules-master-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rules',
        },
        (payload) => {
          console.log('🔄 Rules master changed:', payload.eventType);
          this.queryClient.invalidateQueries({ queryKey: ['rules'] });
          // Also invalidate all property details as rule info may have changed
          this.queryClient.invalidateQueries({ queryKey: ['properties', 'detail'] });
        }
      )
      .subscribe();
    this.subscriptions.set('rules', rulesMasterChannel);
  }

  /**
   * Subscribe to expenses table changes
   */
  private async subscribeToExpenses() {
    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        (payload) => {
          console.log('🔄 Expenses table changed:', payload.eventType);

          // Invalidate all expense queries
          this.queryClient.invalidateQueries({ queryKey: ['expenses'] });

          // Invalidate property-specific expense queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['expenses', 'byProperty', propertyId],
              });
              this.queryClient.invalidateQueries({
                queryKey: ['properties', 'detail', propertyId],
              });
            }
          }
          if (payload.old && 'property_id' in payload.old) {
            const propertyId = (payload.old as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['expenses', 'byProperty', propertyId],
              });
            }
          }

          // Invalidate financial summary
          this.queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
        }
      )
      .subscribe();

    this.subscriptions.set('expenses', channel);
  }

  /**
   * Subscribe to invoices table changes
   */
  private async subscribeToInvoices() {
    const channel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          console.log('🔄 Invoices table changed:', payload.eventType);

          // Invalidate all invoice queries
          this.queryClient.invalidateQueries({ queryKey: ['invoices'] });

          // Invalidate property-specific invoice queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['invoices', 'byProperty', propertyId],
              });
              this.queryClient.invalidateQueries({
                queryKey: ['properties', 'detail', propertyId],
              });
            }
          }

          // Invalidate financial queries
          this.queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
          this.queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
        }
      )
      .subscribe();

    this.subscriptions.set('invoices', channel);
  }

  /**
   * Subscribe to property highlights table changes
   */
  private async subscribeToHighlights() {
    const channel = supabase
      .channel('highlights-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_highlights',
        },
        (payload) => {
          console.log('🔄 Property highlights changed:', payload.eventType);

          // Invalidate all highlight queries
          this.queryClient.invalidateQueries({ queryKey: ['property_highlights'] });
          this.queryClient.invalidateQueries({ queryKey: ['property_highlight'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['properties', 'detail', propertyId],
              });
            }
          }
          if (payload.old && 'property_id' in payload.old) {
            const propertyId = (payload.old as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['properties', 'detail', propertyId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('property_highlights', channel);
  }

  /**
   * Subscribe to units table changes
   */
  private async subscribeToUnits() {
    const channel = supabase
      .channel('units-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'units',
        },
        (payload) => {
          console.log('🔄 Units table changed:', payload.eventType);

          // Invalidate all unit queries
          this.queryClient.invalidateQueries({ queryKey: ['units'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['properties', 'detail', propertyId],
              });
            }
          }
          if (payload.old && 'property_id' in payload.old) {
            const propertyId = (payload.old as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['properties', 'detail', propertyId],
              });
            }
          }

          // Also invalidate properties list (unit count may have changed)
          this.queryClient.invalidateQueries({ queryKey: ['properties', 'list'] });
        }
      )
      .subscribe();

    this.subscriptions.set('units', channel);
  }

  /**
   * Subscribe to a custom table
   */
  async subscribeToTable(
    tableName: string,
    onChangeCallback: (payload: any) => void
  ) {
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        onChangeCallback
      )
      .subscribe();

    this.subscriptions.set(tableName, channel);
  }

  /**
   * Unsubscribe from a specific table
   */
  async unsubscribe(tableName: string) {
    const channel = this.subscriptions.get(tableName);
    if (channel) {
      await supabase.removeChannel(channel);
      this.subscriptions.delete(tableName);
      console.log(`🔇 Unsubscribed from ${tableName} changes`);
    }
  }

  /**
   * Unsubscribe from all tables
   */
  async unsubscribeAll() {
    console.log('🔇 Unsubscribing from all realtime channels...');

    for (const [tableName, channel] of this.subscriptions) {
      await supabase.removeChannel(channel);
      console.log(`🔇 Unsubscribed from ${tableName}`);
    }

    this.subscriptions.clear();
    console.log('✅ All realtime subscriptions cleaned up');
  }

  /**
   * Enable or disable realtime sync
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`🔄 Realtime sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get subscription status
   */
  getStatus() {
    const status: Record<string, string> = {};

    for (const [tableName, channel] of this.subscriptions) {
      status[tableName] = channel.state;
    }

    return {
      isEnabled: this.isEnabled,
      subscriptions: status,
      totalSubscriptions: this.subscriptions.size,
    };
  }

  /**
   * Manually trigger cache invalidation for a specific change type
   */
  async invalidateForChange(
    changeType: 'property' | 'booking' | 'user' | 'financial' | 'static' | 'expense' | 'invoice' | 'highlight' | 'unit'
  ) {
    const invalidationMap: Record<string, string[][]> = {
      property: [
        ['properties', 'list'],
        ['properties', 'detail'],
        ['bookings'],
        ['expenses'],
        ['invoices'],
        ['property_highlights'],
        ['units'],
      ],
      booking: [
        ['bookings'],
        ['bookings-calendar'],
        ['properties', 'detail'],
        ['financial-entries'],
        ['invoices'],
      ],
      user: [
        ['users', 'list'],
        ['users', 'detail'],
        ['properties', 'list'],
      ],
      financial: [
        ['financial-entries'],
        ['financial-summary'],
        ['properties', 'detail'],
        ['expenses'],
        ['invoices'],
      ],
      static: [
        ['amenities'],
        ['rules'],
        ['properties', 'detail'],
      ],
      expense: [
        ['expenses'],
        ['financial-summary'],
        ['properties', 'detail'],
      ],
      invoice: [
        ['invoices'],
        ['financial-entries'],
        ['financial-summary'],
        ['properties', 'detail'],
      ],
      highlight: [
        ['property_highlights'],
        ['property_highlight'],
        ['properties', 'detail'],
      ],
      unit: [
        ['units'],
        ['properties', 'detail'],
        ['properties', 'list'],
      ],
    };

    const keysToInvalidate = invalidationMap[changeType] || [];

    console.log(`🔄 Manually invalidating caches for ${changeType}...`);

    await Promise.all(
      keysToInvalidate.map((queryKey) =>
        this.queryClient.invalidateQueries({ queryKey })
      )
    );
  }

  /**
   * Cleanup on unmount
   */
  async cleanup() {
    await this.unsubscribeAll();
  }
}

// Singleton instance
let realtimeCacheSyncInstance: RealtimeCacheSync | null = null;

export const initializeRealtimeSync = (queryClient: QueryClient): RealtimeCacheSync => {
  realtimeCacheSyncInstance = new RealtimeCacheSync(queryClient);
  console.log('✅ Realtime cache sync instance created');
  return realtimeCacheSyncInstance;
};

export const getRealtimeSync = (): RealtimeCacheSync | null => {
  return realtimeCacheSyncInstance;
};

// Browser console helper
if (typeof window !== 'undefined') {
  (window as any).getRealtimeSyncStatus = () => {
    if (realtimeCacheSyncInstance) {
      return realtimeCacheSyncInstance.getStatus();
    }
    console.warn('Realtime sync not initialized');
    return null;
  };

  console.log('💡 Run getRealtimeSyncStatus() to check realtime subscription status');
}

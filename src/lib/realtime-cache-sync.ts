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
    changeType: 'property' | 'booking' | 'user' | 'financial' | 'static'
  ) {
    const invalidationMap = {
      property: [
        ['properties', 'list'],
        ['properties', 'detail'],
        ['bookings'],
      ],
      booking: [
        ['bookings'],
        ['bookings-calendar'],
        ['properties', 'detail'],
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
      ],
      static: [
        ['amenities'],
        ['rules'],
        ['properties', 'detail'],
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

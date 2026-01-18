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

      // Subscribe to issues changes
      await this.subscribeToIssues();

      // Subscribe to tasks changes
      await this.subscribeToTasks();

      // Subscribe to key control changes
      await this.subscribeToKeyControl();

      // Subscribe to check-in/out records changes
      await this.subscribeToCheckInOut();

      // Subscribe to service providers changes
      await this.subscribeToProviders();

      // Subscribe to guests changes
      await this.subscribeToGuests();

      // Subscribe to jobs changes
      await this.subscribeToJobs();

      // Subscribe to messages changes
      await this.subscribeToMessages();

      // Subscribe to checklist templates changes
      await this.subscribeToChecklistTemplates();

      // Subscribe to password vault changes
      await this.subscribeToPasswordVault();

      // Subscribe to activity logs changes
      await this.subscribeToActivityLogs();

      // Subscribe to bill templates changes (Finance Group)
      await this.subscribeToBillTemplates();

      // Subscribe to report email schedules changes (Automation Group)
      await this.subscribeToReportSchedules();

      // Subscribe to documents changes (Documents Group)
      await this.subscribeToDocuments();

      // Subscribe to vendor COIs changes (Documents Group)
      await this.subscribeToVendorCOIs();

      // Subscribe to building COIs changes (Documents Group)
      await this.subscribeToBuildingCOIs();

      // Subscribe to document approvals changes (Documents Group)
      await this.subscribeToDocumentApprovals();

      // Subscribe to access documents changes (Documents Group)
      await this.subscribeToAccessDocuments();

      // Subscribe to units table changes
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
   * Subscribe to issues table changes
   */
  private async subscribeToIssues() {
    const channel = supabase
      .channel('issues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
        },
        (payload) => {
          console.log('🔄 Issues table changed:', payload.eventType);

          // Invalidate all issue queries
          this.queryClient.invalidateQueries({ queryKey: ['issues'] });

          // Invalidate dashboard data (KPIs)
          this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['issues', 'byProperty', propertyId],
              });
              this.queryClient.invalidateQueries({
                queryKey: ['properties', 'detail', propertyId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('issues', channel);
  }

  /**
   * Subscribe to tasks table changes
   */
  private async subscribeToTasks() {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('🔄 Tasks table changed:', payload.eventType);

          // Invalidate all task queries
          this.queryClient.invalidateQueries({ queryKey: ['tasks'] });
          this.queryClient.invalidateQueries({ queryKey: ['todos'] });

          // Invalidate dashboard data (KPIs)
          this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['tasks', 'byProperty', propertyId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('tasks', channel);
  }

  /**
   * Subscribe to key control tables changes
   */
  private async subscribeToKeyControl() {
    // Key inventory
    const keyInventoryChannel = supabase
      .channel('key-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'key_inventory',
        },
        (payload) => {
          console.log('🔄 Key inventory changed:', payload.eventType);

          // Invalidate key control queries
          this.queryClient.invalidateQueries({ queryKey: ['key-inventory'] });
          this.queryClient.invalidateQueries({ queryKey: ['key-control'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['key-inventory', propertyId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('key_inventory', keyInventoryChannel);

    // Key borrowings
    const keyBorrowingsChannel = supabase
      .channel('key-borrowings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'key_borrowings',
        },
        (payload) => {
          console.log('🔄 Key borrowings changed:', payload.eventType);

          // Invalidate key control queries
          this.queryClient.invalidateQueries({ queryKey: ['key-borrowings'] });
          this.queryClient.invalidateQueries({ queryKey: ['key-control'] });
          this.queryClient.invalidateQueries({ queryKey: ['key-inventory'] });
        }
      )
      .subscribe();

    this.subscriptions.set('key_borrowings', keyBorrowingsChannel);
  }

  /**
   * Subscribe to check-in/out records table changes
   */
  private async subscribeToCheckInOut() {
    const channel = supabase
      .channel('check-in-out-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_in_out_records',
        },
        (payload) => {
          console.log('🔄 Check-in/out records changed:', payload.eventType);

          // Invalidate check-in/out queries
          this.queryClient.invalidateQueries({ queryKey: ['check_in_out_records'] });
          this.queryClient.invalidateQueries({ queryKey: ['check_in_out_record'] });

          // Invalidate dashboard data (KPIs)
          this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as Record<string, unknown>).property_id as string;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['check_in_out_records', { property_id: propertyId }],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('check_in_out_records', channel);
  }

  /**
   * Subscribe to service providers table changes
   */
  private async subscribeToProviders() {
    const channel = supabase
      .channel('providers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_providers',
        },
        (payload) => {
          console.log('🔄 Service providers changed:', payload.eventType);

          // Invalidate provider queries
          this.queryClient.invalidateQueries({ queryKey: ['providers'] });
          this.queryClient.invalidateQueries({ queryKey: ['service-providers'] });

          // Invalidate property-provider mappings
          this.queryClient.invalidateQueries({ queryKey: ['property-providers'] });
        }
      )
      .subscribe();

    this.subscriptions.set('service_providers', channel);
  }

  /**
   * Subscribe to guests table changes
   */
  private async subscribeToGuests() {
    const channel = supabase
      .channel('guests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
        },
        (payload) => {
          console.log('🔄 Guests table changed:', payload.eventType);

          // Invalidate guests queries
          this.queryClient.invalidateQueries({ queryKey: ['guests'] });

          // If specific guest changed, invalidate their detail
          if (payload.new && 'guest_id' in payload.new) {
            const guestId = (payload.new as any).guest_id;
            this.queryClient.invalidateQueries({
              queryKey: ['guests', 'detail', guestId],
            });
          }

          // Also invalidate bookings as they reference guests
          this.queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }
      )
      .subscribe();

    this.subscriptions.set('guests', channel);
  }

  /**
   * Subscribe to jobs table changes
   */
  private async subscribeToJobs() {
    const channel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
        },
        (payload) => {
          console.log('🔄 Jobs table changed:', payload.eventType);

          // Invalidate jobs queries
          this.queryClient.invalidateQueries({ queryKey: ['jobs'] });
          this.queryClient.invalidateQueries({ queryKey: ['jobs-history'] });

          // Invalidate dashboard data
          this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['jobs', 'byProperty', propertyId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('jobs', channel);
  }

  /**
   * Subscribe to messages table changes
   */
  private async subscribeToMessages() {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('🔄 Messages table changed:', payload.eventType);

          // Invalidate messages queries
          this.queryClient.invalidateQueries({ queryKey: ['messages'] });
          this.queryClient.invalidateQueries({ queryKey: ['conversations'] });
          this.queryClient.invalidateQueries({ queryKey: ['unread-messages'] });

          // Invalidate specific conversation if available
          if (payload.new && 'conversation_id' in payload.new) {
            const conversationId = (payload.new as any).conversation_id;
            if (conversationId) {
              this.queryClient.invalidateQueries({
                queryKey: ['messages', conversationId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('messages', channel);
  }

  /**
   * Subscribe to checklist templates table changes
   */
  private async subscribeToChecklistTemplates() {
    const channel = supabase
      .channel('checklist-templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_templates',
        },
        (payload) => {
          console.log('🔄 Checklist templates changed:', payload.eventType);

          // Invalidate checklist template queries
          this.queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
          this.queryClient.invalidateQueries({ queryKey: ['checklist_templates'] });

          // If specific template changed, invalidate its detail
          if (payload.new && 'template_id' in payload.new) {
            const templateId = (payload.new as any).template_id;
            this.queryClient.invalidateQueries({
              queryKey: ['checklist-templates', templateId],
            });
          }
        }
      )
      .subscribe();

    this.subscriptions.set('checklist_templates', channel);
  }

  /**
   * Subscribe to password vault table changes
   */
  private async subscribeToPasswordVault() {
    // Password vault entries
    const vaultChannel = supabase
      .channel('password-vault-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'password_vault',
        },
        (payload) => {
          console.log('🔄 Password vault changed:', payload.eventType);

          // Invalidate password vault queries
          this.queryClient.invalidateQueries({ queryKey: ['password-vault'] });
          this.queryClient.invalidateQueries({ queryKey: ['password_vault'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['password-vault', propertyId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('password_vault', vaultChannel);

    // Password vault master (for master password)
    const masterChannel = supabase
      .channel('password-vault-master-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'password_vault_master',
        },
        (payload) => {
          console.log('🔄 Password vault master changed:', payload.eventType);

          // Invalidate vault master queries
          this.queryClient.invalidateQueries({ queryKey: ['password-vault-master'] });
          this.queryClient.invalidateQueries({ queryKey: ['vault-status'] });
        }
      )
      .subscribe();

    this.subscriptions.set('password_vault_master', masterChannel);
  }

  /**
   * Subscribe to activity logs table changes
   */
  private async subscribeToActivityLogs() {
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload) => {
          console.log('🔄 Activity logs changed:', payload.eventType);

          // Invalidate activity logs queries
          this.queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
          this.queryClient.invalidateQueries({ queryKey: ['activity_logs'] });

          // Invalidate dashboard data (recent activity)
          this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      )
      .subscribe();

    this.subscriptions.set('activity_logs', channel);
  }

  /**
   * Subscribe to bill templates table changes (Finance Group)
   */
  private async subscribeToBillTemplates() {
    const channel = supabase
      .channel('bill-templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bill_templates',
        },
        (payload) => {
          console.log('🔄 Bill templates changed:', payload.eventType);

          // Invalidate bill template queries
          this.queryClient.invalidateQueries({ queryKey: ['bill-templates'] });
          this.queryClient.invalidateQueries({ queryKey: ['bill_templates'] });

          // If specific template changed, invalidate its detail
          if (payload.new && 'template_id' in payload.new) {
            const templateId = (payload.new as any).template_id;
            this.queryClient.invalidateQueries({
              queryKey: ['bill-templates', templateId],
            });
          }

          // Invalidate financial summary as bill templates affect billing
          this.queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
        }
      )
      .subscribe();

    this.subscriptions.set('bill_templates', channel);
  }

  /**
   * Subscribe to report email schedules table changes (Automation Group)
   */
  private async subscribeToReportSchedules() {
    const channel = supabase
      .channel('report-schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report_email_schedules',
        },
        (payload) => {
          console.log('🔄 Report email schedules changed:', payload.eventType);

          // Invalidate report schedule queries
          this.queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
          this.queryClient.invalidateQueries({ queryKey: ['report_email_schedules'] });
          this.queryClient.invalidateQueries({ queryKey: ['email-schedules'] });

          // If specific schedule changed, invalidate its detail
          if (payload.new && 'schedule_id' in payload.new) {
            const scheduleId = (payload.new as any).schedule_id;
            this.queryClient.invalidateQueries({
              queryKey: ['report-schedules', scheduleId],
            });
          }
        }
      )
      .subscribe();

    this.subscriptions.set('report_email_schedules', channel);
  }

  /**
   * Subscribe to documents table changes (Documents Group)
   */
  private async subscribeToDocuments() {
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
        },
        (payload) => {
          console.log('🔄 Documents table changed:', payload.eventType);

          // Invalidate document queries
          this.queryClient.invalidateQueries({ queryKey: ['documents'] });

          // If specific document changed, invalidate its detail
          if (payload.new && 'document_id' in payload.new) {
            const documentId = (payload.new as any).document_id;
            this.queryClient.invalidateQueries({
              queryKey: ['documents', 'detail', documentId],
            });
          }

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['documents', 'property', propertyId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('documents', channel);
  }

  /**
   * Subscribe to vendor COIs table changes (Documents Group)
   */
  private async subscribeToVendorCOIs() {
    const channel = supabase
      .channel('vendor-cois-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_cois',
        },
        (payload) => {
          console.log('🔄 Vendor COIs changed:', payload.eventType);

          // Invalidate vendor COI queries
          this.queryClient.invalidateQueries({ queryKey: ['vendor-cois'] });
          this.queryClient.invalidateQueries({ queryKey: ['coi-dashboard-stats'] });
          this.queryClient.invalidateQueries({ queryKey: ['expiring-cois'] });

          // Also invalidate provider queries since COIs relate to providers
          this.queryClient.invalidateQueries({ queryKey: ['providers'] });

          // Invalidate vendor-specific queries
          if (payload.new && 'vendor_id' in payload.new) {
            const vendorId = (payload.new as any).vendor_id;
            if (vendorId) {
              this.queryClient.invalidateQueries({
                queryKey: ['vendor-coi-validation', vendorId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('vendor_cois', channel);
  }

  /**
   * Subscribe to building COIs table changes (Documents Group)
   */
  private async subscribeToBuildingCOIs() {
    const channel = supabase
      .channel('building-cois-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'building_cois',
        },
        (payload) => {
          console.log('🔄 Building COIs changed:', payload.eventType);

          // Invalidate building COI queries
          this.queryClient.invalidateQueries({ queryKey: ['building-cois'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['building-coi-by-property', propertyId],
              });
              this.queryClient.invalidateQueries({
                queryKey: ['validate-vendor-building'],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('building_cois', channel);
  }

  /**
   * Subscribe to document approvals table changes (Documents Group)
   */
  private async subscribeToDocumentApprovals() {
    const channel = supabase
      .channel('document-approvals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_approvals',
        },
        (payload) => {
          console.log('🔄 Document approvals changed:', payload.eventType);

          // Invalidate document approval queries
          this.queryClient.invalidateQueries({ queryKey: ['document_approvals'] });

          // Invalidate dashboard notifications
          this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      )
      .subscribe();

    this.subscriptions.set('document_approvals', channel);
  }

  /**
   * Subscribe to access documents table changes (Documents Group)
   */
  private async subscribeToAccessDocuments() {
    const channel = supabase
      .channel('access-documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'access_documents',
        },
        (payload) => {
          console.log('🔄 Access documents changed:', payload.eventType);

          // Invalidate access document queries
          this.queryClient.invalidateQueries({ queryKey: ['access-documents'] });

          // Invalidate property-specific queries
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['access-documents', 'property', propertyId],
              });
            }
          }

          // Invalidate vendor-specific queries
          if (payload.new && 'vendor_id' in payload.new) {
            const vendorId = (payload.new as any).vendor_id;
            if (vendorId) {
              this.queryClient.invalidateQueries({
                queryKey: ['access-documents', 'vendor', vendorId],
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('access_documents', channel);
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

          // Invalidate units queries
          this.queryClient.invalidateQueries({ queryKey: ['units'] });

          // Invalidate properties queries (units are nested in properties)
          this.queryClient.invalidateQueries({ queryKey: ['properties'] });

          // Invalidate property detail if we know which property
          if (payload.new && 'property_id' in payload.new) {
            const propertyId = (payload.new as any).property_id;
            if (propertyId) {
              this.queryClient.invalidateQueries({
                queryKey: ['properties', 'detail', propertyId],
              });
            }
          }

          // Invalidate jobs and issues (they can be assigned to units)
          this.queryClient.invalidateQueries({ queryKey: ['jobs'] });
          this.queryClient.invalidateQueries({ queryKey: ['issues'] });

          // Invalidate bookings (bookings can be for specific units)
          this.queryClient.invalidateQueries({ queryKey: ['bookings'] });
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
    changeType: 'property' | 'booking' | 'user' | 'financial' | 'static' | 'expense' | 'invoice' | 'highlight' | 'unit' | 'issue' | 'task' | 'keyControl' | 'checkInOut' | 'provider' | 'guest' | 'job' | 'message' | 'checklistTemplate' | 'passwordVault' | 'activityLog' | 'billTemplate' | 'reportSchedule' | 'document' | 'vendorCOI' | 'buildingCOI' | 'documentApproval' | 'accessDocument' | 'units'
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
      issue: [
        ['issues'],
        ['dashboard'],
        ['properties', 'detail'],
      ],
      task: [
        ['tasks'],
        ['todos'],
        ['dashboard'],
      ],
      keyControl: [
        ['key-inventory'],
        ['key-borrowings'],
        ['key-control'],
      ],
      checkInOut: [
        ['check_in_out_records'],
        ['check_in_out_record'],
        ['dashboard'],
      ],
      provider: [
        ['providers'],
        ['service-providers'],
        ['property-providers'],
      ],
      guest: [
        ['guests'],
        ['bookings'],
      ],
      job: [
        ['jobs'],
        ['jobs-history'],
        ['dashboard'],
      ],
      message: [
        ['messages'],
        ['conversations'],
        ['unread-messages'],
      ],
      checklistTemplate: [
        ['checklist-templates'],
        ['checklist_templates'],
      ],
      passwordVault: [
        ['password-vault'],
        ['password_vault'],
        ['password-vault-master'],
        ['vault-status'],
      ],
      activityLog: [
        ['activity-logs'],
        ['activity_logs'],
        ['dashboard'],
      ],
      billTemplate: [
        ['bill-templates'],
        ['bill_templates'],
        ['financial-summary'],
      ],
      reportSchedule: [
        ['report-schedules'],
        ['report_email_schedules'],
        ['email-schedules'],
      ],
      document: [
        ['documents'],
        ['documents', 'list'],
        ['documents', 'stats'],
      ],
      vendorCOI: [
        ['vendor-cois'],
        ['coi-dashboard-stats'],
        ['expiring-cois'],
        ['providers'],
      ],
      buildingCOI: [
        ['building-cois'],
        ['validate-vendor-building'],
      ],
      documentApproval: [
        ['document_approvals'],
        ['dashboard'],
      ],
      accessDocument: [
        ['access-documents'],
      ],
      units: [
        ['units'],
        ['properties'],
        ['properties', 'list'],
        ['jobs'],
        ['issues'],
        ['bookings'],
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

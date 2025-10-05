// Advanced state persistence and restoration system
import { QueryClient } from '@tanstack/react-query';
import { indexedDBCache } from './indexeddb-cache';

interface AppState {
  route: string;
  formData: Record<string, any>;
  scrollPositions: Record<string, number>;
  userPreferences: Record<string, any>;
  temporaryData: Record<string, any>;
  lastSaved: number;
  version: string;
}

interface FormState {
  formId: string;
  values: Record<string, any>;
  isDirty: boolean;
  lastModified: number;
  autoSaveEnabled: boolean;
}

interface ScrollState {
  path: string;
  scrollY: number;
  scrollX: number;
  timestamp: number;
}

export class StatePersistenceManager {
  private queryClient: QueryClient;
  private currentState: AppState;
  private formStates: Map<string, FormState> = new Map();
  private scrollStates: Map<string, ScrollState> = new Map();
  private autoSaveIntervals: Map<string, NodeJS.Timeout> = new Map();
  private stateVersion = '1.0.0';

  // Configuration
  private config = {
    autoSaveInterval: 30 * 1000, // 30 seconds
    maxFormStates: 50,
    maxScrollStates: 100,
    stateExpiration: 24 * 60 * 60 * 1000, // 24 hours
    debounceDelay: 1000,
  };

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.currentState = this.getInitialState();
    this.initializePersistence();
  }

  private getInitialState(): AppState {
    return {
      route: '/',
      formData: {},
      scrollPositions: {},
      userPreferences: {},
      temporaryData: {},
      lastSaved: Date.now(),
      version: this.stateVersion,
    };
  }

  private async initializePersistence(): Promise<void> {
    // Restore previous state
    await this.restoreState();

    // Set up auto-save
    this.setupAutoSave();

    // Set up browser event listeners
    this.setupEventListeners();

    // Set up periodic cleanup
    this.setupPeriodicCleanup();

    console.log('💾 State persistence initialized');
  }

  // Persist entire application state
  async persistState(): Promise<void> {
    try {
      this.currentState.lastSaved = Date.now();
      this.currentState.version = this.stateVersion;

      await indexedDBCache.setItem('metadata', 'app-state', this.currentState);

      // Also persist form states
      await this.persistFormStates();

      // Persist scroll states
      await this.persistScrollStates();

      console.log('💾 Application state persisted');
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  // Restore application state
  async restoreState(): Promise<void> {
    try {
      const savedState = await indexedDBCache.getItem<AppState>('metadata', 'app-state');

      if (savedState && savedState.version === this.stateVersion) {
        this.currentState = { ...this.currentState, ...savedState };

        // Restore form states
        await this.restoreFormStates();

        // Restore scroll states
        await this.restoreScrollStates();

        console.log('💾 Application state restored');
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  // Form state management
  async persistFormState(formId: string, values: Record<string, any>, isDirty = true): Promise<void> {
    const formState: FormState = {
      formId,
      values,
      isDirty,
      lastModified: Date.now(),
      autoSaveEnabled: true,
    };

    this.formStates.set(formId, formState);

    // Debounced save to avoid too frequent writes
    this.debouncedPersistFormStates();
  }

  async restoreFormState(formId: string): Promise<Record<string, any> | null> {
    const formState = this.formStates.get(formId);

    if (formState && this.isStateValid(formState.lastModified)) {
      return formState.values;
    }

    return null;
  }

  // Auto-save form data
  enableAutoSave(formId: string, saveCallback: (values: Record<string, any>) => void): void {
    // Clear existing interval
    this.disableAutoSave(formId);

    const interval = setInterval(() => {
      const formState = this.formStates.get(formId);

      if (formState && formState.isDirty && formState.autoSaveEnabled) {
        saveCallback(formState.values);
        formState.isDirty = false;
        console.log(`💾 Auto-saved form: ${formId}`);
      }
    }, this.config.autoSaveInterval);

    this.autoSaveIntervals.set(formId, interval);
  }

  disableAutoSave(formId: string): void {
    const interval = this.autoSaveIntervals.get(formId);
    if (interval) {
      clearInterval(interval);
      this.autoSaveIntervals.delete(formId);
    }
  }

  // Scroll position management
  saveScrollPosition(path: string, scrollY: number, scrollX = 0): void {
    const scrollState: ScrollState = {
      path,
      scrollY,
      scrollX,
      timestamp: Date.now(),
    };

    this.scrollStates.set(path, scrollState);

    // Limit the number of stored scroll positions
    if (this.scrollStates.size > this.config.maxScrollStates) {
      const oldestKey = Array.from(this.scrollStates.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.scrollStates.delete(oldestKey);
    }

    this.debouncedPersistScrollStates();
  }

  restoreScrollPosition(path: string): ScrollState | null {
    const scrollState = this.scrollStates.get(path);

    if (scrollState && this.isStateValid(scrollState.timestamp)) {
      return scrollState;
    }

    return null;
  }

  // User preferences management
  setUserPreference(key: string, value: any): void {
    this.currentState.userPreferences[key] = value;
    this.debouncedPersistState();
  }

  getUserPreference<T>(key: string, defaultValue?: T): T {
    return this.currentState.userPreferences[key] ?? defaultValue;
  }

  // Temporary data management (session-specific)
  setTemporaryData(key: string, value: any): void {
    this.currentState.temporaryData[key] = value;
  }

  getTemporaryData<T>(key: string): T | null {
    return this.currentState.temporaryData[key] ?? null;
  }

  clearTemporaryData(): void {
    this.currentState.temporaryData = {};
  }

  // React Query state persistence
  async persistQueryState(): Promise<void> {
    try {
      const queryCache = this.queryClient.getQueryCache();
      const queries = queryCache.getAll();

      const persistableQueries = queries
        .filter(query => {
          // Only persist certain query types
          const queryKey = query.queryKey[0] as string;
          return ['properties', 'users', 'amenities', 'rules'].includes(queryKey);
        })
        .map(query => ({
          queryKey: query.queryKey,
          data: query.state.data,
          dataUpdatedAt: query.state.dataUpdatedAt,
          error: null, // Don't persist errors
        }));

      await indexedDBCache.setItem('metadata', 'query-cache', persistableQueries);
      console.log('💾 Query cache persisted');
    } catch (error) {
      console.error('Failed to persist query state:', error);
    }
  }

  async restoreQueryState(): Promise<void> {
    try {
      const persistedQueries = await indexedDBCache.getItem<any[]>('metadata', 'query-cache');

      if (persistedQueries) {
        for (const query of persistedQueries) {
          // Only restore if data is still relatively fresh (within 1 hour)
          if (Date.now() - query.dataUpdatedAt < 60 * 60 * 1000) {
            this.queryClient.setQueryData(query.queryKey, query.data);
          }
        }

        console.log(`💾 Restored ${persistedQueries.length} cached queries`);
      }
    } catch (error) {
      console.error('Failed to restore query state:', error);
    }
  }

  // Route state management
  saveCurrentRoute(): void {
    this.currentState.route = window.location.pathname + window.location.search;
    this.debouncedPersistState();
  }

  getLastRoute(): string {
    return this.currentState.route;
  }

  // Setup methods
  private setupAutoSave(): void {
    // Auto-save state every 30 seconds
    setInterval(() => {
      this.persistState();
    }, this.config.autoSaveInterval);

    // Save query state periodically
    setInterval(() => {
      this.persistQueryState();
    }, 60 * 1000); // Every minute
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Save state before page unload
    window.addEventListener('beforeunload', () => {
      this.persistState();
      this.persistQueryState();
    });

    // Save route changes
    let currentPath = window.location.pathname;
    const trackRouteChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        this.saveCurrentRoute();
        currentPath = newPath;
      }
    };

    window.addEventListener('popstate', trackRouteChange);

    // Override history methods
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(trackRouteChange, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(trackRouteChange, 0);
    };

    // Save scroll positions
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.saveScrollPosition(
          window.location.pathname,
          window.scrollY,
          window.scrollX
        );
      }, 100);
    });

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.persistState();
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      this.syncOfflineChanges();
    });
  }

  private setupPeriodicCleanup(): void {
    // Clean up expired state every hour
    setInterval(() => {
      this.cleanupExpiredState();
    }, 60 * 60 * 1000);
  }

  // Utility methods
  private isStateValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.stateExpiration;
  }

  private debouncedPersistState = this.debounce(() => {
    this.persistState();
  }, this.config.debounceDelay);

  private debouncedPersistFormStates = this.debounce(() => {
    this.persistFormStates();
  }, this.config.debounceDelay);

  private debouncedPersistScrollStates = this.debounce(() => {
    this.persistScrollStates();
  }, this.config.debounceDelay);

  private debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Persistence helpers
  private async persistFormStates(): Promise<void> {
    try {
      const formStatesArray = Array.from(this.formStates.entries());
      await indexedDBCache.setItem('metadata', 'form-states', formStatesArray);
    } catch (error) {
      console.error('Failed to persist form states:', error);
    }
  }

  private async restoreFormStates(): Promise<void> {
    try {
      const formStatesArray = await indexedDBCache.getItem<[string, FormState][]>('metadata', 'form-states');

      if (formStatesArray) {
        this.formStates = new Map(formStatesArray);

        // Clean up expired form states
        for (const [formId, formState] of this.formStates) {
          if (!this.isStateValid(formState.lastModified)) {
            this.formStates.delete(formId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore form states:', error);
    }
  }

  private async persistScrollStates(): Promise<void> {
    try {
      const scrollStatesArray = Array.from(this.scrollStates.entries());
      await indexedDBCache.setItem('metadata', 'scroll-states', scrollStatesArray);
    } catch (error) {
      console.error('Failed to persist scroll states:', error);
    }
  }

  private async restoreScrollStates(): Promise<void> {
    try {
      const scrollStatesArray = await indexedDBCache.getItem<[string, ScrollState][]>('metadata', 'scroll-states');

      if (scrollStatesArray) {
        this.scrollStates = new Map(scrollStatesArray);

        // Clean up expired scroll states
        for (const [path, scrollState] of this.scrollStates) {
          if (!this.isStateValid(scrollState.timestamp)) {
            this.scrollStates.delete(path);
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore scroll states:', error);
    }
  }

  // Cleanup methods
  private cleanupExpiredState(): void {
    const now = Date.now();

    // Clean up form states
    for (const [formId, formState] of this.formStates) {
      if (now - formState.lastModified > this.config.stateExpiration) {
        this.formStates.delete(formId);
        this.disableAutoSave(formId);
      }
    }

    // Clean up scroll states
    for (const [path, scrollState] of this.scrollStates) {
      if (now - scrollState.timestamp > this.config.stateExpiration) {
        this.scrollStates.delete(path);
      }
    }

    console.log('🧹 Cleaned up expired state');
  }

  // Offline synchronization
  private async syncOfflineChanges(): Promise<void> {
    console.log('🔄 Syncing offline changes...');

    // Sync form states that were modified offline
    for (const [formId, formState] of this.formStates) {
      if (formState.isDirty) {
        try {
          // This would trigger the actual save to server
          // Implementation depends on your specific forms
          console.log(`🔄 Syncing form: ${formId}`);
        } catch (error) {
          console.error(`Failed to sync form ${formId}:`, error);
        }
      }
    }
  }

  // Public API methods
  async exportState(): Promise<string> {
    const exportData = {
      appState: this.currentState,
      formStates: Array.from(this.formStates.entries()),
      scrollStates: Array.from(this.scrollStates.entries()),
      exportedAt: Date.now(),
      version: this.stateVersion,
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importState(stateData: string): Promise<void> {
    try {
      const importedData = JSON.parse(stateData);

      if (importedData.version === this.stateVersion) {
        this.currentState = importedData.appState;
        this.formStates = new Map(importedData.formStates);
        this.scrollStates = new Map(importedData.scrollStates);

        await this.persistState();
        console.log('💾 State imported successfully');
      } else {
        throw new Error('Version mismatch');
      }
    } catch (error) {
      console.error('Failed to import state:', error);
      throw error;
    }
  }

  getStateSize(): { forms: number; scrolls: number; preferences: number } {
    return {
      forms: this.formStates.size,
      scrolls: this.scrollStates.size,
      preferences: Object.keys(this.currentState.userPreferences).length,
    };
  }

  clearAllState(): void {
    this.currentState = this.getInitialState();
    this.formStates.clear();
    this.scrollStates.clear();

    // Clear auto-save intervals
    for (const interval of this.autoSaveIntervals.values()) {
      clearInterval(interval);
    }
    this.autoSaveIntervals.clear();

    this.persistState();
    console.log('🗑️ All state cleared');
  }

  // Cleanup
  cleanup(): void {
    // Clear intervals
    for (const interval of this.autoSaveIntervals.values()) {
      clearInterval(interval);
    }

    // Save final state
    this.persistState();
    this.persistQueryState();
  }
}

// React hooks for state persistence
export const useStatePersistence = () => {
  const manager = getStatePersistenceManager();

  return {
    persistFormState: manager?.persistFormState.bind(manager),
    restoreFormState: manager?.restoreFormState.bind(manager),
    enableAutoSave: manager?.enableAutoSave.bind(manager),
    disableAutoSave: manager?.disableAutoSave.bind(manager),
    setUserPreference: manager?.setUserPreference.bind(manager),
    getUserPreference: manager?.getUserPreference.bind(manager),
    setTemporaryData: manager?.setTemporaryData.bind(manager),
    getTemporaryData: manager?.getTemporaryData.bind(manager),
  };
};

// Singleton management
let statePersistenceManager: StatePersistenceManager | null = null;

export const initializeStatePersistence = (queryClient: QueryClient): StatePersistenceManager => {
  statePersistenceManager = new StatePersistenceManager(queryClient);
  return statePersistenceManager;
};

export const getStatePersistenceManager = (): StatePersistenceManager | null => {
  return statePersistenceManager;
};
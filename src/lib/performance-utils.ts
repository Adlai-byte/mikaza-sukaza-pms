import * as React from 'react';
import { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';

// Note: Using simple debounce/throttle implementation to avoid external dependencies
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

const throttle = <T extends (...args: any[]) => any>(func: T, delay: number): T => {
  let isThrottled = false;
  return ((...args: any[]) => {
    if (!isThrottled) {
      func(...args);
      isThrottled = true;
      setTimeout(() => { isThrottled = false; }, delay);
    }
  }) as T;
};

// HOC for memoizing components with deep comparison
export const memoDeep = <P extends object>(Component: React.ComponentType<P>) => {
  return memo(Component, (prevProps, nextProps) => {
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  });
};

// HOC for memoizing components with shallow comparison (default but explicit)
export const memoShallow = <P extends object>(Component: React.ComponentType<P>) => {
  return memo(Component);
};

// Custom hook for debounced values
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom hook for throttled callbacks
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const throttledCallback = useMemo(
    () => throttle(callback, delay),
    [callback, delay]
  );

  return throttledCallback as T;
};

// Custom hook for debounced callbacks
export const useDebounceCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  );

  return debouncedCallback as T;
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
};

// Virtual list implementation for large datasets
export const useVirtualList = <T>(
  items: T[],
  containerHeight: number,
  itemHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const endIndex = Math.min(
      items.length,
      startIndex + Math.ceil(containerHeight / itemHeight) + 4
    );

    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      offsetY: (startIndex + index) * itemHeight,
    }));
  }, [items, scrollTop, itemHeight, containerHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    containerRef: setContainerRef,
    onScroll: handleScroll,
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = Date.now() - startTime.current;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ${componentName} render #${renderCount.current} took ${renderTime}ms`);
    }

    startTime.current = Date.now();
  });

  const logRender = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ${componentName} rendered ${renderCount.current} times`);
    }
  }, [componentName]);

  return { renderCount: renderCount.current, logRender };
};

// Memoized calculations hook
export const useMemoizedCalculation = <T>(
  calculation: () => T,
  dependencies: React.DependencyList
): T => {
  return useMemo(calculation, dependencies);
};

// Stable callback hook (prevents unnecessary re-renders)
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  const stableCallback = useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    []
  );

  return stableCallback;
};

// Image lazy loading hook
export const useLazyImage = (src: string) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const { isIntersecting } = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (isIntersecting && !imageSrc && src) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setIsError(true);
      };
      img.src = src;
    }
  }, [isIntersecting, src, imageSrc]);

  return {
    imgRef,
    src: imageSrc,
    isLoaded,
    isError,
    isLoading: isIntersecting && !isLoaded && !isError,
  };
};

// Component state optimization
export const useOptimizedState = <T>(initialValue: T) => {
  const [state, setState] = useState<T>(initialValue);

  const optimizedSetState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prev => {
      const nextValue = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue;

      // Only update if value actually changed
      if (JSON.stringify(prev) !== JSON.stringify(nextValue)) {
        return nextValue;
      }
      return prev;
    });
  }, []);

  return [state, optimizedSetState] as const;
};

// Bundle splitting utility
export const loadComponentLazy = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(() =>
    importFunc().then(module => ({ default: module.default }))
  );
};

// Performance utilities for form optimization
export const useFormPerformance = () => {
  const debouncedValidation = useDebounceCallback((values: any) => {
    // Validation logic here
    console.log('Validating form:', values);
  }, 300);

  const throttledSave = useThrottle((values: any) => {
    // Auto-save logic here
    console.log('Auto-saving form:', values);
  }, 2000);

  return {
    debouncedValidation,
    throttledSave,
  };
};


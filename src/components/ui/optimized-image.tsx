import React, { useState, useEffect, useRef } from 'react';
import { imageCacheOptimizer } from '@/lib/image-cache-optimizer';
import { useIntersectionObserver } from '@/lib/performance-utils';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onClick'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  category?: 'critical' | 'properties' | 'avatars' | 'thumbnails';
  lazy?: boolean;
  progressive?: boolean;
  placeholder?: 'skeleton' | 'blur' | 'color' | 'none';
  placeholderColor?: string;
  fallbackSrc?: string;
  onLoad?: (src: string) => void;
  onError?: (error: Error) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 0.85,
  format,
  category = 'properties',
  lazy = true,
  progressive = true,
  placeholder = 'skeleton',
  placeholderColor = '#f0f0f0',
  fallbackSrc,
  onLoad,
  onError,
  onClick,
  className,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [loadStage, setLoadStage] = useState<'placeholder' | 'lowQuality' | 'highQuality'>('placeholder');

  const imgRef = useRef<HTMLImageElement>(null);
  const { isIntersecting, hasIntersected } = useIntersectionObserver(
    imgRef,
    { threshold: 0.1, rootMargin: '50px' }
  );

  const shouldLoad = lazy ? hasIntersected : true;

  // Generate cache options
  const cacheOptions = {
    quality,
    format,
    width,
    height,
  };

  // Load image when it should be loaded
  useEffect(() => {
    if (!shouldLoad || !src) return;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setIsError(false);

        if (progressive && width && height) {
          // Progressive loading
          const { placeholder, lowQuality, highQuality } = await imageCacheOptimizer.loadImageProgressively(
            src,
            { width, height, blur: placeholder === 'blur' }
          );

          // Set placeholder
          if (placeholder === 'blur' || placeholder === 'color') {
            setCurrentSrc(placeholder);
            setLoadStage('placeholder');
          }

          // Load low quality first
          try {
            const lowQualitySrc = await lowQuality;
            setCurrentSrc(lowQualitySrc);
            setLoadStage('lowQuality');
          } catch (error) {
            console.warn('Low quality image failed to load:', error);
          }

          // Then load high quality
          try {
            const highQualitySrc = await highQuality;
            setCurrentSrc(highQualitySrc);
            setLoadStage('highQuality');
            setIsLoading(false);
            onLoad?.(highQualitySrc);
          } catch (error) {
            console.error('High quality image failed to load:', error);
            throw error;
          }
        } else {
          // Regular optimized loading
          const optimizedSrc = await imageCacheOptimizer.optimizeAndCacheImage(
            src,
            cacheOptions,
            category
          );

          setCurrentSrc(optimizedSrc);
          setLoadStage('highQuality');
          setIsLoading(false);
          onLoad?.(optimizedSrc);
        }
      } catch (error) {
        console.error('Image loading failed:', error);
        setIsError(true);
        setIsLoading(false);

        // Try fallback
        if (fallbackSrc) {
          try {
            const fallbackOptimized = await imageCacheOptimizer.optimizeAndCacheImage(
              fallbackSrc,
              cacheOptions,
              category
            );
            setCurrentSrc(fallbackOptimized);
            setIsError(false);
            onLoad?.(fallbackOptimized);
          } catch (fallbackError) {
            console.error('Fallback image also failed:', fallbackError);
            onError?.(error as Error);
          }
        } else {
          onError?.(error as Error);
        }
      }
    };

    loadImage();
  }, [shouldLoad, src, progressive, width, height, quality, format, category, fallbackSrc, onLoad, onError]);

  // Render placeholder
  const renderPlaceholder = () => {
    if (placeholder === 'skeleton') {
      return (
        <Skeleton
          className={cn('w-full h-full', className)}
          style={{ width, height }}
        />
      );
    }

    if (placeholder === 'color') {
      return (
        <div
          className={cn('w-full h-full flex items-center justify-center', className)}
          style={{
            backgroundColor: placeholderColor,
            width,
            height,
          }}
        >
          <span className="text-gray-500 text-sm">Loading...</span>
        </div>
      );
    }

    return null;
  };

  // Render error state
  const renderError = () => {
    return (
      <div
        className={cn(
          'w-full h-full flex items-center justify-center bg-gray-100 text-gray-500',
          onClick ? 'cursor-pointer' : '',
          className
        )}
        style={{ width, height }}
        onClick={onClick}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">Failed to load image</div>
        </div>
      </div>
    );
  };

  // Don't render anything if lazy loading and not intersected yet
  if (lazy && !hasIntersected) {
    return (
      <div
        ref={imgRef}
        className={cn('w-full h-full', onClick ? 'cursor-pointer' : '', className)}
        style={{ width, height }}
        onClick={onClick}
      >
        {renderPlaceholder()}
      </div>
    );
  }

  // Render error state
  if (isError && !currentSrc) {
    return renderError();
  }

  // Render loading state
  if (isLoading && loadStage === 'placeholder' && placeholder !== 'none') {
    return (
      <div
        ref={imgRef}
        className={cn('w-full h-full', onClick ? 'cursor-pointer' : '', className)}
        style={{ width, height }}
        onClick={onClick}
      >
        {renderPlaceholder()}
      </div>
    );
  }

  // Render image
  return (
    <div className={cn('relative w-full h-full', onClick ? 'cursor-pointer' : '')} onClick={onClick}>
      {/* Main image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-300',
          {
            'opacity-0': isLoading && loadStage === 'placeholder',
            'opacity-50': loadStage === 'lowQuality',
            'opacity-100': loadStage === 'highQuality',
          },
          className
        )}
        loading={lazy ? 'lazy' : 'eager'}
        {...props}
      />

      {/* Loading overlay for progressive loading */}
      {progressive && isLoading && loadStage !== 'highQuality' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">
              {loadStage === 'placeholder' ? 'Loading...' : 'Enhancing...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Gallery component with optimized images
interface OptimizedImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: number;
  aspectRatio?: number;
  category?: 'critical' | 'properties' | 'avatars' | 'thumbnails';
  onImageClick?: (index: number) => void;
}

export const OptimizedImageGallery: React.FC<OptimizedImageGalleryProps> = ({
  images,
  columns = 3,
  aspectRatio = 16 / 9,
  category = 'properties',
  onImageClick,
}) => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-3';

  return (
    <div className={cn('grid gap-4', gridCols)}>
      {images.map((image, index) => (
        <div
          key={index}
          className="group cursor-pointer overflow-hidden rounded-lg bg-gray-100"
          onClick={() => onImageClick?.(index)}
          style={{ aspectRatio }}
        >
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            category={category}
            width={300}
            height={Math.round(300 / aspectRatio)}
            quality={0.8}
            progressive
            lazy
            placeholder="skeleton"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onLoad={() => handleImageLoad(index)}
          />

          {/* Caption overlay */}
          {image.caption && loadedImages.has(index) && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-sm truncate">{image.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Avatar component with optimized caching
interface OptimizedAvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const OptimizedAvatar: React.FC<OptimizedAvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const sizePixels = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const generateGradient = (name: string): string => {
    const colors = [
      'from-blue-500 to-purple-500',
      'from-green-500 to-blue-500',
      'from-purple-500 to-pink-500',
      'from-yellow-500 to-red-500',
      'from-indigo-500 to-purple-500',
    ];

    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br font-medium text-white',
          sizeClasses[size],
          generateGradient(name),
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <OptimizedImage
        src={src}
        alt={`${name} avatar`}
        width={sizePixels[size]}
        height={sizePixels[size]}
        category="avatars"
        quality={0.9}
        format="webp"
        className="w-full h-full rounded-full object-cover"
        fallbackSrc={`data:image/svg+xml;base64,${btoa(
          `<svg width="${sizePixels[size]}" height="${sizePixels[size]}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#e5e7eb"/>
            <text x="50%" y="50%" font-family="system-ui" font-size="${sizePixels[size] / 3}" text-anchor="middle" dy=".3em" fill="#6b7280">${initials}</text>
          </svg>`
        )}`}
      />
    </div>
  );
};

export default OptimizedImage;
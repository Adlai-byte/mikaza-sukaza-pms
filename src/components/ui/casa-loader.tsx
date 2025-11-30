import React from 'react';
import { cn } from '@/lib/utils';

interface CasaLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CasaLoader({ className, size = 'md' }: CasaLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative animate-spin", sizeClasses[size])}>
        {/* Casa logo stylized as loading spinner */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>

        {/* Inner C symbol */}
        <div className="absolute inset-2 flex items-center justify-center">
          <div className="text-primary font-bold text-lg leading-none">C</div>
        </div>
      </div>
    </div>
  );
}

export function CasaSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <CasaLoader size="lg" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  );
}

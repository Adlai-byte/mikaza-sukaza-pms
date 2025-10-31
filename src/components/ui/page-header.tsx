import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /**
   * The main title text to display
   */
  title: string;
  /**
   * Optional subtitle/description text
   */
  subtitle?: string;
  /**
   * Optional icon to display beside the title
   */
  icon?: LucideIcon;
  /**
   * Optional action buttons or elements to display on the right side
   */
  actions?: ReactNode;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Additional CSS classes for the title
   */
  titleClassName?: string;
  /**
   * Size of the icon (default: 7 which equals h-7 w-7)
   */
  iconSize?: number;
}

/**
 * Standardized page header component used across all module pages.
 * Provides consistent typography, spacing, and layout for page titles.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title={t('properties.title')}
 *   subtitle={t('properties.subtitle')}
 *   icon={Home}
 *   actions={
 *     <>
 *       <Button onClick={handleRefresh} variant="outline">
 *         <RefreshCw className="mr-2 h-4 w-4" />
 *         Refresh
 *       </Button>
 *       <Button onClick={handleCreate}>
 *         <Plus className="mr-2 h-4 w-4" />
 *         New Property
 *       </Button>
 *     </>
 *   }
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
  titleClassName,
  iconSize = 7,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <div className="space-y-1">
        <h1
          className={cn(
            'text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2',
            titleClassName
          )}
        >
          {Icon && (
            <Icon
              className={cn(`h-${iconSize} w-${iconSize} text-primary flex-shrink-0`)}
              aria-hidden="true"
            />
          )}
          <span>{title}</span>
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

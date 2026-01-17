import { Card, CardContent } from "@/components/ui/card";
import { FileText, Archive, AlertTriangle, HardDrive } from "lucide-react";
import { useDocumentStats } from "@/hooks/useDocuments";
import { CasaSpinner } from "@/components/ui/casa-loader";

interface DocumentStatsProps {
  category?: string;
}

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export function DocumentStats({ category }: DocumentStatsProps) {
  const { stats, isLoading } = useDocumentStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-20">
                <CasaSpinner />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Filter stats by category if provided
  const categoryStats = category
    ? stats.find(s => s.category === category)
    : null;

  // Calculate totals across all categories
  const totalDocuments = stats.reduce((sum, s) => sum + s.total_documents, 0);
  const totalActive = stats.reduce((sum, s) => sum + s.active_documents, 0);
  const totalExpiring = stats.reduce((sum, s) => sum + s.expiring_soon, 0);
  const totalStorage = stats.reduce((sum, s) => sum + s.total_storage_bytes, 0);

  // Use category-specific stats if available, otherwise use totals
  const displayStats = categoryStats || {
    total_documents: totalDocuments,
    active_documents: totalActive,
    expiring_soon: totalExpiring,
    total_storage_bytes: totalStorage,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Documents */}
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-semibold">{displayStats.total_documents}</h3>
                {categoryStats && (
                  <span className="text-xs text-muted-foreground">
                    {categoryStats.current_versions} current versions
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Documents */}
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
              <Archive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Active Documents</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-semibold">{displayStats.active_documents}</h3>
                {categoryStats && (
                  <span className="text-xs text-muted-foreground">
                    {categoryStats.total_documents - categoryStats.active_documents} inactive
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Soon */}
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-semibold">{displayStats.expiring_soon}</h3>
                <span className="text-xs text-muted-foreground">Within 30 days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Used */}
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-semibold">{formatBytes(displayStats.total_storage_bytes)}</h3>
                {categoryStats && categoryStats.total_documents > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(categoryStats.avg_file_size_bytes)} avg
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

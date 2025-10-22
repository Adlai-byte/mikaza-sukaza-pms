import { Card, CardContent } from "@/components/ui/card";
import { FileText, Archive, AlertTriangle, HardDrive } from "lucide-react";
import { useDocumentStats } from "@/hooks/useDocuments";
import { MikasaSpinner } from "@/components/ui/mikasa-loader";

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
                <MikasaSpinner />
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
      <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Documents</p>
              <h3 className="text-3xl font-bold text-blue-900 mt-1">
                {displayStats.total_documents}
              </h3>
              {categoryStats && (
                <p className="text-xs text-blue-600 mt-1">
                  {categoryStats.current_versions} current versions
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Documents */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Active Documents</p>
              <h3 className="text-3xl font-bold text-green-900 mt-1">
                {displayStats.active_documents}
              </h3>
              {categoryStats && (
                <p className="text-xs text-green-600 mt-1">
                  {categoryStats.total_documents - categoryStats.active_documents} inactive
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Archive className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Soon */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Expiring Soon</p>
              <h3 className="text-3xl font-bold text-orange-900 mt-1">
                {displayStats.expiring_soon}
              </h3>
              <p className="text-xs text-orange-600 mt-1">
                Within 30 days
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Used */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Storage Used</p>
              <h3 className="text-3xl font-bold text-purple-900 mt-1">
                {formatBytes(displayStats.total_storage_bytes)}
              </h3>
              {categoryStats && categoryStats.total_documents > 0 && (
                <p className="text-xs text-purple-600 mt-1">
                  {formatBytes(categoryStats.avg_file_size_bytes)} avg
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <HardDrive className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

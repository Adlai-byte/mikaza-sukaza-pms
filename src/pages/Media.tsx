import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Trash2,
  Star,
  Grid3x3,
  List,
  Loader2,
  HardDrive,
  Image,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  useMedia,
  useDeleteMedia,
  useBulkDeleteMedia,
  useSetPrimaryImage,
  useStorageSize,
  formatBytes,
} from "@/hooks/useMedia";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { MediaUploadDialog } from "@/components/media/MediaUploadDialog";
import { PropertyImageWithDetails, MediaFilters } from "@/lib/schemas";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";

export default function Media() {
  const { t } = useTranslation();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [showPrimaryOnly, setShowPrimaryOnly] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [imageToDelete, setImageToDelete] =
    useState<PropertyImageWithDetails | null>(null);

  const { properties } = usePropertiesOptimized();
  const deleteMutation = useDeleteMedia();
  const bulkDeleteMutation = useBulkDeleteMedia();
  const setPrimaryMutation = useSetPrimaryImage();
  const { data: storageStats, isLoading: storageLoading } = useStorageSize();

  const filters: MediaFilters = useMemo(
    () => ({
      property_id: selectedProperty !== "all" ? selectedProperty : undefined,
      search: searchTerm || undefined,
      is_primary: showPrimaryOnly || undefined,
    }),
    [selectedProperty, searchTerm, showPrimaryOnly],
  );

  const {
    data: media = [],
    isLoading,
    refetch,
    isFetching,
  } = useMedia(filters);

  const handleSelectImage = (imageId: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedImages.size === media.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(media.map((img) => img.image_id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size > 0) {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedImages));
      setSelectedImages(new Set());
    }
  };

  const handleSetPrimary = async (imageId: string, propertyId: string) => {
    await setPrimaryMutation.mutateAsync({ imageId, propertyId });
  };

  const handleDownloadImage = (imageUrl: string, title: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = title || "image";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteConfirm = async () => {
    if (imageToDelete) {
      await deleteMutation.mutateAsync(imageToDelete.image_id);
      setImageToDelete(null);
    }
  };

  const stats = useMemo(
    () => ({
      total: media.length,
      primary: media.filter((img) => img.is_primary).length,
      properties: new Set(media.map((img) => img.property_id)).size,
    }),
    [media],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t("media.title")}
        subtitle={t("media.subtitle")}
        icon={ImageIcon}
        actions={
          <>
            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Images
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  {t("media.stats.totalImages")}
                </p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {stats.total}
                </h3>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">
                  {t("media.stats.primaryImages")}
                </p>
                <h3 className="text-3xl font-bold text-yellow-900 mt-1">
                  {stats.primary}
                </h3>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">
                  {t("media.stats.properties")}
                </p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {stats.properties}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {t("media.stats.withMedia")}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">
                  {t("media.stats.storageUsed")}
                </p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {storageLoading
                    ? "..."
                    : formatBytes(storageStats?.totalSize || 0)}
                </h3>
                <p className="text-xs text-purple-600 mt-1">
                  {storageLoading
                    ? "Loading..."
                    : `${storageStats?.fileCount || 0} files`}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("media.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Property Filter */}
            <Select
              value={selectedProperty}
              onValueChange={setSelectedProperty}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("media.filters.allProperties")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("media.filters.allProperties")}
                </SelectItem>
                {properties.map((property) => (
                  <SelectItem
                    key={property.property_id}
                    value={property.property_id}
                  >
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Primary Filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="primary-only"
                checked={showPrimaryOnly}
                onCheckedChange={(checked) => setShowPrimaryOnly(!!checked)}
              />
              <label
                htmlFor="primary-only"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Primary images only
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedImages.size > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedImages.size === media.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedImages.size} {t("media.bulkActions.selected")}{" "}
                  {media.length}
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Grid/List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("media.library.title")}</CardTitle>
              <CardDescription>
                {media.length} {t("media.library.images")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">
                {t("media.emptyState.noImages")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {selectedProperty !== "all" || searchTerm
                  ? "Try adjusting your filters"
                  : "Get started by uploading your first property image"}
              </p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Images
              </Button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "space-y-3"
              }
            >
              {media.map((image) => (
                <div
                  key={image.image_id}
                  className={`group relative rounded-lg border overflow-hidden ${
                    viewMode === "grid"
                      ? "aspect-square"
                      : "flex items-center gap-4 p-4"
                  } ${selectedImages.has(image.image_id) ? "ring-2 ring-blue-500" : ""}`}
                >
                  {/* Selection Checkbox */}
                  <div
                    className={`absolute ${viewMode === "grid" ? "top-2 left-2" : "left-4"} z-10`}
                  >
                    <Checkbox
                      checked={selectedImages.has(image.image_id)}
                      onCheckedChange={() => handleSelectImage(image.image_id)}
                      className="bg-white"
                    />
                  </div>

                  {/* Primary Badge */}
                  {image.is_primary && (
                    <div
                      className={`absolute ${viewMode === "grid" ? "top-2 right-2" : "right-4 top-4"} z-10`}
                    >
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Primary
                      </Badge>
                    </div>
                  )}

                  {/* Image */}
                  {viewMode === "grid" ? (
                    <img
                      src={image.image_url}
                      alt={image.image_title || t("media.actions.untitled")}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={image.image_url}
                      alt={image.image_title || t("media.actions.untitled")}
                      className="w-24 h-24 object-cover rounded flex-shrink-0"
                    />
                  )}

                  {/* Info & Actions Overlay */}
                  <div
                    className={`${
                      viewMode === "grid"
                        ? "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3"
                        : "flex-1 min-w-0"
                    }`}
                  >
                    <div className="space-y-2">
                      <div>
                        <h4
                          className={`font-medium truncate ${viewMode === "grid" ? "text-white" : ""}`}
                        >
                          {image.image_title || t("media.actions.untitled")}
                        </h4>
                        {image.property && (
                          <p
                            className={`text-sm truncate ${viewMode === "grid" ? "text-gray-300" : "text-muted-foreground"}`}
                          >
                            {image.property.property_name}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleDownloadImage(
                              image.image_url,
                              image.image_title || "image",
                            )
                          }
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {!image.is_primary && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleSetPrimary(
                                image.image_id,
                                image.property_id,
                              )
                            }
                            disabled={setPrimaryMutation.isPending}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setImageToDelete(image)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <MediaUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        defaultPropertyId={
          selectedProperty !== "all" ? selectedProperty : undefined
        }
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!imageToDelete}
        onOpenChange={() => setImageToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("media.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("media.deleteDialog.description", {
                title: imageToDelete?.image_title,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("media.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ArrowRight,
  RefreshCw,
  FileCheck,
} from "lucide-react";
import { useCOIDashboardStats } from "@/hooks/useCOIDashboardStats";
import { useExpiringCOIs } from "@/hooks/useVendorCOIs";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";

export function COIDashboardWidget() {
  const navigate = useNavigate();
  const { data: stats, isLoading, refetch } = useCOIDashboardStats();
  const { data: expiringCOIs = [] } = useExpiringCOIs(30);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* COI Stats Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Insurance Compliance (COI)
            </h2>
            <p className="text-sm text-muted-foreground">Vendor certificate of insurance tracking</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh COI data</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active COIs */}
          <Card
            className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            onClick={() => navigate('/vendor-cois?status=active')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Active COIs</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-1">
                    {isLoading ? '...' : stats?.active_cois || 0}
                  </h3>
                  <p className="text-xs text-green-600 mt-1">Current & valid</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expiring Soon */}
          <Card
            className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            onClick={() => navigate('/vendor-cois?status=expiring_soon')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Expiring Soon</p>
                  <h3 className="text-3xl font-bold text-yellow-900 mt-1">
                    {isLoading ? '...' : stats?.expiring_soon || 0}
                  </h3>
                  <p className="text-xs text-yellow-600 mt-1">Within 30 days</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expired COIs */}
          <Card
            className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            onClick={() => navigate('/vendor-cois?status=expired')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Expired</p>
                  <h3 className="text-3xl font-bold text-red-900 mt-1">
                    {isLoading ? '...' : stats?.expired_cois || 0}
                  </h3>
                  <p className="text-xs text-red-600 mt-1">Requires renewal</p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vendors with COIs */}
          <Card
            className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            onClick={() => navigate('/vendor-cois')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Vendors Covered</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">
                    {isLoading ? '...' : stats?.vendors_with_cois || 0}
                  </h3>
                  <p className="text-xs text-blue-600 mt-1">With insurance</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expiring COIs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span>COIs Expiring Soon</span>
            </CardTitle>
            <CardDescription>Certificates requiring renewal in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {expiringCOIs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-20 text-green-500" />
                <p className="text-sm font-medium text-green-600">All COIs are current</p>
                <p className="text-xs text-muted-foreground mt-1">No certificates expiring in the next 30 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiringCOIs.slice(0, 5).map((coi) => {
                  const daysUntilExpiry = differenceInDays(
                    parseISO(coi.valid_through),
                    new Date()
                  );
                  const urgency = daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 15 ? 'high' : 'medium';

                  return (
                    <div
                      key={coi.coi_id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        urgency === 'critical'
                          ? 'bg-red-50 border-red-200 hover:bg-red-100'
                          : urgency === 'high'
                          ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                          : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            urgency === 'critical'
                              ? 'bg-red-500'
                              : urgency === 'high'
                              ? 'bg-orange-500'
                              : 'bg-yellow-500'
                          }`}
                        >
                          <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {coi.vendor_name}
                          </p>
                          <Badge
                            variant={urgency === 'critical' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {coi.coverage_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {format(parseISO(coi.valid_through), 'MMM dd, yyyy')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              urgency === 'critical'
                                ? 'destructive'
                                : urgency === 'high'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {daysUntilExpiry} days left
                          </Badge>
                          {!coi.alert_sent && (
                            <Badge variant="outline" className="text-xs">
                              Alert pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {expiringCOIs.length > 5 && (
                  <div className="pt-2 flex items-center justify-between border-t">
                    <p className="text-xs text-muted-foreground">
                      +{expiringCOIs.length - 5} more expiring
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/vendor-cois?status=expiring_soon')}
                        >
                          View All
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>See all expiring COIs</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="w-full mt-4 bg-gradient-primary hover:bg-gradient-secondary"
                      onClick={() => navigate('/vendor-cois')}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Vendor COIs
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View and manage all vendor insurance certificates</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

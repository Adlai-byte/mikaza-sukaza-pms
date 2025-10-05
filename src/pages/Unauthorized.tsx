/**
 * Unauthorized Page
 * Displayed when user tries to access a route without proper permissions
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

export default function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { getRoleInfo } = usePermissions();

  const roleInfo = getRoleInfo();
  const attemptedPath = (location.state as any)?.from?.pathname || 'this page';

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-3xl">Access Denied</CardTitle>
          <CardDescription className="text-lg">
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Permission Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              Access Details
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Role:</span>
                <span className="font-medium">{roleInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User:</span>
                <span className="font-medium">
                  {profile?.first_name} {profile?.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attempted Access:</span>
                <span className="font-medium">{attemptedPath}</span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <h3 className="font-semibold">Why can't I access this?</h3>
            <p className="text-sm text-muted-foreground">
              The page you're trying to access requires permissions that your current role
              (<strong>{roleInfo.name}</strong>) doesn't have. This is normal and helps
              protect sensitive data and system functionality.
            </p>
          </div>

          {/* What to do */}
          <div className="space-y-2">
            <h3 className="font-semibold">What can I do?</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Contact your system administrator if you believe you should have access</li>
              <li>Navigate back to your previous page</li>
              <li>Return to the dashboard to continue your work</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="flex-1 bg-gradient-primary hover:bg-gradient-secondary"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground pt-4 border-t">
            If you consistently encounter this issue, please contact your system administrator
            to review your account permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

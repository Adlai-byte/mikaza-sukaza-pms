import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export function SessionTimeoutWarning() {
  const { t } = useTranslation();
  const { sessionTimeoutWarning, extendSession, remainingTime, signOut } = useAuth();

  // Format remaining time as mm:ss
  const formatTime = (ms: number | null): string => {
    if (ms === null || ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AlertDialog open={sessionTimeoutWarning}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            {t('sessionTimeout.title', 'Session Expiring Soon')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {t('sessionTimeout.description', 'Your session will expire due to inactivity. Would you like to stay signed in?')}
            </p>
            <div className="flex items-center justify-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-3xl font-mono font-bold text-amber-700">
                {formatTime(remainingTime)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t('sessionTimeout.autoSignOut', 'You will be automatically signed out when the timer reaches zero.')}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t('sessionTimeout.signOut', 'Sign Out Now')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={extendSession} className="bg-primary">
            {t('sessionTimeout.staySignedIn', 'Stay Signed In')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

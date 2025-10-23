import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, User, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Check if this is a valid password reset session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ [RESET] Session check error:', error);
          setIsValidSession(false);
          setCheckingSession(false);
          return;
        }

        // Check if we have a session (user clicked the reset link)
        if (session) {
          console.log('✅ [RESET] Valid reset session detected');
          setIsValidSession(true);
        } else {
          console.warn('⚠️ [RESET] No valid session found');
          setIsValidSession(false);
          toast({
            title: "Invalid Reset Link",
            description: "This password reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });

          // Redirect to auth page after 3 seconds
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
        }
      } catch (error) {
        console.error('❌ [RESET] Error checking session:', error);
        setIsValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidSession) {
      toast({
        title: "Invalid Session",
        description: "Please use the password reset link from your email.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedData = resetPasswordSchema.parse(form);
      setLoading(true);

      console.log('🔐 [RESET] Password reset attempt:', {
        timestamp: new Date().toISOString()
      });

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: validatedData.password
      });

      if (error) {
        console.error('❌ [RESET] Password reset failed:', {
          error: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString()
        });

        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ [RESET] Password reset successful:', {
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You will be redirected to the login page.",
      });

      // Sign out the user and redirect to login
      await supabase.auth.signOut();

      setTimeout(() => {
        navigate('/auth');
      }, 2000);

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('❌ [RESET] Password reset error:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        {/* Enhanced gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, hsl(258, 75%, 35%) 0%, hsl(280, 85%, 25%) 100%)'
          }}
        ></div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/5 blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full bg-white/5 blur-3xl animate-pulse delay-500 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-sm font-light">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error state if invalid session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        {/* Enhanced gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, hsl(258, 75%, 35%) 0%, hsl(280, 85%, 25%) 100%)'
          }}
        ></div>

        <div className="relative z-10 w-full max-w-md">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="text-red-300 w-8 h-8" />
              </div>
              <h2 className="text-xl font-light text-white mb-2">Invalid Reset Link</h2>
              <p className="text-white/70 text-sm mb-4">
                This password reset link is invalid or has expired.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                Return to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Enhanced gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, hsl(258, 75%, 35%) 0%, hsl(280, 85%, 25%) 100%)'
        }}
      ></div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/5 blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full bg-white/5 blur-3xl animate-pulse delay-500 transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 border border-white/30 rotate-45 rounded-lg animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 border border-white/30 rotate-12 rounded-lg animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 border border-white/30 -rotate-12 rounded-lg animate-pulse delay-300"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Enhanced Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <User className="text-white w-8 h-8" />
            </div>
            <h1 className="text-4xl font-light text-white tracking-wide">Casa & Concierge</h1>
          </div>
          <p className="text-white/80 text-sm font-light">Property Management System</p>
        </div>

        {/* Reset Password Form */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-6 pt-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-green-300 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-light text-white mb-2">
              Create New Password
            </h2>
            <p className="text-white/70 text-sm">
              Enter your new password below
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90 font-light text-sm">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="bg-white/95 border-0 text-gray-900 placeholder:text-gray-400 h-12 pl-10 pr-12 focus:bg-white transition-all"
                    placeholder="Enter new password (min 6 characters)"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/90 font-light text-sm">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="bg-white/95 border-0 text-gray-900 placeholder:text-gray-400 h-12 pl-10 pr-12 focus:bg-white transition-all"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <p className="text-white/80 text-xs mb-2">Password requirements:</p>
                <ul className="text-white/70 text-xs space-y-1 list-disc list-inside">
                  <li>At least 6 characters long</li>
                  <li>Both passwords must match</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent text-accent-foreground font-medium text-base border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-white/70 hover:text-white text-sm underline font-light"
                  onClick={() => navigate('/auth')}
                >
                  Back to Sign In
                </button>
              </div>
            </form>

            <div className="text-center">
              <p className="text-white/50 text-xs font-light">
                Secure authentication powered by Supabase
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

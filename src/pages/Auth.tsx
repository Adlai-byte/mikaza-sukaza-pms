import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { signIn, signUp, signOut, user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  useEffect(() => {
    // Redirect to dashboard when authenticated
    if (user || profile) {
      navigate('/', { replace: true });
      return;
    }

    // Note: We rely on browser autocomplete for email instead of localStorage
    // to comply with GDPR (no PII stored in localStorage)
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = loginSchema.parse(loginForm);
      setLoading(true);

      console.log('🔐 [AUTH] Login attempt:', {
        timestamp: new Date().toISOString()
      });

      const { error, data } = await signIn(validatedData.email, validatedData.password);

      console.log('📊 [AUTH] Login response:', {
        success: !error,
        hasUser: !!data?.user,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('❌ [AUTH] Login failed:', {
          error: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString()
        });

        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please check your credentials and try again.",
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email Not Verified",
            description: "Please check your email and click the verification link before signing in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      // Check if email is verified (Supabase returns user even if not verified)
      if (data?.user && !data.user.email_confirmed_at) {
        console.warn('⚠️ [AUTH] Email not verified:', {
          userId: data.user.id,
          timestamp: new Date().toISOString()
        });

        await signOut();
        toast({
          title: "Email Not Verified",
          description: "Please verify your email before signing in. Check your inbox for the verification link.",
          variant: "destructive",
        });
        return;
      }

      // Note: "Remember Me" is handled by browser autocomplete (GDPR compliant)
      // No PII is stored in localStorage

      console.log('✅ [AUTH] Login successful:', {
        userId: data?.user?.id,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      // Navigation will be handled by useEffect
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Login error:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred during login",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!loginForm.email) {
      console.warn('⚠️ [AUTH] Resend verification attempted without email');
      toast({
        title: "Email Required",
        description: "Please enter your email address to resend the verification link.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedEmail = loginSchema.pick({ email: true }).parse({ email: loginForm.email });
      setIsResendingEmail(true);

      console.log('📧 [AUTH] Resending verification email:', {
        timestamp: new Date().toISOString()
      });

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: validatedEmail.email,
      });

      if (error) {
        console.error('❌ [AUTH] Resend verification failed:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        toast({
          title: "Resend Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ [AUTH] Verification email resent successfully:', {
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox for the verification link. If you don't see it, check your spam folder.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ [AUTH] Validation error on resend:', error.errors);
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      } else {
        console.error('❌ [AUTH] Resend verification error:', error);
        toast({
          title: "Error",
          description: "Failed to resend verification email. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedEmail = loginSchema.pick({ email: true }).parse({ email: resetEmail });
      setIsResettingPassword(true);

      console.log('🔐 [AUTH] Password reset requested:', {
        timestamp: new Date().toISOString()
      });

      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('❌ [AUTH] Password reset failed:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ [AUTH] Password reset email sent:', {
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Reset Email Sent",
        description: "Please check your inbox for the password reset link. If you don't see it, check your spam folder.",
      });

      // Switch back to login mode after successful request
      setIsForgotPassword(false);
      setResetEmail("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ [AUTH] Validation error on password reset:', error.errors);
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      } else {
        console.error('❌ [AUTH] Password reset error:', error);
        toast({
          title: "Error",
          description: "Failed to send password reset email. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

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

        {/* Enhanced Login Form */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-6 pt-8">
            <h2 className="text-2xl font-light text-white mb-2">
              {isForgotPassword ? "Reset Password" : "Welcome Back"}
            </h2>
            <p className="text-white/70 text-sm">
              {isForgotPassword
                ? "Enter your email to receive a password reset link"
                : "Sign in to access your dashboard"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-white/90 font-light text-sm">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="reset-email"
                      name="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="bg-white/95 border-0 text-gray-900 placeholder:text-gray-400 h-12 pl-10 focus:bg-white transition-all"
                      placeholder="Enter your email"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent text-accent-foreground font-medium text-base border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-white/70 hover:text-white text-sm underline font-light"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetEmail("");
                    }}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90 font-light text-sm">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="bg-white/95 border-0 text-gray-900 placeholder:text-gray-400 h-12 pl-10 focus:bg-white transition-all"
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90 font-light text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="bg-white/95 border-0 text-gray-900 placeholder:text-gray-400 h-12 pl-10 pr-12 focus:bg-white transition-all"
                    placeholder="Enter your password"
                    autoComplete="current-password"
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

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-white/70 hover:text-white text-sm underline font-light"
                  onClick={() => setIsForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent text-accent-foreground font-medium text-base border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>

              <div className="text-center mt-4">
                <p className="text-white/60 text-xs">
                  Don't have an account? Contact your administrator.
                </p>
              </div>

              <div className="text-center mt-2">
                <Button
                  type="button"
                  variant="link"
                  className="text-white/70 hover:text-white text-xs underline font-light"
                  onClick={handleResendVerification}
                  disabled={isResendingEmail}
                >
                  {isResendingEmail ? "Sending..." : "Resend Verification Email"}
                </Button>
              </div>
            </form>
            )}

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

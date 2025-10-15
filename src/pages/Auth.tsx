import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUsersOptimized } from "@/hooks/useUsersOptimized";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const { signIn, signUp, user, profile, sessionLogin } = useAuth();
  const { users, loading: usersLoading } = useUsersOptimized();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    console.log('🔍 Auth.tsx useEffect - Checking authentication state:', {
      hasUser: !!user,
      hasProfile: !!profile,
      userEmail: user?.email || profile?.email || 'none'
    });

    // Redirect to dashboard when authenticated (check both user and profile for session mode)
    if (user || profile) {
      console.log('✅ User authenticated, navigating to dashboard...', { user, profile });
      navigate('/', { replace: true });
      return; // Early return to prevent loading saved credentials after navigation
    }

    // Load saved credentials if remember me was checked (only if not authenticated)
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';

    if (savedEmail && savedRememberMe) {
      console.log('📧 Loading saved email from localStorage');
      setLoginForm(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, [user, profile, navigate]);

  const handleSessionLogin = async (userFromDB: any) => {
    console.log('🚀 handleSessionLogin called with user:', userFromDB.email);
    setLoading(true);
    try {
      console.log('📞 Calling sessionLogin...');
      await sessionLogin(userFromDB);
      console.log('✅ sessionLogin completed successfully');

      toast({
        title: "Session login successful",
        description: `Logged in as ${userFromDB.first_name} ${userFromDB.last_name}`,
      });

      console.log('📍 Waiting for useEffect to handle navigation...');
      // Navigation will be handled by useEffect after profile state updates
    } catch (error) {
      console.error('❌ Session login error:', error);
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('🏁 handleSessionLogin finished');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = loginSchema.parse(loginForm);
      setLoading(true);

      console.log('🔐 Attempting login with email:', validatedData.email);

      // In session mode (AUTH_ENABLED = false), we need to find the user in the database
      // and call sessionLogin instead of signIn
      const matchingUser = users.find(u => u.email === validatedData.email && u.is_active);

      if (matchingUser) {
        console.log('✅ Found matching user in database, using session login');
        await handleSessionLogin(matchingUser);

        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', validatedData.email);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberMe');
        }

        return; // handleSessionLogin will handle navigation
      }

      // If no matching user found, try regular Supabase auth (for when AUTH_ENABLED = true)
      console.log('⚠️ No matching user found in database, trying Supabase auth');
      const { error } = await signIn(validatedData.email, validatedData.password);

      if (error) {
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

      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', validatedData.email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }

      console.log('Login successful, navigating to dashboard');
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
        console.error('❌ Login error:', error);
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
            <h1 className="text-4xl font-light text-white tracking-wide">mikazasukaza</h1>
          </div>
          <p className="text-white/80 text-sm font-light">Property Management System</p>
        </div>

        {/* Enhanced Login Form */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-6 pt-8">
            <h2 className="text-2xl font-light text-white mb-2">Welcome Back</h2>
            <p className="text-white/70 text-sm">Sign in to access your dashboard</p>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-white/80 text-sm font-light cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                
                <button
                  type="button"
                  className="text-white/70 hover:text-white text-sm underline font-light"
                >
                  Forgot password?
                </button>
              </div>

              {/* Session Login Toggle */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUserList(!showUserList)}
                  className="w-full mb-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  {showUserList ? "Hide" : "Show"} Available Users (Session Mode)
                </Button>
              </div>

              {/* Available Users List */}
              {showUserList && (
                <Card className="mb-4 bg-white/10 border-white/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Available Users</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                    {usersLoading ? (
                      <p className="text-white/70 text-sm">Loading users...</p>
                    ) : users.length === 0 ? (
                      <p className="text-white/70 text-sm">No users found. Create users in User Management first.</p>
                    ) : (
                      users.filter(u => u.is_active).map((user) => (
                        <div key={user.user_id} className="flex items-center justify-between p-2 border border-white/20 rounded-lg bg-white/5">
                          <div className="flex-1">
                            <p className="font-medium text-white">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-white/70">{user.email}</p>
                            <p className="text-xs text-white/60 capitalize">{user.user_type}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSessionLogin(user)}
                            disabled={loading}
                            className="bg-accent hover:bg-accent-hover text-accent-foreground"
                          >
                            Login as User
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent text-accent-foreground font-medium text-base border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]" 
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full h-12 mt-3"
                disabled={loading}
                onClick={async () => {
                  try {
                    const validatedData = loginSchema.parse(loginForm);
                    setLoading(true);
                    const { error } = await signUp(validatedData.email, validatedData.password);
                    if (error) {
                      if (error.message?.includes("already registered")) {
                        toast({
                          title: "Account exists",
                          description: "You already have an account. Please sign in.",
                          variant: "default",
                        });
                      } else {
                        toast({
                          title: "Sign up failed",
                          description: error.message,
                          variant: "destructive",
                        });
                      }
                      return;
                    }
                    toast({
                      title: "Check your email",
                      description: "We sent you a confirmation link to complete your signup.",
                    });
                  } catch (err) {
                    if (err instanceof z.ZodError) {
                      toast({
                        title: "Validation Error",
                        description: err.errors[0].message,
                        variant: "destructive",
                      });
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? "Processing..." : "Create account"}
              </Button>
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
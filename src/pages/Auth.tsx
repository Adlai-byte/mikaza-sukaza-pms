import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = loginSchema.parse(loginForm);
      setLoading(true);

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

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Purple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600"></div>
      
      {/* Geometric overlay pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-64 h-64 border border-white/20 rotate-45 rounded-lg"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 border border-white/20 rotate-12 rounded-lg"></div>
        <div className="absolute top-1/2 left-10 w-32 h-32 border border-white/20 -rotate-12 rounded-lg"></div>
        <div className="absolute bottom-1/3 left-1/3 w-40 h-40 border border-white/20 rotate-45 rounded-lg"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 border-2 border-white rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <h1 className="text-3xl font-normal text-white">mikazasukaza</h1>
          </div>
        </div>

        {/* Login Form */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <h2 className="text-2xl font-normal text-white">Login</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90 font-normal">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="bg-white border-0 text-gray-900 placeholder:text-gray-500 h-12"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90 font-normal">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="bg-white border-0 text-gray-900 placeholder:text-gray-500 h-12 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 hover:text-gray-700"
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

              <div className="text-right">
                <button
                  type="button"
                  className="text-white/80 hover:text-white text-sm underline"
                >
                  Forgot your password?
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-medium text-base border-0 shadow-lg" 
                disabled={loading}
              >
                {loading ? "Signing In..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
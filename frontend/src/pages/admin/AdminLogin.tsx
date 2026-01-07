import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AuthLayout } from "@/components/AuthLayout";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email.toLowerCase().trim(), password);

      if (!result.success) {
        toast.error(result.error || "Login failed");
        return;
      }

      // Check if user has admin role
      if (result.user?.role !== "ADMIN") {
        // Logout the user if they're not admin
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        toast.error("Access denied. You must be an admin to login here.");
        return;
      }

      toast.success("Welcome back, Admin!");
      navigate("/admin/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Admin Area</p>
          <h1 className="text-3xl font-bold">Welcome to the Team 👋</h1>
          <p className="text-muted-foreground">
            Kindly fill in your details below to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Faizan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link 
              to="/admin/forgot-password" 
              className="text-sm text-foreground hover:underline"
            >
              Reset Password
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-lg font-semibold"
            disabled={loading}
            variant="accent"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * AdminProtectedRoute - Ensures user is authenticated AND has admin role
 * Shows loading state until auth check completes, then redirects if not authenticated or not admin
 */
export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Wait for auth check to complete
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check if user has admin role (case-insensitive check for ADMIN, admin, etc.)
  const userRole = user.role?.toUpperCase();
  const isAdmin = userRole === "ADMIN";

  // Redirect to admin login if not admin
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Render children if authenticated and admin
  return <>{children}</>;
};

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, MoreVertical, Eye, Ban, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminUsers, type AdminUser } from "@/hooks/useAdminUsers";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminUsers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: users, isLoading, error } = useAdminUsers();

  if (error) {
    console.error("Error loading users:", error);
  }

  const filteredUsers = users?.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query)
    );
  }) || [];

  const getStatusBadge = (user: AdminUser) => {
    // Check if user is blocked (verified: false)
    // Only show Blocked if explicitly verified === false (strict equality check)
    if (user.verified === false) {
      return <Badge className="bg-red-500 text-white border-0 rounded-full px-3 py-0.5 text-xs font-medium">Blocked</Badge>;
    }
    
    // For non-blocked users, show Online/Offline based on last_sign_in_at
    // If user has last_sign_in_at, check if they're online (signed in within last hour)
    if (user.last_sign_in_at) {
      const lastSignInDate = new Date(user.last_sign_in_at);
      const hoursSinceLastSignIn = (Date.now() - lastSignInDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSignIn < 1) {
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30 rounded-full px-3 py-0.5 text-xs font-medium">Online</Badge>;
      }
    }
    
    // Default to Offline for users without recent sign-in
    return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 rounded-full px-3 py-0.5 text-xs font-medium">Offline</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleBlockUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to block user "${userName}"?`)) {
      return;
    }

    try {
      console.log(`Blocking user ${userId}: ${userName}`);
      // Try to update user's verified status to false (blocked)
      const response = await apiClient.updateUser(userId, { verified: false });
      
      console.log('Block user response:', response);
      
      if (!response.success) {
        // If backend doesn't support blocking, show a message
        if (response.error?.includes('verified') || response.error?.includes('Unknown')) {
          toast.info("Backend support for blocking users is being added. This feature will be available soon.");
        } else {
          throw new Error(response.error || "Failed to block user");
        }
        return;
      }

      toast.success(`✓ User "${userName}" has been blocked`, {
        duration: 4000,
        description: "The user's account is now blocked and they cannot access the platform."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to block user");
      console.error("Error blocking user:", error);
    }
  };

  const handleUnblockUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to unblock user "${userName}"?`)) {
      return;
    }

    try {
      console.log(`Unblocking user ${userId}: ${userName}`);
      // Update user's verified status to true (unblocked)
      const response = await apiClient.updateUser(userId, { verified: true });
      
      console.log('Unblock user response:', response);
      
      if (!response.success) {
        throw new Error(response.error || "Failed to unblock user");
      }

      toast.success(`✓ User "${userName}" has been unblocked`, {
        duration: 4000,
        description: "The user's account is now active and they can access the platform."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to unblock user");
      console.error("Error unblocking user:", error);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log(`Deleting user ${userId}: ${userName}`);
      const response = await apiClient.deleteUser(userId);
      
      console.log('Delete user response:', response);
      
      if (!response.success) {
        // Check if error is due to foreign key constraints
        const errorMessage = response.error || '';
        if (errorMessage.includes('violate') || errorMessage.includes('relation') || errorMessage.includes('Chat') || errorMessage.includes('required relation')) {
          toast.error(
            `Cannot delete user "${userName}" because they have associated data (chats, listings, etc.). Please block the user instead or contact the backend team to implement cascading deletes.`,
            { duration: 6000 }
          );
        } else {
          throw new Error(response.error || "Failed to delete user");
        }
        return;
      }

      toast.success(`User "${userName}" has been deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      const errorMessage = error.message || error.toString() || "Failed to delete user";
      
      // Check if error is due to foreign key constraints
      if (errorMessage.includes('violate') || errorMessage.includes('relation') || errorMessage.includes('Chat') || errorMessage.includes('required relation')) {
        toast.error(
          `Cannot delete user "${userName}" because they have associated data (chats, listings, etc.). Please block the user instead.`,
          { duration: 6000 }
        );
      } else {
        toast.error(errorMessage);
      }
      console.error("Error deleting user:", error);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      
      <main className="flex-1">
        <AdminHeader />

        <div className="p-8">
          <div className="mb-6">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-muted"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground">Loading users...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-destructive font-medium">Failed to load users</p>
                <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm">ID</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm">User name</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">Email</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">Phone Number</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">Listings</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">Registration date</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">Verification</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                    {filteredUsers.map((user, index) => (
                      <TableRow 
                        key={user.id}
                        className="border-border hover:bg-muted/5"
                      >
                        <TableCell className="font-medium whitespace-nowrap">{index + 1}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback>
                                  {user.full_name?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              {user.user_type === "seller" && (
                                <div className="absolute -bottom-1 -right-1 bg-accent text-black text-[8px] font-bold px-1 rounded">
                                  Pro
                                </div>
                              )}
                            </div>
                            <span className="font-medium">{user.full_name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap hidden md:table-cell">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap hidden lg:table-cell">{user.phone || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap hidden sm:table-cell">{user.listings_count}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap hidden lg:table-cell">{formatDate(user.created_at)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            {user.phone_confirmed_at && (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-accent" />
                                <span className="text-xs">Phone</span>
                              </div>
                            )}
                            {user.email_confirmed_at && (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-accent" />
                                <span className="text-xs">E-Mail</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getStatusBadge(user)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="hover:bg-[#AEF31F] hover:text-[#000000] transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#AEF31F] border-[#AEF31F] rounded-lg shadow-lg">
                              <DropdownMenuItem 
                                onClick={() => navigate(`/admin/users/${user.id}`)}
                                className="cursor-pointer hover:bg-[#000000] hover:text-[#FFFFFF] rounded-md transition-colors"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                <span className="text-black hover:text-white">View</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer hover:bg-[#000000] hover:text-[#FFFFFF] rounded-md transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (user.verified === false) {
                                    handleUnblockUser(user.id, user.full_name || user.email);
                                  } else {
                                    handleBlockUser(user.id, user.full_name || user.email);
                                  }
                                }}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                <span className="text-black hover:text-white">{user.verified === false ? "Unblock" : "Block"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer text-red-600 hover:bg-[#000000] hover:text-[#FFFFFF] rounded-md transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user.id, user.full_name || user.email);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                <span className="hover:text-white">Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {users?.length || 0}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" disabled>
                      ←
                    </Button>
                    <Button 
                      size="icon"
                      className={currentPage === 1 ? "bg-accent text-black" : ""}
                      onClick={() => setCurrentPage(1)}
                    >
                      1
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setCurrentPage(2)}
                    >
                      2
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setCurrentPage(3)}
                    >
                      3
                    </Button>
                    <Button variant="ghost" size="icon">
                      →
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

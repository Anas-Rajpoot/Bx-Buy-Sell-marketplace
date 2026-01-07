import { useNavigate, useParams } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Settings, MessageSquare, RefreshCw, Trash2, Star, CheckCircle, Edit2, ChevronRight, Loader2 } from "lucide-react";
import { useUserDetails } from "@/hooks/useUserDetails";

export default function AdminUserDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, isLoading } = useUserDetails(id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">User not found</p>
        </main>
      </div>
    );
  }

  const { profile, listingsCount, favoritesCount, chatsCount } = data;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      
      <main className="flex-1">
        <div className="border-b border-border bg-background">
          <div className="flex items-center justify-between px-8 py-4">
            <h1 className="text-2xl font-semibold">User Details</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                🔔
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">Jhonson</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <Button 
            variant="ghost" 
            className="mb-6 text-accent hover:text-accent"
            onClick={() => navigate("/admin/users")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Users
          </Button>

          {/* User Profile Header */}
          <Card className="p-6 mb-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl">JD</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-accent text-black text-xs font-bold px-2 py-0.5 rounded">
                    Pro
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-semibold">{profile.full_name || "Unknown User"}</h2>
                    <CheckCircle className="h-5 w-5 text-accent" />
                  </div>
                  <Badge className="bg-accent/20 text-accent border-accent/30 mt-3">
                    {profile.user_type || "User"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button className="bg-accent text-black hover:bg-accent/90">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" className="border-border">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>

            {/* Verification Badges */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-accent" />
                <span className="text-sm">Email Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-accent" />
                <span className="text-sm">Phone Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-accent" />
                <span className="text-sm">Funds Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-accent" />
                <span className="text-sm">ID Verified</span>
              </div>
            </div>
          </Card>

          {/* Information Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Personal Information */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{profile.full_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-medium">{profile.company_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Nr.</p>
                  <p className="font-medium">{profile.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <p className="font-medium">{profile.website || "-"}</p>
                </div>
              </div>
            </Card>

            {/* Address Information */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Address Information</h3>
                <Button variant="ghost" size="icon">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{profile.location || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bio</p>
                  <p className="font-medium">{profile.bio || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User Type</p>
                  <p className="font-medium capitalize">{profile.user_type || "-"}</p>
                </div>
              </div>
            </Card>
          </div>


          {/* User Stats */}
          <h3 className="text-lg font-semibold mb-4">User Stats</h3>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <Card 
              className="p-6 bg-card border-border cursor-pointer hover:border-accent transition-colors"
              onClick={() => navigate(`/admin/users/${id}/listings`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Users Listings</p>
                  <p className="text-3xl font-bold">{listingsCount}</p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </Card>
            <Card 
              className="p-6 bg-card border-border cursor-pointer hover:border-accent transition-colors"
              onClick={() => navigate(`/admin/users/${id}/favorites`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Users Favorite's</p>
                  <p className="text-3xl font-bold">{favoritesCount}</p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </Card>
            <Card 
              className="p-6 bg-card border-border cursor-pointer hover:border-accent transition-colors"
              onClick={() => navigate(`/admin/users/${id}/chats`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Users Chats</p>
                  <p className="text-3xl font-bold">{chatsCount}</p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}

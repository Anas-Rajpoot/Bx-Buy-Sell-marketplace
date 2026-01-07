import { useNavigate, useParams } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Heart, Share2, Plus, MapPin, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserFavorites } from "@/hooks/useUserFavorites";

export default function AdminUserFavorites() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: favorites, isLoading } = useUserFavorites(id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      
      <main className="flex-1">
        <div className="border-b border-border bg-background">
          <div className="flex items-center justify-between px-8 py-4">
            <h1 className="text-2xl font-semibold">Users Favorites</h1>
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
            onClick={() => navigate(`/admin/users/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            User Details
          </Button>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search" className="pl-10 bg-muted/30 border-muted" />
            </div>
            <Select>
              <SelectTrigger className="w-[180px] bg-muted/30 border-muted">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-10000">$0 - $10,000</SelectItem>
                <SelectItem value="10000-50000">$10,000 - $50,000</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px] bg-muted/30 border-muted">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px] bg-muted/30 border-muted">
                <SelectValue placeholder="Age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="0-2">0-2 years</SelectItem>
                <SelectItem value="2-5">2-5 years</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px] bg-muted/30 border-muted">
                <SelectValue placeholder="Niche" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Niches</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-accent text-black hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Favourites
            </Button>
          </div>

          {/* Listings Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : !favorites || favorites.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No favorites found for this user</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {favorites.map((favorite) => {
                const listing = favorite.listing;
                if (!listing) return null;
                return (
                  <Card key={favorite.id} className="overflow-hidden bg-card border-border">
                    <div className="relative aspect-[4/3] bg-muted">
                      <img 
                        src={listing.image_url || "/placeholder.svg"} 
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                      {listing.managed_by_ex && (
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-accent/90 text-black border-0">
                            🤝 Managed by EX
                          </Badge>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 mt-8">
                        <Badge variant="outline" className="bg-background/90 border-border">
                          {listing.category?.name || "Uncategorized"}
                        </Badge>
                      </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button size="icon" variant="ghost" className="bg-background/90 hover:bg-background">
                      <Heart className="h-4 w-4 fill-destructive text-destructive" />
                    </Button>
                    <Button size="icon" variant="ghost" className="bg-background/90 hover:bg-background">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-2">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {listing.description || "No description available"}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold">{formatPrice(listing.price)}</span>
                        </div>
                        {listing.location && (
                          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                            <span>📍 Location: {listing.location}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 border-border">
                            Open Chat
                          </Button>
                          <Button className="flex-1 bg-accent text-black hover:bg-accent/90">
                            View Listing
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
        </div>
      </main>
    </div>
  );
}

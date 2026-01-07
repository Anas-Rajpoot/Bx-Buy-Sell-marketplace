import { useNavigate, useParams } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MoreVertical, Share2, Calendar, MessageCircle, ExternalLink, Loader2 } from "lucide-react";
import { useUserListings } from "@/hooks/useUserListings";

export default function AdminUserListings() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: listings, isLoading } = useUserListings(id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      
      <main className="flex-1">
        <div className="border-b border-border bg-background">
          <div className="flex items-center justify-between px-8 py-4">
            <h1 className="text-2xl font-semibold">Users Listings</h1>
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

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : !listings || listings.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No listings found for this user</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden bg-card border-border group">
                  <div className="relative aspect-[4/3] bg-muted">
                    <img 
                      src={listing.image_url || "/placeholder.svg"} 
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Show Managed by EX OR Category, not both */}
                    {listing.managed_by_ex ? (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-accent/90 text-black border-0">
                          🤝 Managed by EX
                        </Badge>
                      </div>
                    ) : (
                      <div className="absolute top-3 left-3">
                        <Badge variant="outline" className="bg-background/90 border-border">
                          {listing.category?.name || "Uncategorized"}
                        </Badge>
                      </div>
                    )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button size="icon" variant="ghost" className="bg-background/90 hover:bg-background">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="bg-background/90 hover:bg-background">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{listing.title}</h3>
                      {listing.status === "draft" ? (
                        <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                          Draft
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                          Published
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold mb-3">{formatPrice(listing.price)}</p>
                    {listing.status === "draft" ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
                        <span>📝 Edit or Publish your Listing</span>
                      </p>
                    ) : (
                      <p className="text-sm text-destructive flex items-center gap-2 mb-4">
                        <MessageCircle className="h-4 w-4" />
                        {listing.unread_messages_count || 0} unanswered messages
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created: {formatDate(listing.created_at)}
                      </span>
                      <span>Requests: {listing.requests_count || 0}</span>
                    </div>
                    <div className="flex gap-2">
                      {listing.status === "draft" ? (
                      <>
                        <Button variant="outline" className="flex-1 border-border">
                          Edit
                        </Button>
                        <Button className="flex-1 bg-accent text-black hover:bg-accent/90">
                          Publish
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" className="flex-1 border-border">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Push Listing
                        </Button>
                        <Button className="flex-1 bg-accent text-black hover:bg-accent/90">
                          View Requests
                        </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

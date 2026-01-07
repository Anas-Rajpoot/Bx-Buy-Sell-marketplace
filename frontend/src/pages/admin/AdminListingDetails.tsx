import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Globe, MapPin, DollarSign, TrendingUp, Users, Calendar, Download, Edit, Save, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { z } from "zod";

const listingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  price: z.number().min(0, "Price must be positive"),
  location: z.string().max(100).optional(),
  status: z.enum(["draft", "published", "deleted"]),
  managed_by_ex: z.boolean(),
});

export default function AdminListingDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["admin-listing", id],
    queryFn: async () => {
      console.log('Fetching listing details from backend for ID:', id);
      
      const listingResponse = await apiClient.getListingById(id!);
      
      if (!listingResponse.success) {
        throw new Error(listingResponse.error || 'Failed to fetch listing');
      }
      
      const listingData = listingResponse.data;
      console.log('Listing data from backend:', listingData);
      
      // Extract title from brand questions
      let title = 'Untitled Listing';
      if (listingData.brand && Array.isArray(listingData.brand) && listingData.brand.length > 0) {
        const businessNameQuestion = listingData.brand.find((b: any) => 
          b.question?.toLowerCase().includes('business') || 
          b.question?.toLowerCase().includes('name') ||
          b.question?.toLowerCase().includes('company') ||
          b.question?.toLowerCase().includes('brand')
        );
        if (businessNameQuestion?.answer) {
          title = businessNameQuestion.answer;
        } else if (listingData.brand[0]?.answer) {
          title = listingData.brand[0].answer;
        }
      }
      
      // Normalize status
      let normalizedStatus = listingData.status?.toLowerCase() || 'draft';
      if (normalizedStatus === 'publish') normalizedStatus = 'published';
      
      // Get category info
      const categoryInfo = Array.isArray(listingData.category) && listingData.category.length > 0 
        ? listingData.category[0] 
        : listingData.category || null;
      
      // Fetch user profile
      let profile = null;
      if (listingData.user_id || listingData.userId) {
        try {
          const userResponse = await apiClient.getUserById(listingData.user_id || listingData.userId);
          if (userResponse.success && userResponse.data) {
            const user = userResponse.data;
            profile = {
              id: user.id,
              full_name: user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}`.trim()
                : user.first_name || user.last_name || null,
              avatar_url: user.profile_pic || null,
            };
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      
      return {
        ...listingData,
        id: listingData.id,
        title: title,
        status: normalizedStatus,
        created_at: listingData.created_at || listingData.createdAt || new Date().toISOString(),
        updated_at: listingData.updated_at || listingData.updatedAt || new Date().toISOString(),
        user_id: listingData.user_id || listingData.userId || null,
        category: categoryInfo ? [categoryInfo] : [],
        profile: profile,
      };
    },
    enabled: !!id,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleEdit = () => {
    setEditedData({
      title: listing?.title,
      description: listing?.description,
      price: listing?.price,
      location: listing?.location,
      status: listing?.status,
      managed_by_ex: listing?.managed_by_ex,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleSave = async () => {
    try {
      const validation = listingSchema.safeParse(editedData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSaving(true);
      
      // Normalize status for backend (PUBLISH, DRAFT)
      let backendStatus = editedData.status?.toUpperCase();
      if (backendStatus === 'PUBLISHED') backendStatus = 'PUBLISH';
      if (backendStatus === 'DELETED') backendStatus = 'DRAFT'; // Backend doesn't have DELETED status
      
      const updateData: any = {
        status: backendStatus,
      };
      
      // Note: Backend listing structure is different - it uses brand questions, not direct title/description
      // For now, we'll only update status and other fields that exist in the backend schema
      // Title/description would need to be updated through brand questions if needed
      
      const response = await apiClient.updateListing(id!, updateData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update listing');
      }

      toast.success("Listing updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-listing", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update listing");
      console.error("Error updating listing:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Listing not found</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      
      <main className="flex-1">
        <div className="border-b border-border bg-background">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold">Edit Listing</h1>
              {!isEditing ? (
                <Button onClick={handleEdit} className="bg-accent text-black hover:bg-accent/90">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Listing
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving} className="bg-accent text-black hover:bg-accent/90">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
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
            onClick={() => navigate('/admin/listings')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Listings
          </Button>

          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="col-span-2 space-y-6">
              {/* Header Card */}
              <Card className="p-6 bg-card border-border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Badge className="bg-accent/20 text-accent border-accent/30 mb-2">
                      {listing.category?.name || "All Listings"}
                    </Badge>
                    {isEditing ? (
                      <Input
                        value={editedData.title}
                        onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                        className="text-2xl font-bold mb-2 bg-background border-border"
                        placeholder="Listing title"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold mb-2">{listing.title}</h2>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        {isEditing ? (
                          <Input
                            value={editedData.location}
                            onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                            className="h-6 w-32 bg-background border-border"
                            placeholder="Location"
                          />
                        ) : (
                          listing.location || "USA"
                        )}
                      </span>
                      <span>•</span>
                      <span>5 years</span>
                      <span>•</span>
                      <span>4.36G/m</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <Select
                        value={editedData.managed_by_ex ? "managed" : "owner"}
                        onValueChange={(value) => setEditedData({ ...editedData, managed_by_ex: value === "managed" })}
                      >
                        <SelectTrigger className="w-40 bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="managed">Managed by EX</SelectItem>
                          <SelectItem value="owner">By Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mb-4">
                    <label className="text-sm text-muted-foreground mb-2 block">Price</label>
                    <Input
                      type="number"
                      value={editedData.price}
                      onChange={(e) => setEditedData({ ...editedData, price: parseFloat(e.target.value) })}
                      className="text-3xl font-bold bg-background border-border"
                      placeholder="Price"
                    />
                  </div>
                ) : (
                  <div className="text-3xl font-bold mb-4">{formatPrice(listing.price)}</div>
                )}

                {/* Seller Info */}
                <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={listing.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-accent text-black">
                      {listing.profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{listing.profile?.full_name || "Unknown User"}</div>
                    <div className="text-sm text-muted-foreground">On for 3 Year</div>
                  </div>
                </div>
              </Card>

              {/* Main Image */}
              <Card className="overflow-hidden bg-card border-border">
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {listing.image_url ? (
                    <img 
                      src={listing.image_url} 
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground">No image available</div>
                  )}
                  {listing.managed_by_ex && (
                    <Badge className="absolute top-4 left-4 bg-accent/90 text-black border-0">
                      Managed by EX
                    </Badge>
                  )}
                </div>
              </Card>

              {/* Description */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-4">Description</h3>
                {isEditing ? (
                  <Textarea
                    value={editedData.description}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                    className="min-h-[200px] bg-background border-border text-muted-foreground"
                    placeholder="Listing description"
                  />
                ) : (
                  <div className="text-muted-foreground leading-relaxed">
                    {listing.description || "No description available"}
                  </div>
                )}
              </Card>

              {/* General Info */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-6">General</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Location</div>
                    <div className="font-medium">{listing.location || "USA"} 🇺🇸</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Business Age</div>
                    <div className="font-medium">5 years</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Heading (CAC)</div>
                    <div className="font-medium">4.36G/m</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Traffic Margin</div>
                    <div className="font-medium">10%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Stock Margin</div>
                    <div className="font-medium">165$/m</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Profit Margin</div>
                    <div className="font-medium">1.5x</div>
                  </div>
                </div>
              </Card>

              {/* Profit & Loss Table */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-6">Profit & Loss</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 bg-muted font-medium"></th>
                        <th className="text-center py-3 px-4 bg-accent text-black font-medium">2025</th>
                        <th className="text-center py-3 px-4 bg-muted font-medium">2024</th>
                        <th className="text-center py-3 px-4 bg-muted font-medium">2024/2025</th>
                        <th className="text-center py-3 px-4 bg-muted font-medium">Forecast 2025</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4">Gross Revenue</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4">Net Revenue</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4">Cost of Goods</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                      </tr>
                      <tr className="bg-accent/10">
                        <td className="py-3 px-4 bg-accent text-black font-medium">Net Profit</td>
                        <td className="py-3 px-4 bg-accent text-black text-center font-medium">-</td>
                        <td className="py-3 px-4 bg-accent text-black text-center font-medium">-</td>
                        <td className="py-3 px-4 bg-accent text-black text-center font-medium">-</td>
                        <td className="py-3 px-4 bg-accent text-black text-center font-medium">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Additional Sections */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-4">Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Conversion Rate</div>
                    <div className="text-2xl font-bold text-accent">2%</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Ref per Know</div>
                    <div className="text-2xl font-bold text-accent">45</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Returning customers</div>
                    <div className="text-2xl font-bold text-accent">2%</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-4">Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Team members</span>
                    <span className="font-medium">👥 2</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Time commitment</span>
                    <span className="font-medium">⏰ 5</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">COO commitment over week</span>
                    <span className="font-medium">⏱️ 40 hours</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-4">Handover</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Assets included in the Sale</span>
                    <span className="font-medium">✅ Life as filter</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Length of buyer sales</span>
                    <span className="font-medium">📅 Labor as transfer</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">Seller will hire (how business)?</span>
                    <span className="font-medium">✓ Yes</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">Time commitment from!?</span>
                    <span className="font-medium">📆 12 months</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-4">Attachments</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start gap-2 border-border">
                    <div className="h-10 w-10 bg-red-100 rounded flex items-center justify-center">
                      📄
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">021 32 04 32 59</div>
                      <div className="text-xs text-muted-foreground">12.59 MB</div>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 border-border">
                    <div className="h-10 w-10 bg-green-100 rounded flex items-center justify-center">
                      📊
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">021 32 04 32 59</div>
                      <div className="text-xs text-muted-foreground">10.59 MB</div>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right Sidebar - Status */}
            <div className="space-y-6">
              <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold mb-4">Status</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Current Status</div>
                    {isEditing ? (
                      <Select
                        value={editedData.status}
                        onValueChange={(value) => setEditedData({ ...editedData, status: value })}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="deleted">Deleted</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        {listing.status === 'published' ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            Published
                          </Badge>
                        ) : listing.status === 'deleted' ? (
                          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                            Deleted
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                            Draft
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Created Date</div>
                    <div className="font-medium">
                      {new Date(listing.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Last Updated</div>
                    <div className="font-medium">
                      {new Date(listing.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Requests</div>
                    <div className="font-medium">{listing.requests_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Unread Messages</div>
                    <div className="font-medium">{listing.unread_messages_count || 0}</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

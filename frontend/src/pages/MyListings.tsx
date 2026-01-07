import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ListingsSidebar } from "@/components/listings/ListingsSidebar";
import { ListingCardDashboard } from "@/components/listings/ListingCardDashboard";
import { DashboardHeader } from "@/components/listings/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import searchIcon from "@/assets/seach icon.svg";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Listing {
  id: string;
  title: string;
  price: number;
  image_url?: string;
  status: "draft" | "published" | "archived";
  managed_by_ex: boolean;
  category_id?: string;
  category?: string;
  created_at: string;
  requests_count: number;
  unread_messages_count: number;
}

const MyListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login");
      } else {
        loadListings();
      }
      setLoading(false);
    }
  }, [user, authLoading, navigate]);

  const loadListings = async () => {
    if (!user) return;

    try {
      // Get all listings (not just PUBLISH) so user can see drafts too
      const response = await apiClient.getListings({
        nocache: 'true', // Ensure fresh data
      });

      if (response.success && response.data) {
        console.log('All listings fetched:', response.data.length);
        console.log('Current user ID:', user.id);
        
        // Filter listings by current user - check both userId and user_id
        const userListings = Array.isArray(response.data) 
          ? response.data.filter((listing: any) => {
              const listingUserId = listing.userId || listing.user_id;
              const matches = listingUserId === user.id;
              if (matches) {
                console.log('Found matching listing:', listing.id, 'userId:', listingUserId);
              }
              return matches;
            })
          : [];
        
        console.log('Filtered user listings:', userListings.length);
        
        // Extract title from brand questions (same as admin listings)
        const mappedListings: Listing[] = userListings.map((listing: any) => {
          // Get title from brand data
          let title = 'Untitled Listing';
          if (listing.brand && Array.isArray(listing.brand) && listing.brand.length > 0) {
            const brandNameQuestion = listing.brand.find((b: any) => 
              b.question?.toLowerCase().includes('brand name') ||
              b.question?.toLowerCase().includes('business name') ||
              b.question?.toLowerCase().includes('name') ||
              b.question?.toLowerCase().includes('company')
            );
            if (brandNameQuestion?.answer) {
              title = brandNameQuestion.answer;
            } else if (listing.brand[0]?.answer) {
              title = listing.brand[0].answer;
            }
          }
          
          // Check advertisement for title
          if (listing.advertisement && Array.isArray(listing.advertisement) && listing.advertisement.length > 0) {
            const titleQuestion = listing.advertisement.find((a: any) => 
              a.question?.toLowerCase().includes('title')
            );
            if (titleQuestion?.answer && titleQuestion.answer.trim()) {
              title = titleQuestion.answer;
            }
          }
          
          // Normalize status
          let normalizedStatus = listing.status?.toLowerCase() || 'draft';
          if (normalizedStatus === 'publish') normalizedStatus = 'published';
          
          // Get asking price from multiple sources
          let price = 0;
          
          // First try direct price field
          if (listing.price) {
            const directPrice = typeof listing.price === 'string' 
              ? parseFloat(listing.price.replace(/[^0-9.-]/g, '')) 
              : parseFloat(listing.price);
            if (!isNaN(directPrice) && directPrice > 0) {
              price = directPrice;
            }
          }
          
          // Try from advertisement questions (listing price)
          if (price === 0 && listing.advertisement && Array.isArray(listing.advertisement)) {
            const adPriceQuestion = listing.advertisement.find((a: any) => 
              a.question?.toLowerCase().includes('listing price') ||
              a.question?.toLowerCase().includes('price')
            );
            if (adPriceQuestion?.answer) {
              const answer = adPriceQuestion.answer.toString().replace(/[^0-9.-]/g, '');
              const parsedPrice = parseFloat(answer);
              if (!isNaN(parsedPrice) && parsedPrice > 0) {
                price = parsedPrice;
              }
            }
          }
          
          // Try from brand questions (asking price)
          if (price === 0 && listing.brand && Array.isArray(listing.brand)) {
            const priceQuestion = listing.brand.find((b: any) => 
              b.question?.toLowerCase().includes('asking price') ||
              b.question?.toLowerCase().includes('price') ||
              b.question?.toLowerCase().includes('selling price')
            );
            if (priceQuestion?.answer) {
              const answer = priceQuestion.answer.toString().replace(/[^0-9.-]/g, '');
              const parsedPrice = parseFloat(answer);
              if (!isNaN(parsedPrice) && parsedPrice > 0) {
                price = parsedPrice;
              }
            }
          }
          
          // Also check asking_price field
          if (price === 0 && listing.asking_price) {
            const askingPrice = typeof listing.asking_price === 'string'
              ? parseFloat(listing.asking_price.replace(/[^0-9.-]/g, ''))
              : parseFloat(listing.asking_price);
            if (!isNaN(askingPrice) && askingPrice > 0) {
              price = askingPrice;
            }
          }
          
          // Get image from advertisement or brand
          let image_url = '';
          if (listing.advertisement && Array.isArray(listing.advertisement)) {
            const photoQuestion = listing.advertisement.find((a: any) => 
              a.question?.toLowerCase().includes('photo') || 
              a.answer_type === 'PHOTO'
            );
            if (photoQuestion?.answer) {
              image_url = Array.isArray(photoQuestion.answer) ? photoQuestion.answer[0] : photoQuestion.answer;
            }
          }
          if (!image_url && listing.brand && Array.isArray(listing.brand)) {
            const brandInfo = listing.brand[0];
            if (brandInfo?.businessPhoto?.[0]) {
              image_url = brandInfo.businessPhoto[0];
            } else if (brandInfo?.logo) {
              image_url = brandInfo.logo;
            }
          }
          
          // Get category name
          const categoryInfo = listing.category?.[0] || listing.category || null;
          const categoryName = categoryInfo?.name || '';

          return {
            id: listing.id,
            title: title,
            price: price,
            image_url: image_url || listing.image_url || listing.image || '',
            status: normalizedStatus,
            managed_by_ex: listing.managed_by_ex || false,
            category_id: listing.category?.[0]?.id || listing.category_id || '',
            category: categoryName,
            created_at: listing.created_at || listing.createdAt || new Date().toISOString(),
            requests_count: listing.requests_count || 0,
            unread_messages_count: listing.unread_messages_count || 0,
          };
        });

        console.log('Mapped listings:', mappedListings.length);
        setListings(mappedListings);
      } else {
        toast.error(response.error || "Failed to load listings");
      }
    } catch (error: any) {
      console.error("Error loading listings:", error);
      toast.error("Failed to load listings");
    }
  };

  const filteredListings = listings.filter((listing) =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <ListingsSidebar />

      <div className="flex-1 w-full flex flex-col min-w-0 lg:ml-[240px] xl:ml-[280px]">
        {/* Header - Shared across all tabs */}
        <DashboardHeader />

        {/* Search and Add Button Section - Only visible on My Listings tab */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 px-4 sm:px-6 md:px-8 lg:px-10 pt-6 sm:pt-8 md:pt-10 pb-4 sm:pb-6 md:pb-8">
          {/* Search Field */}
          <div className="flex-1 sm:flex-none sm:w-full md:w-[300px] lg:w-[350px] xl:w-[389px] h-[50px] sm:h-[54px] md:h-[58px] px-4 sm:px-5 md:px-[20px] py-3 sm:py-4 md:py-[17px] rounded-full border border-[rgba(0,0,0,0.1)] bg-[rgba(250,250,250,1)] flex items-center gap-2 sm:gap-3">
            <img src={searchIcon} alt="Search" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-none outline-none bg-transparent font-['Lufga'] font-normal text-sm sm:text-base text-[rgba(0,0,0,0.5)] placeholder:text-[rgba(0,0,0,0.5)]"
            />
          </div>

          {/* Add New Listing Button */}
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full sm:w-auto sm:flex-shrink-0 h-[50px] sm:h-[54px] px-4 sm:px-6 md:px-[26px] py-3 sm:py-4 md:py-4 rounded-full bg-[rgba(174,243,31,1)] hover:opacity-90 font-['Lufga'] font-medium text-sm sm:text-base text-black flex items-center justify-center gap-2 sm:gap-3"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="whitespace-nowrap">Add New Listing</span>
          </Button>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 pb-6 sm:pb-8 md:pb-10">
          {filteredListings.length === 0 ? (
            <div className="text-center py-12 sm:py-16 md:py-20">
              <div className="max-w-md mx-auto px-4">
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
                  {searchQuery ? "No listings found" : "No listings yet"}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                  {searchQuery
                    ? "Try adjusting your search"
                    : "Create your first listing to showcase your business to potential buyers"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => navigate("/dashboard")}
                    size="lg"
                    className="bg-[#D3FC50] text-black hover:bg-[#D3FC50]/90 rounded-full text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Listing
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6 justify-items-center">
              {filteredListings.map((listing) => (
                <ListingCardDashboard
                  key={listing.id}
                  {...listing}
                  onUpdate={loadListings}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyListings;

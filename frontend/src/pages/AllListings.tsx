import ListingCard from "@/components/ListingCard";
import FilterSidebar, { FilterState } from "@/components/listings/FilterSidebar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useSearchParams, Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { detectCountryFromLocation } from "@/lib/countryUtils";
import { formatBusinessAge } from "@/lib/dateUtils";
import logo from "@/assets/_App Icon 1 (2).png";
import notificationIcon from "@/assets/notification.svg";
import heartIcon from "@/assets/Heart.svg";
import giftBoxIcon from "@/assets/Group 1597885245.png";
import star4 from "@/assets/Star 4.png";
import star2 from "@/assets/Star 2.png";
import crownIcon from "@/assets/fi_126073.svg";
import premiumStarIcon from "@/assets/fi_5076417.svg";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createSocketConnection } from "@/lib/socket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Custom Notification Button Component with real data
const NotificationButtonWithCount = ({ userId }: { userId: string }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      loadNotifications();
      
      // Set up socket to listen for new notifications
      const socket = createSocketConnection({
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      
      socket.on('connect', () => {
        console.log('✅ NotificationButton: Socket connected');
      });
      
      // Listen for new notification events
      socket.on('new_notification', () => {
        console.log('🔔 New notification received, refreshing...');
        loadNotifications();
      });
      
      // Poll for notifications every 30 seconds as fallback
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);
      
      return () => {
        socket.disconnect();
        clearInterval(interval);
      };
    }
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.getNotifications();
      if (response.success && response.data) {
        const notifs = Array.isArray(response.data) ? response.data : [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: any) => !n.read).length || 0);
      } else {
        const data = (response as any).data;
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((n: any) => !n.read).length || 0);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative"
          style={{
            width: "44px",
            height: "44px",
            padding: "10px",
            gap: "10px",
            borderRadius: "28px",
            background: "rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          <img 
            src={notificationIcon} 
            alt="Notifications" 
            style={{
              width: "24px",
              height: "24px",
              opacity: 1,
              display: "block",
              flexShrink: 0,
            }}
          />
          {/* Notification Badge - Only show when count > 0, positioned higher */}
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#EF4444",
                color: "white",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: "1",
                zIndex: 10,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 sm:w-96">
        <div className="p-4">
          <h3 className="font-semibold mb-2">Notifications</h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg cursor-pointer ${
                    !notification.read ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  }}
                >
                  <p className="text-sm font-medium">{notification.title || 'Notification'}</p>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AllListings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Show 12 listings per page
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Load favorites count
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFavoritesCount();
    }
  }, [isAuthenticated, user]);

  const loadFavoritesCount = async () => {
    if (!user) return;
    
    try {
      const response = await apiClient.getFavorites();
      if (response.success && response.data) {
        const favorites = Array.isArray(response.data) ? response.data : [];
        setFavoritesCount(favorites.length);
      }
    } catch (error) {
      console.error('Error loading favorites count:', error);
    }
  };

  const handleFavoritesClick = () => {
    if (!isAuthenticated || !user) {
      toast.error("Please login to view your favorites");
      navigate("/login");
      return;
    }
    navigate("/favourites");
  };
  
  // Initialize filter state
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || "",
    niche: searchParams.get('category') || "all",
    revenueGenerating: "all",
    priceRange: [0, 100000], // Default to show all price ranges (matches slider max)
    businessLocation: "all",
    advancedFilters: {
      targetCountry: "all",
      targetCountryPercentage: 50,
      ageRange: [0, 20], // Default to show all ages (matches slider max)
      monthlyRevenue: [0, 50000], // Default to show all revenue ranges (matches slider max)
      monthlyProfit: [0, 50000], // Default to show all profit ranges (matches slider max)
      monthlyPageviews: [0, 1000000], // Default to show all pageview ranges (matches slider max)
      revenueMultiple: [0, 50], // Default to show all multiples (matches slider max)
      profitMultiple: [0, 50], // Default to show all multiples (matches slider max)
    },
  });
  
  // Use the same hook as admin dashboard for consistent category display
  const { data: categoriesData = [] } = useCategories({ nocache: true });

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    // Update URL when filters change
    const params = new URLSearchParams();
    if (filters.niche !== "all") {
      params.set('category', filters.niche);
    }
    if (filters.search) {
      params.set('search', filters.search);
    }
    setSearchParams(params, { replace: true });
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching ALL listings (will filter to PUBLISH client-side)');
      
      let response = await apiClient.getListings({ nocache: 'true' });
      console.log('📦 API Response (ALL):', response);
      
      if (response.success) {
        let listingsData = Array.isArray(response.data) ? response.data : [];
        console.log('📊 Total listings count (ALL):', listingsData.length);
        
        // Filter to only show PUBLISH listings
        const publishedListings = listingsData.filter((l: any) => {
          const status = String(l.status || '').toUpperCase();
          return status === 'PUBLISH' || status === 'PUBLISHED';
        });
        
        console.log('📊 Published listings count (after filter):', publishedListings.length);
        
        // Debug: Log first listing to see structure
        if (publishedListings.length > 0) {
          console.log('🔍 DEBUG: Sample listing structure:', {
            id: publishedListings[0].id,
            keys: Object.keys(publishedListings[0]),
            created_at: publishedListings[0].created_at,
            createdAt: publishedListings[0].createdAt,
            hasUser: !!publishedListings[0].user,
            user: publishedListings[0].user ? {
              id: publishedListings[0].user.id,
              keys: Object.keys(publishedListings[0].user),
              created_at: publishedListings[0].user.created_at,
              createdAt: publishedListings[0].user.createdAt,
            } : null,
          });
        }
        
        setListings(publishedListings);
      } else {
        console.error('❌ API returned error:', response.error);
        setListings([]);
      }
    } catch (error) {
      console.error('❌ Error fetching listings:', error);
      setListings([]);
    }
    setLoading(false);
  };

  // Helper function to normalize country names for comparison
  const normalizeCountryName = (country: string): string => {
    if (!country) return '';
    const normalized = country.toLowerCase().trim();
    
    // Map common variations to standard names used in filter dropdown
    const countryMap: { [key: string]: string } = {
      'usa': 'United States',
      'united states': 'United States',
      'us': 'United States',
      'uk': 'United Kingdom',
      'united kingdom': 'United Kingdom',
      'uae': 'UAE',
      'united arab emirates': 'UAE',
      'south korea': 'South Korea',
      'new zealand': 'New Zealand',
      'south africa': 'South Africa',
      'saudi arabia': 'Saudi Arabia',
      'hong kong': 'Hong Kong',
      'pakistan': 'Pakistan',
      'india': 'India',
      'canada': 'Canada',
      'australia': 'Australia',
      'singapore': 'Singapore',
      'germany': 'Germany',
      'france': 'France',
      'spain': 'Spain',
      'italy': 'Italy',
      'netherlands': 'Netherlands',
      'belgium': 'Belgium',
      'sweden': 'Sweden',
      'norway': 'Norway',
      'denmark': 'Denmark',
      'japan': 'Japan',
      'china': 'China',
      'brazil': 'Brazil',
      'mexico': 'Mexico',
      'argentina': 'Argentina',
    };
    
    // Direct match
    if (countryMap[normalized]) {
      return countryMap[normalized];
    }
    
    // Check if any key contains the normalized string or vice versa
    for (const [key, value] of Object.entries(countryMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    // Return original if no mapping found (capitalize first letter of each word)
    return country.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const filteredListings = listings.filter(listing => {
    // Extract data from listing
    const brandQuestions = listing.brand || [];
    const adQuestions = listing.advertisement || [];
    
    const getBrandAnswer = (searchTerms: string[]) => {
      const question = brandQuestions.find((b: any) => 
        searchTerms.some(term => b.question?.toLowerCase().includes(term.toLowerCase()))
      );
      return question?.answer || null;
    };
    
    const getAdAnswer = (searchTerms: string[]) => {
      const question = adQuestions.find((a: any) => 
        searchTerms.some(term => a.question?.toLowerCase().includes(term.toLowerCase()))
      );
      return question?.answer || null;
    };
    
    const businessName = getBrandAnswer(['business name', 'company name', 'brand name', 'name']) || 
                        brandQuestions[0]?.answer || 
                        listing.title || 
                        'Unnamed Business';
    const categoryName = listing.category?.[0]?.name || '';
    const askingPrice = parseFloat(getAdAnswer(['listing price', 'price']) || 
                      getBrandAnswer(['asking price', 'price', 'selling price']) || 
                      listing.price || 
                      0) || 0;
    const location = getBrandAnswer(['country', 'location', 'address']) || 
                    listing.location || 
                    'Not specified';
    // Calculate business age for filtering (use user account creation date, convert to years for filtering)
    // For filtering purposes, we'll use a numeric value (years) but for display we'll use formatted string
    const userCreatedAt = listing.user?.created_at || listing.user?.createdAt;
    let businessAge = 0;
    
    if (userCreatedAt) {
      try {
        const startDate = new Date(userCreatedAt);
        if (!isNaN(startDate.getTime())) {
          const now = new Date();
          const diffMs = now.getTime() - startDate.getTime();
          const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
          businessAge = Math.floor(diffYears);
        }
      } catch (e) {
        // Ignore errors, businessAge remains 0
      }
    }
    
    // Calculate average financials from all financials
    const allFinancials = listing.financials || [];
    
    let avgRevenue = 0;
    let avgNetProfit = 0;
    
    // Check for financial table format (new format)
    const tableFinancial = allFinancials.find((f: any) => 
      f.name === '__FINANCIAL_TABLE__' && f.revenue_amount
    );
    
    if (tableFinancial && tableFinancial.revenue_amount) {
      try {
        // Parse JSON data stored in revenue_amount field
        const financialTableData = JSON.parse(tableFinancial.revenue_amount);
        const rowLabels = financialTableData.rowLabels || [];
        const columnLabels = financialTableData.columnLabels || [];
        const financialData = financialTableData.financialData || {};
        
        if (columnLabels.length > 0 && rowLabels.length > 0) {
          // Calculate net profit for each column
          const columnProfits: number[] = [];
          const columnRevenues: number[] = [];
          
          columnLabels.forEach((col: any) => {
            let profit = 0;
            let revenue = 0;
            
            rowLabels.forEach((rowLabel: string) => {
              const value = parseFloat(financialData[rowLabel]?.[col.key] || '0');
              if (rowLabel.toLowerCase().includes('revenue')) {
                profit += value;
                revenue += value;
              } else {
                profit -= value;
              }
            });
            
            columnProfits.push(profit);
            columnRevenues.push(revenue);
          });
          
          // Calculate averages
          if (columnProfits.length > 0) {
            avgNetProfit = columnProfits.reduce((sum, p) => sum + p, 0) / columnProfits.length;
            avgRevenue = columnRevenues.reduce((sum, r) => sum + r, 0) / columnRevenues.length;
          }
        }
      } catch (e) {
        console.error('Error parsing financial table data:', e);
      }
    }
    
    // If no table data or table data is empty, try old format
    if (avgRevenue === 0 && avgNetProfit === 0) {
      // Filter out the special table marker record
      const validFinancials = allFinancials.filter((f: any) => f.name !== '__FINANCIAL_TABLE__');
      
      // Separate monthly and yearly financials
      const monthlyFinancials = validFinancials.filter((f: any) => f.type === 'monthly');
      const yearlyFinancials = validFinancials.filter((f: any) => f.type === 'yearly');
      
      // Calculate average from monthly data if available
      if (monthlyFinancials.length > 0) {
        const totalMonthlyRevenue = monthlyFinancials.reduce((sum: number, f: any) => 
          sum + (parseFloat(f.revenue_amount || 0) || 0), 0
        );
        const totalMonthlyProfit = monthlyFinancials.reduce((sum: number, f: any) => 
          sum + (parseFloat(f.net_profit || 0) || 0), 0
        );
        avgRevenue = totalMonthlyRevenue / monthlyFinancials.length;
        avgNetProfit = totalMonthlyProfit / monthlyFinancials.length;
      } else if (yearlyFinancials.length > 0) {
        // If only yearly data, calculate average yearly and convert to monthly
        const totalYearlyRevenue = yearlyFinancials.reduce((sum: number, f: any) => 
          sum + (parseFloat(f.revenue_amount || 0) || 0), 0
        );
        const totalYearlyProfit = yearlyFinancials.reduce((sum: number, f: any) => 
          sum + (parseFloat(f.net_profit || 0) || 0), 0
        );
        const avgYearlyRevenue = totalYearlyRevenue / yearlyFinancials.length;
        const avgYearlyProfit = totalYearlyProfit / yearlyFinancials.length;
        // Convert to monthly average
        avgRevenue = avgYearlyRevenue / 12;
        avgNetProfit = avgYearlyProfit / 12;
      } else {
        // Fallback: use all financials if type is not specified
        if (validFinancials.length > 0) {
          const totalRevenue = validFinancials.reduce((sum: number, f: any) => 
            sum + (parseFloat(f.revenue_amount || 0) || 0), 0
          );
          const totalProfit = validFinancials.reduce((sum: number, f: any) => 
            sum + (parseFloat(f.net_profit || 0) || 0), 0
          );
          avgRevenue = totalRevenue / validFinancials.length;
          avgNetProfit = totalProfit / validFinancials.length;
        }
      }
    }
    
    // For filtering, use monthly averages
    const monthlyRevenue = avgRevenue;
    const monthlyProfit = avgNetProfit;
    
    // Calculate multiples (using average monthly * 12 for annual)
    const annualRevenue = avgRevenue * 12;
    const annualProfit = avgNetProfit * 12;
    const revenueMultiple = (askingPrice > 0 && annualRevenue > 0) ? (askingPrice / annualRevenue) : 0;
    const profitMultiple = (askingPrice > 0 && annualProfit > 0) ? (askingPrice / annualProfit) : 0;
    
    // Get pageviews (if available in statistics)
    const statisticQuestions = listing.statistics || [];
    const pageviewsQuestion = statisticQuestions.find((s: any) => 
      s.question?.toLowerCase().includes('pageview') || 
      s.question?.toLowerCase().includes('traffic') ||
      s.question?.toLowerCase().includes('visitor')
    );
    let monthlyPageviews = parseFloat(pageviewsQuestion?.answer || '0') || 0;
    // If pageviews seem to be yearly, divide by 12
    if (monthlyPageviews > 1000000) {
      monthlyPageviews = monthlyPageviews / 12;
    }
    
    // Apply filters
    // 1. Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        businessName.toLowerCase().includes(searchLower) ||
        categoryName.toLowerCase().includes(searchLower) ||
        location.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // 2. Niche filter
    if (filters.niche !== "all") {
      const matchesNiche = listing.category?.some((cat: any) => cat.name === filters.niche);
      if (!matchesNiche) return false;
    }
    
    // 3. Revenue generating filter
    if (filters.revenueGenerating !== "all") {
      const hasRevenue = avgRevenue > 0;
      if (filters.revenueGenerating === "yes" && !hasRevenue) return false;
      if (filters.revenueGenerating === "no" && hasRevenue) return false;
    }
    
    // 4. Price range filter
    if (askingPrice < filters.priceRange[0] || askingPrice > filters.priceRange[1]) {
      return false;
    }
    
    // 5. Business location filter
    if (filters.businessLocation !== "all") {
      const detectedCountry = detectCountryFromLocation(location);
      const listingCountry = detectedCountry || location;
      const normalizedListingCountry = normalizeCountryName(listingCountry);
      const normalizedFilterCountry = normalizeCountryName(filters.businessLocation);
      
      // Compare normalized country names
      if (normalizedListingCountry.toLowerCase() !== normalizedFilterCountry.toLowerCase()) {
        // Also try direct comparison with original values
        if (listingCountry.toLowerCase() !== filters.businessLocation.toLowerCase() &&
            detectedCountry?.toLowerCase() !== filters.businessLocation.toLowerCase()) {
          return false;
        }
      }
    }
    
    // 6. Advanced filters
    const adv = filters.advancedFilters;
    
    // Target country filter - check if listing has target country data matching the filter
    // Only apply when a specific country is selected (not "all")
    if (adv.targetCountry && adv.targetCountry !== "all") {
      // Try to find target country data in statistics questions
      const targetCountryQuestion = statisticQuestions.find((s: any) => 
        s.question?.toLowerCase().includes('target country') ||
        s.question?.toLowerCase().includes('sales country') ||
        s.question?.toLowerCase().includes('target market') ||
        s.question?.toLowerCase().includes('primary country') ||
        s.question?.toLowerCase().includes('main country')
      );
      
      // Check if listing has sales_countries data (direct field or in statistics)
      let salesCountries: any[] = [];
      
      // Try direct sales_countries field (if statistics is an object with sales_countries)
      if (listing.statistics && typeof listing.statistics === 'object' && !Array.isArray(listing.statistics)) {
        salesCountries = (listing.statistics as any).sales_countries || [];
      }
      
      // Try to extract from question answer if it's structured data
      if (targetCountryQuestion?.answer) {
        try {
          // If answer is a string that might be JSON
          if (typeof targetCountryQuestion.answer === 'string') {
            // Try parsing as JSON
            try {
              const parsed = JSON.parse(targetCountryQuestion.answer);
              if (Array.isArray(parsed)) {
                salesCountries = parsed;
              }
            } catch (e) {
              // If not JSON, check if it's a simple country name string
              const answerStr = String(targetCountryQuestion.answer).trim();
              if (answerStr) {
                salesCountries = [{ name: answerStr, percentage: '100' }];
              }
            }
          } else if (Array.isArray(targetCountryQuestion.answer)) {
            salesCountries = targetCountryQuestion.answer;
          } else if (typeof targetCountryQuestion.answer === 'object') {
            // If it's a single object, wrap it in an array
            salesCountries = [targetCountryQuestion.answer];
          }
        } catch (e) {
          // If parsing fails, check if answer contains the country name
          const answerStr = String(targetCountryQuestion.answer).toLowerCase();
          const filterCountryLower = adv.targetCountry.toLowerCase();
          if (answerStr.includes(filterCountryLower)) {
            // If answer text contains the country, assume 100% match
            salesCountries = [{ name: adv.targetCountry, percentage: '100' }];
          }
        }
      }
      
      // Also check brand questions for country/target market info
      if (salesCountries.length === 0) {
        const brandCountryQuestion = brandQuestions.find((b: any) =>
          b.question?.toLowerCase().includes('target country') ||
          b.question?.toLowerCase().includes('target market') ||
          b.question?.toLowerCase().includes('primary market')
        );
        
        if (brandCountryQuestion?.answer) {
          const answerStr = String(brandCountryQuestion.answer).trim();
          if (answerStr) {
            salesCountries = [{ name: answerStr, percentage: '100' }];
          }
        }
      }
      
      // Check if any sales country matches the filter and meets percentage threshold
      if (salesCountries.length > 0) {
        const matchingCountry = salesCountries.find((country: any) => {
          const countryName = (country.name || country.country || '').toString().trim();
          if (!countryName) return false;
          
          const normalizedCountryName = normalizeCountryName(countryName);
          const normalizedFilterCountry = normalizeCountryName(adv.targetCountry);
          
          return normalizedCountryName.toLowerCase() === normalizedFilterCountry.toLowerCase() ||
                 countryName.toLowerCase() === adv.targetCountry.toLowerCase() ||
                 countryName.toLowerCase().includes(adv.targetCountry.toLowerCase()) ||
                 adv.targetCountry.toLowerCase().includes(countryName.toLowerCase());
        });
        
        if (matchingCountry) {
          // Check if percentage meets threshold
          const percentage = parseFloat(String(matchingCountry.percentage || '0').replace('%', '').replace(/[^0-9.]/g, '')) || 0;
          if (percentage < adv.targetCountryPercentage) {
            // Percentage doesn't meet threshold - exclude
            return false;
          }
          // If we have a match and it meets the threshold, include the listing (continue)
        } else {
          // We have target country data but no match - exclude this listing
          return false;
        }
      }
      // If no target country data available, include the listing (don't filter it out)
      // This ensures listings without target country data are still shown
    }
    
    // Default "show all" values - only apply filters if they're not at default max values
    const DEFAULT_AGE_MAX = 20;
    const DEFAULT_REVENUE_MAX = 50000;
    const DEFAULT_PROFIT_MAX = 50000;
    const DEFAULT_PAGEVIEWS_MAX = 1000000;
    const DEFAULT_MULTIPLE_MAX = 50;
    
    // Age range filter - only apply if not at default "show all" (0 to max)
    if (adv.ageRange[0] > 0 || adv.ageRange[1] < DEFAULT_AGE_MAX) {
      if (isNaN(businessAge) || businessAge < adv.ageRange[0] || businessAge > adv.ageRange[1]) {
        return false;
      }
    }
    
    // Monthly revenue filter - only apply if not at default "show all" (0 to max)
    if (adv.monthlyRevenue[0] > 0 || adv.monthlyRevenue[1] < DEFAULT_REVENUE_MAX) {
      if (isNaN(monthlyRevenue) || monthlyRevenue < adv.monthlyRevenue[0] || monthlyRevenue > adv.monthlyRevenue[1]) {
        return false;
      }
    }
    
    // Monthly profit filter - only apply if not at default "show all" (0 to max)
    if (adv.monthlyProfit[0] > 0 || adv.monthlyProfit[1] < DEFAULT_PROFIT_MAX) {
      if (isNaN(monthlyProfit) || monthlyProfit < adv.monthlyProfit[0] || monthlyProfit > adv.monthlyProfit[1]) {
        return false;
      }
    }
    
    // Monthly pageviews filter - only apply if not at default "show all" (0 to max)
    if (adv.monthlyPageviews[0] > 0 || adv.monthlyPageviews[1] < DEFAULT_PAGEVIEWS_MAX) {
      if (isNaN(monthlyPageviews) || monthlyPageviews < adv.monthlyPageviews[0] || monthlyPageviews > adv.monthlyPageviews[1]) {
        return false;
      }
    }
    
    // Revenue multiple filter - only apply if not at default "show all" (0 to max)
    if (adv.revenueMultiple[0] > 0 || adv.revenueMultiple[1] < DEFAULT_MULTIPLE_MAX) {
      if (isNaN(revenueMultiple) || revenueMultiple < adv.revenueMultiple[0] || revenueMultiple > adv.revenueMultiple[1]) {
        return false;
      }
    }
    
    // Profit multiple filter - only apply if not at default "show all" (0 to max)
    if (adv.profitMultiple[0] > 0 || adv.profitMultiple[1] < DEFAULT_MULTIPLE_MAX) {
      if (isNaN(profitMultiple) || profitMultiple < adv.profitMultiple[0] || profitMultiple > adv.profitMultiple[1]) {
        return false;
      }
    }
    
    return true;
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 Filter Debug:', {
      totalListings: listings.length,
      filteredListings: filteredListings.length,
      filters: filters,
      priceRange: filters.priceRange,
      advancedFilters: filters.advancedFilters,
    });
  }, [listings.length, filteredListings.length, filters]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedListings = filteredListings.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      niche: "all",
      revenueGenerating: "all",
      priceRange: [0, 100000], // Reset to show all price ranges (matches slider max)
      businessLocation: "all",
      advancedFilters: {
        targetCountry: "all",
        targetCountryPercentage: 50,
        ageRange: [0, 20], // Reset to show all ages (matches slider max)
        monthlyRevenue: [0, 50000], // Reset to show all revenue ranges (matches slider max)
        monthlyProfit: [0, 50000], // Reset to show all profit ranges (matches slider max)
        monthlyPageviews: [0, 1000000], // Reset to show all pageview ranges (matches slider max)
        revenueMultiple: [0, 50], // Reset to show all multiples (matches slider max)
        profitMultiple: [0, 50], // Reset to show all multiples (matches slider max)
      },
    });
  };

  const handleFind = () => {
    setCurrentPage(1);
    // Filters are already applied through the filteredListings computed value
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Container with Black Background */}
      <div className="bg-black pb-20">
        <div className="flex gap-[58px] max-w-[1920px] mx-auto relative">
          {/* Left Sidebar - Filters - Fixed on screen */}
          <aside 
            className="flex-shrink-0 hidden lg:block"
            style={{
              width: "389px",
            }}
          >
            <FilterSidebar
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={handleClearFilters}
              onFind={handleFind}
            />
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Custom Header for All Listings Page - only covers content area */}
            <header 
              className="bg-black"
              style={{
                width: "100%",
                maxWidth: "1332px",
                height: "100px",
                display: "flex",
                alignItems: "center",
                paddingLeft: "24px",
                paddingRight: "24px",
              }}
            >
              <div className="flex items-center justify-between w-full">
                {/* Navigation Menu */}
                <nav className="flex items-center gap-2">
                  <Link
                    to="/"
                    className="font-lufga"
                    style={{
                      height: "48px",
                      paddingTop: "12px",
                      paddingRight: "30px",
                      paddingBottom: "12px",
                      paddingLeft: "30px",
                      gap: "10px",
                      borderRadius: "30px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      fontWeight: 400,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      textTransform: "capitalize",
                      color: "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Home
                  </Link>
                  
                  <Link
                    to="/all-listings"
                    className="font-lufga"
                    style={{
                      height: "48px",
                      paddingTop: "12px",
                      paddingRight: "30px",
                      paddingBottom: "12px",
                      paddingLeft: "30px",
                      gap: "10px",
                      borderRadius: "30px",
                      backgroundColor: "rgba(196, 252, 30, 1)",
                      fontWeight: 600,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      textTransform: "capitalize",
                      color: "rgba(0, 0, 0, 1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    All Listings
                  </Link>
                  
                  <Link
                    to="/how-to-buy"
                    className="font-lufga"
                    style={{
                      height: "48px",
                      paddingTop: "12px",
                      paddingRight: "30px",
                      paddingBottom: "12px",
                      paddingLeft: "30px",
                      gap: "10px",
                      borderRadius: "30px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      fontWeight: 400,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      textTransform: "capitalize",
                      color: "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    How To Buy
                  </Link>
                  
                  <Link
                    to="/how-to-sell"
                    className="font-lufga"
                    style={{
                      height: "48px",
                      paddingTop: "12px",
                      paddingRight: "30px",
                      paddingBottom: "12px",
                      paddingLeft: "30px",
                      gap: "10px",
                      borderRadius: "30px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      fontWeight: 400,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      textTransform: "capitalize",
                      color: "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    How To Sell
                  </Link>
                </nav>

                {/* Right Side Icons */}
                <div className="flex items-center gap-3">
                  {/* Notification Icon with Badge - Custom implementation */}
                  {isAuthenticated && user ? (
                    <NotificationButtonWithCount userId={user.id} />
                  ) : (
                    <button
                      type="button"
                      className="relative"
                      style={{
                        width: "44px",
                        height: "44px",
                        padding: "10px",
                        gap: "10px",
                        borderRadius: "28px",
                        background: "rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      <img 
                        src={notificationIcon} 
                        alt="Notifications" 
                        style={{
                          width: "24px",
                          height: "24px",
                          opacity: 1,
                          display: "block",
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  )}

                  {/* Heart/Favorite Icon with Badge */}
                  <button
                    type="button"
                    onClick={handleFavoritesClick}
                    className="relative"
                    style={{
                      width: "52px",
                      height: "52px",
                      padding: "14px",
                      gap: "10px",
                      borderRadius: "28px",
                      background: "rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                  >
                    <img 
                      src={heartIcon} 
                      alt="Favorites" 
                      style={{
                        width: "24px",
                        height: "24px",
                        opacity: 1,
                        display: "block",
                        flexShrink: 0,
                      }}
                    />
                    {/* Heart Badge - Only show if count > 0 */}
                    {isAuthenticated && user && favoritesCount > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          backgroundColor: "white",
                          color: "black",
                          fontSize: "11px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: "1",
                        }}
                      >
                        {favoritesCount > 9 ? "9+" : favoritesCount}
                      </span>
                    )}
                  </button>

                  {/* User Profile Section */}
                <button
                    type="button"
                    className="flex items-center gap-2 cursor-pointer"
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: "4px",
                    }}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src="" alt="Manuel" />
                        <AvatarFallback 
                          className="bg-blue-200 text-blue-800 text-sm font-semibold"
                          style={{
                            backgroundColor: "rgba(147, 197, 253, 0.3)",
                            color: "rgba(30, 64, 175, 1)",
                          }}
                        >
                          M
                        </AvatarFallback>
                      </Avatar>
                      {/* Profile Badge */}
                      <span
                        style={{
                          position: "absolute",
                          top: "-2px",
                          right: "-2px",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          backgroundColor: "#EF4444",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: "1",
                          border: "2px solid black",
                        }}
                      >
                        3
                      </span>
                    </div>
                    <span
                      className="font-lufga"
                      style={{
                        color: "rgba(255, 255, 255, 1)",
                        fontSize: "16px",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Manuel
                    </span>
                    <ChevronDown 
                      className="text-white" 
                      size={16}
                      style={{
                        color: "rgba(255, 255, 255, 1)",
                      }}
                    />
                </button>
                </div>
          </div>
            </header>
            
            {/* Main Content Area - White Background */}
            <div className="flex-1 bg-white min-w-0 px-4 py-8">
              {/* Banner Section */}
              <div
                style={{
                  position: "relative",
                  width: "1199px",
                  height: "260px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  padding: "32px",
                  gap: "32px",
                  isolation: "isolate",
                  background: "linear-gradient(90deg, #C4FC1E 0%, #D2FF4D 100%)",
                  borderRadius: "20px",
                  marginBottom: "32px",
                  overflow: "hidden",
                }}
              >
                {/* Star decorative elements */}
                <img
                  src={star4}
                  alt="Star"
                  style={{
                    position: "absolute",
                    width: "89px",
                    height: "89px",
                    top: "20px",
                    right: "100px",
                    opacity: 1,
                    zIndex: 0,
                  }}
                />
                <img
                  src={star2}
                  alt="Star"
                  style={{
                    position: "absolute",
                    width: "89px",
                    height: "89px",
                    bottom: "20px",
                    right: "50px",
                    opacity: 1,
                    zIndex: 0,
                  }}
                />
                
                {/* Content on Left */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", zIndex: 1, flex: 1 }}>
                  {/* Heading and Description Container */}
                  <div
                    style={{
                      width: "588px",
                      height: "112px",
                      gap: "16px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Heading */}
                    <h2
                      className="font-lufga"
                      style={{
                        fontWeight: 700,
                        fontSize: "28px",
                        lineHeight: "150%",
                        letterSpacing: "0%",
                        color: "rgba(0, 0, 0, 1)",
                        margin: 0,
                      }}
                    >
                      Looking to Sell Your Shopify Store?
                    </h2>

                    {/* Body Text */}
                    <p
                      className="font-lufga"
                      style={{
                        fontWeight: 400,
                        fontSize: "18px",
                        lineHeight: "150%",
                        letterSpacing: "0%",
                        color: "rgba(0, 0, 0, 0.5)",
                        margin: 0,
                      }}
                    >
                      Get the best deal with serious buyers ready to invest! Join a marketplace where top-rated businesses meet qualified investors.
            </p>
          </div>

                  {/* Button */}
                  <button
                    type="button"
                    className="font-lufga"
                    style={{
                      width: "259px",
                      height: "52px",
                      paddingTop: "13px",
                      paddingRight: "20px",
                      paddingBottom: "13px",
                      paddingLeft: "20px",
                      gap: "10px",
                      borderRadius: "60px",
                      background: "rgba(0, 0, 0, 1)",
                      fontWeight: 600,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      textTransform: "capitalize",
                      color: "rgba(255, 255, 255, 1)",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    List Your Business Now!
                  </button>
            </div>

                {/* Gift Box Icon on Right */}
                <div style={{ flexShrink: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img 
                    src={giftBoxIcon} 
                    alt="Gift Box" 
                    style={{
                      width: "auto",
                      height: "auto",
                      display: "block",
                    }}
                          />
                        </div>
                  </div>

              {/* Premium Section */}
              <div
                style={{
                  width: "1199px",
                  height: "819px",
                  gap: "16px",
                  borderRadius: "20px",
                  padding: "32px",
                  background: "rgba(0, 0, 0, 0.04)",
                  marginTop: "32px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Heading Section */}
                <div
                  style={{
                    width: "912px",
                    height: "80px",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {/* Icon and Heading */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img 
                      src={crownIcon} 
                      alt="Crown" 
                      style={{
                        width: "44px",
                        height: "44px",
                        display: "block",
                      }}
                    />
                    <h2
                      className="font-lufga"
                      style={{
                        fontFamily: "Lufga, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                        fontWeight: 700,
                        fontSize: "28px",
                        lineHeight: "150%",
                        letterSpacing: "0%",
                        color: "rgba(0, 0, 0, 1)",
                        margin: 0,
                      }}
                    >
                      Get Deals First. 21 Days Before the Rest
                    </h2>
                  </div>

                  {/* 10px gap */}
                  <div style={{ width: "10px" }} />

                  {/* Join Premium Button */}
                  <button
                    type="button"
                    className="font-lufga"
                    style={{
                      fontFamily: "Lufga, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                      width: "148px",
                      height: "32px",
                      paddingTop: "4px",
                      paddingRight: "9px",
                      paddingBottom: "4px",
                      paddingLeft: "9px",
                      gap: "7px",
                      borderRadius: "60px",
                      background: "rgba(203, 254, 54, 1)",
                      fontWeight: 600,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      textTransform: "capitalize",
                      color: "rgba(0, 0, 0, 1)",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <img 
                      src={premiumStarIcon} 
                      alt="Star" 
                      style={{
                        width: "20px",
                        height: "20px",
                        display: "block",
                      }}
                    />
                    Join Premium
                  </button>
                </div>

                {/* Description Section */}
                <div
                  style={{
                    width: "912px",
                    height: "54px",
                    marginTop: "8px",
                  }}
                >
                  <p
                    className="font-lufga"
                    style={{
                      fontFamily: "Lufga, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                      fontWeight: 400,
                      fontSize: "18px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      color: "rgba(0, 0, 0, 0.5)",
                      margin: 0,
                    }}
                  >
                    JOIN Premium now! Gain early access to All Listings 21 days before they become public. Don't wait—Stay ahead of your competitiors.{" "}
                    <span
                      className="font-lufga"
                      style={{
                        fontFamily: "Lufga, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                        fontWeight: 600,
                        fontSize: "18px",
                        lineHeight: "150%",
                        letterSpacing: "0%",
                        color: "#0067ff",
                        cursor: "pointer",
                      }}
                    >
                      Learn More
                    </span>
                  </p>
                </div>

                {/* Buttons Section */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "16px",
                    alignItems: "center",
                  }}
                >
                  {/* Join Premium Button */}
                  <button
                    type="button"
                    className="font-lufga"
                    style={{
                      fontFamily: "Lufga, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                      width: "172px",
                      height: "52px",
                      paddingTop: "13px",
                      paddingRight: "20px",
                      paddingBottom: "13px",
                      paddingLeft: "20px",
                      gap: "10px",
                      borderRadius: "60px",
                      background: "rgba(203, 254, 54, 1)",
                      fontWeight: 600,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      textTransform: "capitalize",
                      color: "rgba(0, 0, 0, 1)",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Join Premium
                  </button>

                  {/* Discover Off-Market Listings Button */}
                  <button
                    type="button"
                    className="font-lufga"
                    style={{
                      fontFamily: "Lufga, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                      width: "325px",
                      height: "52px",
                      paddingTop: "13px",
                      paddingRight: "20px",
                      paddingBottom: "13px",
                      paddingLeft: "20px",
                      gap: "10px",
                      borderRadius: "60px",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderColor: "rgba(0, 0, 0, 0.1)",
                      background: "rgba(0, 0, 0, 0.1)",
                      fontWeight: 600,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      textTransform: "capitalize",
                      color: "rgba(0, 0, 0, 1)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Discover 25 Off-Market Listings
                  </button>
                </div>

                {/* Slider for premium listings - only visible to pro users */}
              </div>

              {/* All Listings Cards Container */}
              <div
                style={{
                  width: "1199px",
                  height: "auto",
                  minHeight: "400px",
                  background: "rgba(255, 255, 255, 1)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(225, 225, 225, 1)",
                  borderRadius: "20px",
                  padding: "32px",
                  marginTop: "32px",
                  overflow: "visible",
                  boxSizing: "border-box",
                }}
              >
                {/* Results Header */}
                <div style={{ marginBottom: "24px" }}>
                  <h2
                    className="font-lufga"
                    style={{
                      fontFamily: "Lufga, sans-serif",
                      fontWeight: 700,
                      fontSize: "32px",
                      lineHeight: "140%",
                      letterSpacing: "0%",
                      color: "rgba(0, 0, 0, 1)",
                      margin: 0,
                      marginBottom: "8px",
                    }}
                  >
                    {filteredListings.length} Results
                  </h2>
                  <p
                    className="font-lufga"
                    style={{
                      fontFamily: "Lufga, sans-serif",
                      fontWeight: 400,
                      fontSize: "16px",
                      lineHeight: "150%",
                      letterSpacing: "0%",
                      color: "rgba(0, 0, 0, 0.6)",
                      margin: 0,
                    }}
                  >
                    Discover top businesses for sale, explore opportunities, and make informed investments with confidence today.
                  </p>
                </div>

                {/* Listings Grid - show filtered listings */}
                {loading ? (
                  <div className="flex justify-center items-center" style={{ height: "400px" }}>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : filteredListings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedListings.map((listing, index) => {
                      // Extract data from brand questions
                      const brandQuestions = listing.brand || [];
                      const getBrandAnswer = (searchTerms: string[]) => {
                        const question = brandQuestions.find((b: any) => 
                          searchTerms.some(term => b.question?.toLowerCase().includes(term.toLowerCase()))
                        );
                        return question?.answer || null;
                      };
                      
                      const businessName = getBrandAnswer(['business name', 'company name', 'brand name', 'name']) || 
                                          brandQuestions[0]?.answer || 
                                          listing.title || 
                                          'Unnamed Business';
                      const businessDescription = getBrandAnswer(['description', 'about', 'business description']) || 
                                                 listing.description || 
                                                 '';
                      
                      // Extract from advertisement questions
                      const adQuestions = listing.advertisement || [];
                      const getAdAnswer = (searchTerms: string[]) => {
                        const question = adQuestions.find((a: any) => 
                          searchTerms.some(term => a.question?.toLowerCase().includes(term.toLowerCase()))
                        );
                        return question?.answer || null;
                      };
                      
                      // Get listing price
                      const askingPrice = getAdAnswer(['listing price', 'price']) || 
                                        getBrandAnswer(['asking price', 'price', 'selling price']) || 
                                        listing.price || 
                                        0;
                      const location = getBrandAnswer(['country', 'location', 'address']) || 
                                     listing.location || 
                                     'Not specified';
                      // Calculate business age from user account creation date for display
                      // Use user account creation date to show how long the business has been on the platform
                      const userCreatedAtForDisplay = listing.user?.created_at || listing.user?.createdAt;
                      const businessAgeForDisplay = userCreatedAtForDisplay ? formatBusinessAge(userCreatedAtForDisplay) : undefined;
                      const adDescription = getAdAnswer(['description']) || businessDescription;
                      
                      // Get image
                      let imageUrl = '';
                      const photoQuestion = adQuestions.find((a: any) => 
                        a.question?.toLowerCase().includes('photo') || a.answer_type === 'PHOTO'
                      );
                      if (photoQuestion?.answer) {
                        imageUrl = Array.isArray(photoQuestion.answer) ? photoQuestion.answer[0] : photoQuestion.answer;
                      }
                      if (!imageUrl) {
                        const brandInfo = brandQuestions[0];
                        imageUrl = brandInfo?.businessPhoto?.[0] || 
                                  brandInfo?.logo || 
                                  listing.image_url || 
                                  listing.photo || 
                                  "/placeholder.svg";
                      }
                      
                      // Calculate average financials from all financials
                      const allFinancials = listing.financials || [];
                      
                      let avgRevenue = 0;
                      let avgNetProfit = 0;
                      
                      // Check for financial table format (new format)
                      const tableFinancial = allFinancials.find((f: any) => 
                        f.name === '__FINANCIAL_TABLE__' && f.revenue_amount
                      );
                      
                      if (tableFinancial && tableFinancial.revenue_amount) {
                        try {
                          // Parse JSON data stored in revenue_amount field
                          const financialTableData = JSON.parse(tableFinancial.revenue_amount);
                          const rowLabels = financialTableData.rowLabels || [];
                          const columnLabels = financialTableData.columnLabels || [];
                          const financialData = financialTableData.financialData || {};
                          
                          if (columnLabels.length > 0 && rowLabels.length > 0) {
                            // Calculate net profit for each column
                            const columnProfits: number[] = [];
                            const columnRevenues: number[] = [];
                            
                            columnLabels.forEach((col: any) => {
                              let profit = 0;
                              let revenue = 0;
                              
                              rowLabels.forEach((rowLabel: string) => {
                                const value = parseFloat(financialData[rowLabel]?.[col.key] || '0');
                                if (rowLabel.toLowerCase().includes('revenue')) {
                                  profit += value;
                                  revenue += value;
                                } else {
                                  profit -= value;
                                }
                              });
                              
                              columnProfits.push(profit);
                              columnRevenues.push(revenue);
                            });
                            
                            // Calculate averages
                            if (columnProfits.length > 0) {
                              avgNetProfit = columnProfits.reduce((sum, p) => sum + p, 0) / columnProfits.length;
                              avgRevenue = columnRevenues.reduce((sum, r) => sum + r, 0) / columnRevenues.length;
                            }
                          }
                        } catch (e) {
                          console.error('Error parsing financial table data:', e);
                        }
                      }
                      
                      // If no table data or table data is empty, try old format
                      if (avgRevenue === 0 && avgNetProfit === 0) {
                        // Filter out the special table marker record
                        const validFinancials = allFinancials.filter((f: any) => f.name !== '__FINANCIAL_TABLE__');
                        
                        // Separate monthly and yearly financials
                        const monthlyFinancials = validFinancials.filter((f: any) => f.type === 'monthly');
                        const yearlyFinancials = validFinancials.filter((f: any) => f.type === 'yearly');
                        
                        // Calculate average from monthly data if available
                        if (monthlyFinancials.length > 0) {
                          const totalMonthlyRevenue = monthlyFinancials.reduce((sum: number, f: any) => 
                            sum + parseFloat(f.revenue_amount || 0), 0
                          );
                          const totalMonthlyProfit = monthlyFinancials.reduce((sum: number, f: any) => 
                            sum + parseFloat(f.net_profit || 0), 0
                          );
                          avgRevenue = totalMonthlyRevenue / monthlyFinancials.length;
                          avgNetProfit = totalMonthlyProfit / monthlyFinancials.length;
                        } else if (yearlyFinancials.length > 0) {
                          // If only yearly data, calculate average yearly and convert to monthly
                          const totalYearlyRevenue = yearlyFinancials.reduce((sum: number, f: any) => 
                            sum + parseFloat(f.revenue_amount || 0), 0
                          );
                          const totalYearlyProfit = yearlyFinancials.reduce((sum: number, f: any) => 
                            sum + parseFloat(f.net_profit || 0), 0
                          );
                          const avgYearlyRevenue = totalYearlyRevenue / yearlyFinancials.length;
                          const avgYearlyProfit = totalYearlyProfit / yearlyFinancials.length;
                          // Convert to monthly average
                          avgRevenue = avgYearlyRevenue / 12;
                          avgNetProfit = avgYearlyProfit / 12;
                        } else {
                          // Fallback: use all financials if type is not specified
                          if (validFinancials.length > 0) {
                            const totalRevenue = validFinancials.reduce((sum: number, f: any) => 
                              sum + parseFloat(f.revenue_amount || 0), 0
                            );
                            const totalProfit = validFinancials.reduce((sum: number, f: any) => 
                              sum + parseFloat(f.net_profit || 0), 0
                            );
                            avgRevenue = totalRevenue / validFinancials.length;
                            avgNetProfit = totalProfit / validFinancials.length;
                          }
                        }
                      }
                      
                      // Calculate multiples (using average monthly profit * 12 for annual)
                      let profitMultiple = "Multiple 1.5x Profit";
                      if (askingPrice && avgNetProfit > 0) {
                        const annualProfit = avgNetProfit * 12;
                        const multiple = parseFloat(askingPrice) / annualProfit;
                        profitMultiple = `Multiple ${multiple.toFixed(1)}x Profit`;
                      }
                      
                      // Calculate revenue multiple (using average monthly revenue * 12 for annual)
                      let revenueMultiple = "0.5x Revenue";
                      if (askingPrice && avgRevenue > 0) {
                        const annualRevenue = avgRevenue * 12;
                        const multiple = parseFloat(askingPrice) / annualRevenue;
                        revenueMultiple = `${multiple.toFixed(1)}x Revenue`;
                      }
                      
                      const categoryInfo = listing.category?.[0];
                      const listingKey = listing.id || `listing-${index}-${businessName}`;
                      
                      return (
                        <ListingCard
                          key={listingKey}
                          image={imageUrl}
                          category={categoryInfo?.name || 'Other'}
                          name={businessName}
                          description={adDescription || businessDescription}
                          price={`$${Number(askingPrice).toLocaleString()}`}
                          profitMultiple={profitMultiple}
                          revenueMultiple={revenueMultiple}
                          location={location}
                          locationFlag={location}
                          businessAge={businessAgeForDisplay}
                          netProfit={avgNetProfit > 0 ? `$${Math.round(avgNetProfit).toLocaleString()}` : undefined}
                          revenue={avgRevenue > 0 ? `$${Math.round(avgRevenue).toLocaleString()}` : undefined}
                          managedByEx={listing.managed_by_ex === true || listing.managed_by_ex === 1 || listing.managed_by_ex === 'true' || listing.managed_by_ex === '1'}
                          listingId={listing.id}
                          sellerId={listing.userId || listing.user_id}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex justify-center items-center" style={{ height: "400px" }}>
                    <p className="text-muted-foreground">No listings found matching your filters.</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllListings;


import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const useUserListings = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-listings", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");

      try {
        // Get all listings and filter by userId on frontend
        // TODO: Create backend endpoint /listing/user/:userId for better performance
        const response = await apiClient.getAllListings();
        
        if (response.success && response.data) {
          const allListings = Array.isArray(response.data) ? response.data : [];
          // Filter by userId
          const userListings = allListings.filter((listing: any) => 
            listing.userId === userId || listing.user_id === userId
          );
          
          // Sort by createdAt descending
          userListings.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
            const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          return userListings;
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching user listings:', error);
        throw error;
      }
    },
    enabled: !!userId,
  });
};

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const useUserFavorites = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-favorites", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");

      try {
        // Get favorites from backend (already includes listing data)
        const response = await apiClient.getFavorites();
        
        if (response.success && response.data) {
          const favorites = Array.isArray(response.data) ? response.data : [];
          
          // Backend returns favorites with listing included
          // Map to expected format
          return favorites.map((fav: any) => ({
            id: fav.id,
            user_id: fav.userId || userId,
            listing_id: fav.listingId || (fav.listing?.id),
            created_at: fav.createdAt || fav.created_at,
            listing: fav.listing || null,
          }));
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching user favorites:', error);
        throw error;
      }
    },
    enabled: !!userId,
  });
};

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const useUserDetails = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-details", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");

      console.log('Fetching user details for:', userId);

      try {
        // Get user profile from backend
        const userResponse = await apiClient.getUserById(userId);
        
        if (!userResponse.success || !userResponse.data) {
          console.log('No user found for:', userId);
          // Return default empty profile if not found
          return {
            profile: {
              id: userId,
              full_name: null,
              avatar_url: null,
              bio: null,
              company_name: null,
              location: null,
              phone: null,
              website: null,
              user_type: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            listingsCount: 0,
            favoritesCount: 0,
            chatsCount: 0,
          };
        }

        const userData = (userResponse.data as any).data || userResponse.data;
        console.log('User found:', userData);

        // Get favorites count
        let favoritesCount = 0;
        try {
          const favResponse = await apiClient.getFavorites();
          if (favResponse.success && favResponse.data) {
            const favorites = Array.isArray(favResponse.data) ? favResponse.data : [];
            favoritesCount = favorites.length;
          }
        } catch (error) {
          console.error('Error fetching favorites count:', error);
        }

        // Get chats count
        let chatsCount = 0;
        try {
          const userChatsResponse = await apiClient.getChatRoomsByUserId(userId);
          const sellerChatsResponse = await apiClient.getChatRoomsBySellerId(userId);
          
          const userChats = (userChatsResponse.success && userChatsResponse.data) 
            ? (Array.isArray(userChatsResponse.data) ? userChatsResponse.data : [])
            : [];
          const sellerChats = (sellerChatsResponse.success && sellerChatsResponse.data)
            ? (Array.isArray(sellerChatsResponse.data) ? sellerChatsResponse.data : [])
            : [];
          
          // Combine and deduplicate by chat ID
          const allChatIds = new Set([
            ...userChats.map((c: any) => c.id),
            ...sellerChats.map((c: any) => c.id)
          ]);
          chatsCount = allChatIds.size;
        } catch (error) {
          console.error('Error fetching chats count:', error);
        }

        // Map backend user data to frontend profile format
        const profile = {
          id: userData.id,
          full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null,
          avatar_url: userData.profile_pic || null,
          bio: null, // Not in backend schema
          company_name: userData.business_name || null,
          location: userData.city && userData.country 
            ? `${userData.city}, ${userData.country}` 
            : userData.city || userData.country || null,
          phone: userData.phone || null,
          website: null, // Not in backend schema
          user_type: userData.role || null,
          created_at: userData.created_at || new Date().toISOString(),
          updated_at: userData.updated_at || new Date().toISOString(),
        };

        console.log('User stats:', {
          listingsCount: 0, // Will be calculated separately if needed
          favoritesCount,
          chatsCount
        });

        return {
          profile,
          listingsCount: 0, // TODO: Get from listings endpoint when available
          favoritesCount,
          chatsCount,
        };
      } catch (error) {
        console.error('Error fetching user details:', error);
        throw error;
      }
    },
    enabled: !!userId,
    retry: 2,
  });
};

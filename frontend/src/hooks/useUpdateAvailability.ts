import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      console.log('Updating availability:', { userId, status });
      
      // Map frontend status to backend format
      // Backend schema has is_online (Boolean), but we'll try availability_status first
      // If backend doesn't support it, we might need to map to is_online
      const response = await apiClient.updateUser(userId, {
        availability_status: status,
      });

      console.log('Update availability response:', response);
      console.log('Response data type:', typeof response.data);
      console.log('Response data is array:', Array.isArray(response.data));

      if (!response.success) {
        throw new Error(response.error || "Failed to update availability status");
      }

      // Backend returns the updated user object directly (not wrapped in an array)
      // Handle both single object and array responses
      let userData = response.data;
      if (Array.isArray(userData) && userData.length > 0) {
        userData = userData[0];
      }

      return userData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Availability status updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating availability:", error);
      toast.error("Failed to update availability status", {
        description: error.message,
      });
    },
  });
};
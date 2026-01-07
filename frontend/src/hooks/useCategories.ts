import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const useCategories = (options?: { nocache?: boolean }) => {
  return useQuery({
    queryKey: ["categories", options?.nocache ? "nocache" : "cached"],
    queryFn: async () => {
      const response = await apiClient.getCategories(options?.nocache ? "true" : undefined);
      console.log('Categories API Response:', response);
      console.log('Response success:', response.success);
      console.log('Response data type:', typeof response.data);
      console.log('Response data is array:', Array.isArray(response.data));
      
      if (!response.success) {
        console.error('Categories fetch failed:', response.error);
        throw new Error(response.error || "Failed to fetch categories");
      }
      
      // Ensure we return an array
      const categories = Array.isArray(response.data) ? response.data : [];
      console.log('📦 Total categories from API:', categories.length, 'items');
      console.log('📋 Category names:', categories.map((c: any) => c?.name).filter(Boolean));
      
      // Filter out only truly invalid categories (no name at all, or explicitly invalid names)
      const validCategories = categories.filter((cat: any) => {
        if (!cat) {
          console.warn('⚠️ Filtering out null/undefined category');
          return false;
        }
        if (!cat.name) {
          console.warn('⚠️ Filtering out category without name:', cat);
          return false;
        }
        const name = String(cat.name).trim();
        if (name === '') {
          console.warn('⚠️ Filtering out category with empty name:', cat);
          return false;
        }
        // Only filter out explicitly invalid test data - be very conservative
        // Don't filter out categories that might be valid (like "undefine new" which is different from "undefined")
        const lowerName = name.toLowerCase();
        if (lowerName === 'undefined' || lowerName === 'string' || lowerName === 'null') {
          console.warn('⚠️ Filtering out invalid test category:', name, 'ID:', cat.id);
          return false;
        }
        return true;
      });
      
      console.log('✅ Valid categories after filtering:', validCategories.length);
      if (categories.length !== validCategories.length) {
        const filtered = categories.filter(cat => {
          if (!cat || !cat.name) return true;
          const name = String(cat.name).trim();
          if (name === '') return true;
          const lowerName = name.toLowerCase();
          return lowerName === 'undefined' || lowerName === 'string' || lowerName === 'null';
        });
        console.log('📋 Filtered out categories:', filtered.map((c: any) => ({ id: c?.id, name: c?.name })));
      }
      
      // Deduplicate by name (case-insensitive) - keep the first occurrence (most recent due to backend ordering)
      const seen = new Map<string, any>();
      const uniqueCategories: any[] = [];
      const duplicates: any[] = [];
      
      for (const category of validCategories) {
        const nameKey = String(category.name).trim().toLowerCase();
        
        if (!seen.has(nameKey)) {
          seen.set(nameKey, category);
          uniqueCategories.push(category);
        } else {
          const existing = seen.get(nameKey);
          duplicates.push({ existing: existing, duplicate: category });
          console.warn(`⚠️ Duplicate category found: "${category.name}" (IDs: ${existing.id} vs ${category.id}). Keeping first occurrence.`);
        }
      }
      
      console.log('✅ Final unique categories:', uniqueCategories.length);
      console.log('📊 Summary:', {
        totalFromAPI: categories.length,
        afterFiltering: validCategories.length,
        afterDeduplication: uniqueCategories.length,
        filteredOut: categories.length - validCategories.length,
        duplicatesRemoved: validCategories.length - uniqueCategories.length,
        totalRemoved: categories.length - uniqueCategories.length
      });
      
      if (duplicates.length > 0) {
        console.log('📋 Duplicate categories removed:', duplicates.map(d => ({
          name: d.duplicate.name,
          keptId: d.existing.id,
          removedId: d.duplicate.id
        })));
      }
      
      // If we're missing categories, show a warning
      if (categories.length > uniqueCategories.length) {
        console.warn(`⚠️ WARNING: ${categories.length - uniqueCategories.length} categories were filtered/removed. Check console for details.`);
        console.log('📋 All categories from API:', categories.map((c: any) => ({
          id: c?.id,
          name: c?.name,
          isValid: validCategories.includes(c),
          isUnique: uniqueCategories.includes(c)
        })));
      }
      
      return uniqueCategories;
    },
  });
};

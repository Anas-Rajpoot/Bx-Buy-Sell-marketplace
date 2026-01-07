import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { usePlans } from "@/hooks/usePlans";
import { Check, Crown } from "lucide-react";
import { useBrandQuestions } from "@/hooks/useBrandQuestions";
import { useStatisticQuestions } from "@/hooks/useStatisticQuestions";
import { useProductQuestions } from "@/hooks/useProductQuestions";
import { useManagementQuestions } from "@/hooks/useManagementQuestions";
import { useAdInformationQuestions } from "@/hooks/useAdInformationQuestions";
import { useHandoverQuestions } from "@/hooks/useHandoverQuestions";
import { useAccounts } from "@/hooks/useAccounts";
import { useAccountQuestions } from "@/hooks/useAccountQuestions";

interface PackagesStepProps {
  formData: any;
  listingId?: string;
  onBack: () => void;
}

export const PackagesStep = ({ formData, listingId, onBack }: PackagesStepProps) => {
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingStatus, setListingStatus] = useState<"DRAFT" | "PUBLISH">(
    formData.listingStatus === 'PUBLISH' ? 'PUBLISH' : 'DRAFT'
  );
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: brandQuestions } = useBrandQuestions();
  const { data: statisticQuestions } = useStatisticQuestions();
  const { data: productQuestions } = useProductQuestions();
  const { data: managementQuestions } = useManagementQuestions();
  const { data: adQuestions } = useAdInformationQuestions();
  const { data: handoverQuestions } = useHandoverQuestions();
  const { data: socialAccounts } = useAccounts();
  const { data: accountQuestions } = useAccountQuestions();
  
  console.log("Form data accumulated:", formData);
  console.log("Selected package:", selectedPackage);
  console.log("Listing status:", listingStatus);

  // Helper function to transform question answers to Question format
  const transformQuestions = (questions: any[], answers: Record<string, any>, answerFor: string) => {
    if (!questions || !Array.isArray(questions)) return [];
    
    // Valid answer types according to backend DTO
    const validAnswerTypes = ['TEXT', 'SELECT', 'BOOLEAN', 'NUMBER', 'FILE', 'PHOTO'];
    
    return questions.map((question) => {
      const answer = answers[question.id];
      
      // Skip unanswered questions (but allow 0 and false as valid answers)
      if (answer === null || answer === undefined || answer === '') {
        return null;
      }
      
      // Convert answer to string and ensure it's at least 2 characters
      let answerStr = '';
      if (Array.isArray(answer)) {
        answerStr = answer.join(', ');
      } else {
        answerStr = String(answer);
      }
      
      // Skip if answer is too short (backend requires min 2 characters)
      if (answerStr.length < 2) {
        console.warn(`Skipping question "${question.question}" - answer too short: "${answerStr}"`);
        return null;
      }
      
      // Map answer_type: if it's not in the valid list, default to TEXT
      // This handles cases like 'DATE' which should be converted to 'TEXT'
      let answerType = question.answer_type || 'TEXT';
      if (!validAnswerTypes.includes(answerType)) {
        console.warn(`Invalid answer_type "${answerType}" for question "${question.question}", converting to TEXT`);
        answerType = 'TEXT';
      }
      
      // Ensure question text is at least 2 characters if provided
      const questionText = question.question || '';
      if (questionText && questionText.length < 2) {
        console.warn(`Question text too short: "${questionText}", skipping`);
        return null;
      }
      
      return {
        question: questionText,
        answer: answerStr,
        answer_type: answerType,
        answer_for: answerFor,
        option: question.option || [],
      };
    }).filter(q => q !== null);
  };

  // Helper function to transform financials
  const transformFinancials = () => {
    // Check for new table format (financialData, rowLabels, columnLabels)
    if (formData.financialData && formData.rowLabels && formData.columnLabels) {
      // Store the table structure as JSON in revenue_amount field
      // Use special marker name and 'yearly' type to be backend-compatible
      const tableData = {
        financialType: formData.financialType || 'detailed',
        rowLabels: formData.rowLabels,
        columnLabels: formData.columnLabels,
        financialData: formData.financialData,
      };
      
      return [{
        type: 'yearly' as const, // Backend requires 'monthly' or 'yearly'
        name: '__FINANCIAL_TABLE__', // Special marker name
        revenue_amount: JSON.stringify(tableData), // Store JSON data here
        annual_cost: '0',
        net_profit: '0',
      }];
    }
    
    // Fallback to old format for backward compatibility
    if (!formData.months || !Array.isArray(formData.months)) return [];
    
    return formData.months
      .filter((month: any) => {
        const revenue = parseFloat(month.revenue || month.revenue2 || '0');
        const cost = parseFloat(month.cost || '0');
        return revenue > 0 || cost > 0;
      })
      .map((month: any) => {
        const revenue = parseFloat(month.revenue || month.revenue2 || '0');
        const cost = parseFloat(month.cost || '0');
        const profit = revenue - cost;
        
        return {
          type: formData.financialType === 'yearly' ? 'yearly' : 'monthly',
          name: month.period || month.month || 'Financial Period',
          revenue_amount: String(revenue),
          annual_cost: String(cost),
          net_profit: String(profit),
        };
      });
  };

  // Helper function to transform social accounts
  const transformSocialAccounts = () => {
    if (!formData.socialAccounts || typeof formData.socialAccounts !== 'object') return [];
    
    const accounts: any[] = [];
    Object.keys(formData.socialAccounts).forEach((platform) => {
      const accountData = formData.socialAccounts[platform];
      if (accountData && (accountData.url || accountData.followers)) {
        // Ensure answer is at least 2 characters
        const answer = accountData.url || `${accountData.followers || 0} followers`;
        if (answer.length < 2) {
          console.warn(`Skipping ${platform} account - answer too short: "${answer}"`);
          return;
        }
        
        accounts.push({
          question: `${platform} account`,
          answer: answer,
          answer_type: 'TEXT',
          answer_for: 'SOCIAL',
          option: [],
        });
      }
    });
    
    return accounts;
  };

  const handleSubmit = async () => {
    // Package selection is optional - no validation required
    setIsSubmitting(true);
    
    try {
      // Fetch categories and tools to get names from IDs
      const categoriesResponse = await apiClient.getCategories();
      const toolsResponse = await apiClient.getTools();
      
      const categories = categoriesResponse.success && Array.isArray(categoriesResponse.data) 
        ? categoriesResponse.data 
        : [];
      const tools = toolsResponse.success && Array.isArray(toolsResponse.data) 
        ? toolsResponse.data 
        : [];
      
      // Transform category from ID to { name }
      let categoryArray: any[] = [];
      if (formData.category) {
        if (Array.isArray(formData.category)) {
          // If category is already an array, map each ID to name
          categoryArray = formData.category.map((catId: string) => {
            const cat = categories.find((c: any) => c.id === catId);
            return { name: cat?.name || catId };
          });
        } else {
          // If category is a single ID, find the name
          const categoryName = categories.find((c: any) => c.id === formData.category)?.name || formData.category;
          if (categoryName) {
            categoryArray = [{ name: categoryName }];
          }
        }
      }
      
      // Transform tools from IDs to { name }
      const toolsArray = (formData.tools || []).map((toolId: string) => {
        const tool = tools.find((t: any) => t.id === toolId);
        return { name: tool?.name || toolId };
      });
      
      // Transform all question-based data
      const brandArray = transformQuestions(brandQuestions || [], formData, 'BRAND');
      const statisticsArray = transformQuestions(statisticQuestions || [], formData, 'STATISTIC');
      const productQuestionArray = transformQuestions(productQuestions || [], formData, 'PRODUCT');
      const managementQuestionArray = transformQuestions(managementQuestions || [], formData, 'MANAGEMENT');
      const advertisementArray = transformQuestions(adQuestions || [], formData, 'ADVERTISMENT');
      const handoverArray = transformQuestions(handoverQuestions || [], formData, 'HANDOVER');
      const socialAccountPlatformsArray = transformSocialAccounts();
      // Transform account questions (questions created by admin)
      const accountQuestionsArray = transformQuestions(
        accountQuestions || [], 
        formData.socialAccountQuestions || {}, 
        'SOCIAL'
      );
      // Combine social account platforms and account questions
      const socialAccountArray = [...socialAccountPlatformsArray, ...accountQuestionsArray];
      
      // Transform financials
      const financialsArray = transformFinancials();
      console.log('💰 Transformed financials array:', JSON.stringify(financialsArray, null, 2));
      
      // Prepare listing data for API
      // Backend REQUIRES these fields as arrays (even if empty):
      // - productQuestion, managementQuestion, social_account
      // Other fields can be omitted if empty
      const listingPayload: any = {
        status: listingStatus, // Use selected status (DRAFT or PUBLISH)
        // Required fields - always send as arrays (even if empty)
        productQuestion: productQuestionArray, // REQUIRED by backend
        managementQuestion: managementQuestionArray, // REQUIRED by backend
        social_account: socialAccountArray, // REQUIRED by backend
        // Other required fields
        brand: brandArray.length > 0 ? brandArray : [],
        category: categoryArray.length > 0 ? categoryArray : [],
        tools: toolsArray.length > 0 ? toolsArray : [],
        financials: financialsArray.length > 0 ? financialsArray : [],
        statistics: statisticsArray.length > 0 ? statisticsArray : [],
        advertisement: advertisementArray.length > 0 ? advertisementArray : [],
        handover: handoverArray.length > 0 ? handoverArray : [],
      };

      // Optional fields - only include if they have data
      if (formData.portfolioLink && formData.portfolioLink.trim()) {
        listingPayload.portfolioLink = formData.portfolioLink.trim();
      }
      
      console.log("Transformed listing payload:", JSON.stringify(listingPayload, null, 2));

      console.log("Submitting listing:", listingPayload);

      let response;
      if (listingId) {
        // Update existing listing
        response = await apiClient.updateListing(listingId, listingPayload);
      } else {
        // Create new listing
        response = await apiClient.createListing(listingPayload);
      }

      if (response.success) {
        const statusMessage = listingId
          ? (listingStatus === 'PUBLISH' 
              ? "Listing updated and published successfully!" 
              : "Listing updated successfully!")
          : (listingStatus === 'PUBLISH' 
              ? "Listing published successfully!" 
              : "Listing created successfully! You can publish it later from My Listings.");
        toast.success(statusMessage);
        console.log(listingId ? "Updated listing:" : "Created listing:", response.data);
        
        // Redirect to my listings page after short delay
        setTimeout(() => {
          window.location.href = '/my-listings';
        }, 1500);
      } else {
        console.error(`Failed to ${listingId ? 'update' : 'create'} listing:`, response.error);
        const errorMessage = response.error || "Failed to create listing";
        toast.error(errorMessage);
        
        // If it's a validation error, show more details
        if (typeof errorMessage === 'string' && errorMessage.includes('_errors')) {
          try {
            const errorObj = JSON.parse(errorMessage);
            console.error("Validation errors:", errorObj);
          } catch (e) {
            // Not JSON, just show the error as is
          }
        }
      }
    } catch (error) {
      console.error("Error creating listing:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (plansLoading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Packages</h1>
        <div className="text-muted-foreground">Loading packages...</div>
      </div>
    );
  }

  // Determine if a plan is premium based on type or price
  const isPremiumPlan = (plan: any) => {
    return plan.type?.toLowerCase() === "premium" || 
           plan.title?.toLowerCase().includes("premium") ||
           parseFloat(plan.price?.replace(/[^0-9.]/g, '') || '0') > 0;
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Packages</h1>

      {/* Status Selection */}
      <div className="mb-8 p-6 bg-card rounded-xl border border-border">
        <h2 className="text-xl font-semibold mb-4">Listing Status</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setListingStatus("DRAFT")}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              listingStatus === "DRAFT"
                ? "bg-accent text-black"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Save as Draft
          </button>
          <button
            onClick={() => setListingStatus("PUBLISH")}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              listingStatus === "PUBLISH"
                ? "bg-accent text-black"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Publish Now
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {listingStatus === "DRAFT" 
            ? "Your listing will be saved as a draft. You can publish it later from My Listings."
            : "Your listing will be published immediately and visible to all users."}
        </p>
      </div>

      <div className="bg-black rounded-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans && plans.length > 0 ? (
            plans.map((plan: any) => {
              const isPremium = isPremiumPlan(plan);
              const isSelected = selectedPackage === plan.id;
              
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPackage(plan.id)}
                  className={`relative rounded-xl p-8 cursor-pointer transition-all ${
                    isPremium
                      ? "bg-[#a3e635] text-black"
                      : "bg-white text-black"
                  } ${
                    isSelected
                      ? "ring-4 ring-[#a3e635] ring-offset-2 ring-offset-black"
                      : ""
                  }`}
                >
                  {/* Tag */}
                  <div className="absolute top-4 right-4">
                    {isPremium ? (
                      <div className="bg-black text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-semibold">
                        <Crown className="h-3 w-3" />
                        Premium
                      </div>
                    ) : (
                      <div className="bg-gray-200 text-black px-3 py-1 rounded-full flex items-center gap-1 text-xs font-semibold">
                        <div className="h-2 w-2 rounded-full bg-black"></div>
                        Free
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold mb-2 pr-20">{plan.title}</h3>
                  
                  {/* Description */}
                  <p className="text-sm mb-6 opacity-80">{plan.description}</p>
                  
                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price?.split('/')[0] || plan.price}</span>
                    {plan.price?.includes('/') && (
                      <span className="text-lg ml-1">/{plan.price.split('/')[1]}</span>
                    )}
                  </div>

                  {/* Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPackage(plan.id);
                    }}
                    className={`w-full rounded-lg py-3 font-semibold mb-6 transition-all ${
                      isPremium
                        ? "bg-black text-white hover:bg-gray-900"
                        : "bg-[#a3e635] text-black hover:bg-[#84cc16]"
                    }`}
                  >
                    {isPremium ? "Subscribe Now" : "FREE Starter Plan"}
                  </button>

                  {/* Features */}
                  {plan.feature && plan.feature.length > 0 && (
                    <div className="space-y-3">
                      {plan.feature.map((feature: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`mt-1 flex-shrink-0 ${
                            isPremium ? "text-black" : "text-black"
                          }`}>
                            <Check className="h-5 w-5" />
                          </div>
                          <p className="text-sm">{feature}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center text-white py-12">
              <p className="text-muted-foreground">No packages available. Please contact support.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-accent hover:bg-accent/90 text-accent-foreground ml-auto px-16"
        >
          {isSubmitting 
            ? (listingStatus === "PUBLISH" ? "Publishing..." : "Saving...") 
            : (listingStatus === "PUBLISH" ? "Publish Listing" : "Save as Draft")}
        </Button>
      </div>
    </div>
  );
};

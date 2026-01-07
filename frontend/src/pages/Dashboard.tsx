import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CategoryStep } from "@/components/dashboard/steps/CategoryStep";
import { BrandInformationStep } from "@/components/dashboard/steps/BrandInformationStep";
import { ToolsStep } from "@/components/dashboard/steps/ToolsStep";
import { FinancialsStep } from "@/components/dashboard/steps/FinancialsStep";
import { AdditionalInformationStep } from "@/components/dashboard/steps/AdditionalInformationStep";
import { StatisticsStep } from "@/components/dashboard/steps/StatisticsStep";
import { ProductsStep } from "@/components/dashboard/steps/ProductsStep";
import { ManagementStep } from "@/components/dashboard/steps/ManagementStep";
import { AccountsStep } from "@/components/dashboard/steps/AccountsStep";
import { AdInformationsStep } from "@/components/dashboard/steps/AdInformationsStep";
import { HandoverStep } from "@/components/dashboard/steps/HandoverStep";
import { PackagesStep } from "@/components/dashboard/steps/PackagesStep";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

export type DashboardStep = 
  | "category" 
  | "brand-information" 
  | "tools" 
  | "financials" 
  | "additional-information"
  | "statistics"
  | "products"
  | "management"
  | "accounts" 
  | "ad-informations" 
  | "handover" 
  | "packages";

const Dashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeStep, setActiveStep] = useState<DashboardStep>("category");
  const [formData, setFormData] = useState<any>({});
  const [loadingListing, setLoadingListing] = useState(false);
  const isEditMode = !!id;
  const hasLoadedListingRef = useRef(false);
  const loadedListingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Load listing data if in edit mode
  useEffect(() => {
    // Only load if:
    // 1. We're in edit mode
    // 2. We have an id
    // 3. We have a user ID
    // 4. We haven't already loaded this listing (or the listing ID changed)
    if (isEditMode && id && user?.id) {
      // Check if we've already loaded this specific listing
      if (!hasLoadedListingRef.current || loadedListingIdRef.current !== id) {
        hasLoadedListingRef.current = true;
        loadedListingIdRef.current = id;
        loadListingData();
      }
    }
  }, [isEditMode, id, user?.id]); // Use user?.id instead of user to prevent re-runs

  const loadListingData = async () => {
    if (!id) return;
    
    setLoadingListing(true);
    try {
      // Fetch listing and all question types in parallel
      const [listingResponse, brandQuestionsRes, statisticQuestionsRes, productQuestionsRes, 
              managementQuestionsRes, adQuestionsRes, handoverQuestionsRes, accountsRes] = await Promise.all([
        apiClient.getListingById(id),
        apiClient.getAdminQuestionsByType("BRAND"),
        apiClient.getAdminQuestionsByType("STATISTIC"),
        apiClient.getAdminQuestionsByType("PRODUCT"),
        apiClient.getAdminQuestionsByType("MANAGEMENT"),
        apiClient.getAdminQuestionsByType("ADVERTISMENT"),
        apiClient.getAdminQuestionsByType("HANDOVER"),
        apiClient.getSocialAccounts(),
      ]);
      
      if (!listingResponse.success || !listingResponse.data) {
        toast.error("Failed to load listing data");
        navigate("/my-listings");
        return;
      }
      
      // Type the listing properly to avoid TypeScript errors
      const listing = listingResponse.data as any;
      
      // Extract question arrays
      const brandQuestions = brandQuestionsRes.success && Array.isArray(brandQuestionsRes.data) ? brandQuestionsRes.data : [];
      const statisticQuestions = statisticQuestionsRes.success && Array.isArray(statisticQuestionsRes.data) ? statisticQuestionsRes.data : [];
      const productQuestions = productQuestionsRes.success && Array.isArray(productQuestionsRes.data) ? productQuestionsRes.data : [];
      const managementQuestions = managementQuestionsRes.success && Array.isArray(managementQuestionsRes.data) ? managementQuestionsRes.data : [];
      const adQuestions = adQuestionsRes.success && Array.isArray(adQuestionsRes.data) ? adQuestionsRes.data : [];
      const handoverQuestions = handoverQuestionsRes.success && Array.isArray(handoverQuestionsRes.data) ? handoverQuestionsRes.data : [];
      const socialAccounts = accountsRes.success && Array.isArray(accountsRes.data) ? accountsRes.data : [];
      
      // Helper function to match question text to question ID
      const matchQuestionToId = (questionText: string, questions: any[]): string | null => {
        if (!questionText) return null;
        const normalizedText = questionText.toLowerCase().trim();
        const match = questions.find((q: any) => 
          q.question && q.question.toLowerCase().trim() === normalizedText
        );
        return match?.id || null;
      };
      
      // Transform listing data from API format to form data format
      const transformedData: any = {};
      
      // Extract category
      if (listing.category && Array.isArray(listing.category) && listing.category.length > 0) {
        transformedData.category = listing.category[0].id || listing.category[0].name;
      }
      
      // Extract brand questions - match by question text
      if (listing.brand && Array.isArray(listing.brand)) {
        listing.brand.forEach((item: any) => {
          if (item.question) {
            const questionId = matchQuestionToId(item.question, brandQuestions);
            if (questionId && item.answer) {
              transformedData[questionId] = item.answer;
            }
          }
        });
      }
      
      // Extract statistics questions
      if (listing.statistics && Array.isArray(listing.statistics)) {
        listing.statistics.forEach((item: any) => {
          if (item.question) {
            const questionId = matchQuestionToId(item.question, statisticQuestions);
            if (questionId && item.answer) {
              transformedData[questionId] = item.answer;
            }
          }
        });
      }
      
      // Extract product questions
      if (listing.productQuestion && Array.isArray(listing.productQuestion)) {
        listing.productQuestion.forEach((item: any) => {
          if (item.question) {
            const questionId = matchQuestionToId(item.question, productQuestions);
            if (questionId && item.answer) {
              transformedData[questionId] = item.answer;
            }
          }
        });
      }
      
      // Extract management questions
      if (listing.managementQuestion && Array.isArray(listing.managementQuestion)) {
        listing.managementQuestion.forEach((item: any) => {
          if (item.question) {
            const questionId = matchQuestionToId(item.question, managementQuestions);
            if (questionId && item.answer) {
              transformedData[questionId] = item.answer;
            }
          }
        });
      }
      
      // Extract advertisement questions
      if (listing.advertisement && Array.isArray(listing.advertisement)) {
        listing.advertisement.forEach((item: any) => {
          if (item.question) {
            const questionId = matchQuestionToId(item.question, adQuestions);
            if (questionId && item.answer) {
              transformedData[questionId] = item.answer;
            }
          }
        });
      }
      
      // Extract handover questions
      if (listing.handover && Array.isArray(listing.handover)) {
        listing.handover.forEach((item: any) => {
          if (item.question) {
            const questionId = matchQuestionToId(item.question, handoverQuestions);
            if (questionId && item.answer) {
              transformedData[questionId] = item.answer;
            }
          }
        });
      }
      
      // Extract financials
      if (listing.financials && Array.isArray(listing.financials)) {
        const months = listing.financials.map((fin: any) => ({
          period: fin.name || '',
          revenue: fin.revenue_amount || '0',
          revenue2: fin.revenue_amount || '0',
          cost: fin.annual_cost || '0',
        }));
        transformedData.months = months;
        transformedData.financialType = listing.financials[0]?.type === 'yearly' ? 'yearly' : 'monthly';
      }
      
      // Extract tools
      if (listing.tools && Array.isArray(listing.tools)) {
        transformedData.tools = listing.tools.map((tool: any) => tool.id || tool.name);
      }
      
      // Extract social accounts - need to match by platform and question text
      if (listing.social_account && Array.isArray(listing.social_account)) {
        const socialAccountsData: any = {};
        listing.social_account.forEach((acc: any) => {
          // Try to find platform by matching question text or answer_for
          const platform = socialAccounts.find((sa: any) => 
            acc.answer_for && sa.social_account_option?.toLowerCase().includes(acc.answer_for.toLowerCase())
          );
          
          if (platform) {
            const platformId = platform.id;
            if (!socialAccountsData[platformId]) {
              socialAccountsData[platformId] = {};
            }
            // For social accounts, we need to match the question text to get the question ID
            // This is complex, so we'll store by question text for now
            if (acc.question && acc.answer) {
              // Try to find matching question in adQuestions (social account questions might be there)
              const questionId = matchQuestionToId(acc.question, adQuestions);
              if (questionId) {
                socialAccountsData[platformId][questionId] = acc.answer;
              }
            }
          }
        });
        transformedData.socialAccounts = socialAccountsData;
      }
      
      // Extract portfolio link
      if (listing.portfolioLink) {
        transformedData.portfolioLink = listing.portfolioLink;
      }
      
      // Set status
      if (listing.status) {
        transformedData.listingStatus = listing.status === 'PUBLISH' ? 'PUBLISH' : 'DRAFT';
      }
      
      setFormData(transformedData);
      toast.success("Listing data loaded successfully");
    } catch (error: any) {
      console.error("Error loading listing:", error);
      toast.error("Failed to load listing data");
      navigate("/my-listings");
    } finally {
      setLoadingListing(false);
    }
  };

  const updateFormData = (stepData: any) => {
    setFormData((prev: any) => ({ ...prev, ...stepData }));
  };

  const renderStep = () => {
    switch (activeStep) {
      case "category":
        return <CategoryStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("brand-information"); }} />;
      case "brand-information":
        return <BrandInformationStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("tools"); }} onBack={() => setActiveStep("category")} />;
      case "tools":
        return <ToolsStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("financials"); }} onBack={() => setActiveStep("brand-information")} />;
      case "financials":
        return <FinancialsStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("additional-information"); }} onBack={() => setActiveStep("tools")} />;
      case "additional-information":
        return <AdditionalInformationStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("accounts"); }} onBack={() => setActiveStep("financials")} defaultTab="statistics" />;
      case "statistics":
        return <AdditionalInformationStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("accounts"); }} onBack={() => setActiveStep("financials")} defaultTab="statistics" />;
      case "products":
        return <AdditionalInformationStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("accounts"); }} onBack={() => setActiveStep("financials")} defaultTab="products" />;
      case "management":
        return <AdditionalInformationStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("accounts"); }} onBack={() => setActiveStep("financials")} defaultTab="management" />;
      case "accounts":
        return <AccountsStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("ad-informations"); }} onBack={() => setActiveStep("management")} />;
      case "ad-informations":
        return <AdInformationsStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("handover"); }} onBack={() => setActiveStep("accounts")} />;
      case "handover":
        return <HandoverStep formData={formData} onNext={(data) => { updateFormData(data); setActiveStep("packages"); }} onBack={() => setActiveStep("ad-informations")} />;
      case "packages":
        return <PackagesStep formData={formData} listingId={id} onBack={() => setActiveStep("handover")} />;
      default:
        return null;
    }
  };

  if (authLoading || loadingListing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{loadingListing ? "Loading listing data..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <DashboardSidebar activeStep={activeStep} onStepChange={setActiveStep} isMobile={false} />
      
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {/* Mobile Header with Hamburger Menu */}
        <div className="md:hidden border-b border-border bg-background sticky top-0 z-40">
          <div className="flex items-center gap-3 px-4 py-3">
            <DashboardSidebar activeStep={activeStep} onStepChange={setActiveStep} isMobile={true} />
            <h1 className="text-lg font-semibold">Create Listing</h1>
          </div>
        </div>
        
        {/* Desktop Header */}
        <div className="hidden md:block">
          <DashboardHeader user={user} />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {renderStep()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

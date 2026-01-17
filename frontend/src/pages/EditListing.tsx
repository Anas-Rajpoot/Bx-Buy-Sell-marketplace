import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useBrandQuestions } from "@/hooks/useBrandQuestions";
import { useStatisticQuestions } from "@/hooks/useStatisticQuestions";
import { useProductQuestions } from "@/hooks/useProductQuestions";
import { useManagementQuestions } from "@/hooks/useManagementQuestions";
import { useAdInformationQuestions } from "@/hooks/useAdInformationQuestions";
import { useHandoverQuestions } from "@/hooks/useHandoverQuestions";
import { useCategories } from "@/hooks/useCategories";
import { useTools } from "@/hooks/useTools";
import { useAccounts } from "@/hooks/useAccounts";
import { useAccountQuestions } from "@/hooks/useAccountQuestions";

const EditListing = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasLoadedRef = useRef(false);
  const loadedIdRef = useRef<string | null>(null);

  // Fetch all question types
  const { data: brandQuestions = [] } = useBrandQuestions();
  const { data: statisticQuestions = [] } = useStatisticQuestions();
  const { data: productQuestions = [] } = useProductQuestions();
  const { data: managementQuestions = [] } = useManagementQuestions();
  const { data: adQuestions = [] } = useAdInformationQuestions();
  const { data: handoverQuestions = [] } = useHandoverQuestions();
  const { data: categories = [] } = useCategories();
  const { data: tools = [] } = useTools();
  const { data: socialAccounts = [] } = useAccounts();
  const { data: accountQuestions = [] } = useAccountQuestions();
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());

  // Fetch listing data
  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const response = await apiClient.getListingById(id!);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch listing");
      }
      return response.data;
    },
    enabled: !!id,
  });

  // Load listing data into form when it's fetched
  // Re-run when questions load to ensure proper matching
  useEffect(() => {
    if (!listing || !id) return;
    
    // Check if this is a new listing (ID changed)
    if (loadedIdRef.current !== id) {
      // Reset flags for new listing
      hasLoadedRef.current = false;
      loadedIdRef.current = id;
      setFormData({}); // Clear form data for new listing
    }
    
    // Load if we haven't loaded this listing yet
    if (!hasLoadedRef.current) {
      console.log('Initial load of listing data');
      hasLoadedRef.current = true;
      loadListingIntoForm();
    } else {
      // If we've already loaded but questions are now available, try reloading
      // This handles the case where questions load after the listing
      const hasQuestions = brandQuestions.length > 0 || 
                          statisticQuestions.length > 0 || 
                          productQuestions.length > 0 || 
                          managementQuestions.length > 0 || 
                          adQuestions.length > 0 || 
                          handoverQuestions.length > 0 ||
                          accountQuestions.length > 0 ||
                          socialAccounts.length > 0;
      
      if (hasQuestions) {
        // Check if form data seems incomplete (only has category/status)
        const currentKeys = Object.keys(formData);
        const hasOnlyBasicData = currentKeys.length <= 2 && 
                                 (currentKeys.includes('category') || currentKeys.includes('listingStatus'));
        const needsSocialReload = Array.isArray(listing?.social_account) &&
          listing.social_account.length > 0 &&
          (socialAccounts.length > 0 || accountQuestions.length > 0) &&
          (!formData.socialAccounts || !formData.socialAccountQuestions);
        
        if (hasOnlyBasicData || needsSocialReload) {
          console.log('Re-loading form data now that questions are available');
          loadListingIntoForm();
        }
      }
    }
  }, [
    listing,
    id,
    brandQuestions,
    statisticQuestions,
    productQuestions,
    managementQuestions,
    adQuestions,
    handoverQuestions,
    socialAccounts,
    accountQuestions,
  ]);

  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const loadListingIntoForm = () => {
    if (!listing) {
      console.log('No listing data available');
      return;
    }

    console.log('Loading listing into form:', listing);
    console.log('Brand questions available:', brandQuestions.length);
    console.log('Statistic questions available:', statisticQuestions.length);
    console.log('Product questions available:', productQuestions.length);

    const transformedData: Record<string, any> = {};

    // Helper to match question text to question ID
    const matchQuestionToId = (questionText: string, questions: any[]): string | null => {
      if (!questionText) return null;
      const normalizedText = questionText.toLowerCase().trim();
      const match = questions.find((q: any) => 
        q.question && q.question.toLowerCase().trim() === normalizedText
      );
      return match?.id || null;
    };

    // Extract category
    if (listing.category && Array.isArray(listing.category) && listing.category.length > 0) {
      transformedData.category = listing.category[0].id || listing.category[0].name;
    }

    // Extract brand questions
    if (listing.brand && Array.isArray(listing.brand)) {
      console.log('Processing brand questions:', listing.brand.length, 'Available question definitions:', brandQuestions.length);
      listing.brand.forEach((item: any) => {
        const answer = Array.isArray(item.answer) ? item.answer[0] : item.answer;
        if (item.question && answer) {
          const questionId = matchQuestionToId(item.question, brandQuestions);
          if (questionId) {
            console.log('✓ Matched brand question:', item.question, '→ ID:', questionId, 'Answer:', item.answer);
            transformedData[questionId] = answer;
          } else {
            console.warn('✗ Could not match brand question:', item.question, 'Available questions:', brandQuestions.map((q: any) => q.question));
          }
        }
      });
    }

    // Extract statistics questions
    if (listing.statistics && Array.isArray(listing.statistics)) {
      listing.statistics.forEach((item: any) => {
        const answer = Array.isArray(item.answer) ? item.answer[0] : item.answer;
        if (item.question) {
          const questionId = matchQuestionToId(item.question, statisticQuestions);
          if (questionId && answer) {
            transformedData[questionId] = answer;
          }
        }
      });
    }

    // Extract product questions
    if (listing.productQuestion && Array.isArray(listing.productQuestion)) {
      listing.productQuestion.forEach((item: any) => {
        const answer = Array.isArray(item.answer) ? item.answer[0] : item.answer;
        if (item.question) {
          const questionId = matchQuestionToId(item.question, productQuestions);
          if (questionId && answer) {
            transformedData[questionId] = answer;
          }
        }
      });
    }

    // Extract management questions
    if (listing.managementQuestion && Array.isArray(listing.managementQuestion)) {
      listing.managementQuestion.forEach((item: any) => {
        const answer = Array.isArray(item.answer) ? item.answer[0] : item.answer;
        if (item.question) {
          const questionId = matchQuestionToId(item.question, managementQuestions);
          if (questionId && answer) {
            transformedData[questionId] = answer;
          }
        }
      });
    }

    // Extract advertisement questions
    if (listing.advertisement && Array.isArray(listing.advertisement)) {
      listing.advertisement.forEach((item: any) => {
        const answer = Array.isArray(item.answer) ? item.answer[0] : item.answer;
        if (item.question) {
          const questionId = matchQuestionToId(item.question, adQuestions);
          if (questionId && answer) {
            transformedData[questionId] = answer;
          }
        }
      });
    }

    // Extract handover questions
    if (listing.handover && Array.isArray(listing.handover)) {
      listing.handover.forEach((item: any) => {
        const answer = Array.isArray(item.answer) ? item.answer[0] : item.answer;
        if (item.question) {
          const questionId = matchQuestionToId(item.question, handoverQuestions);
          if (questionId && answer) {
            transformedData[questionId] = answer;
          }
        }
      });
    }

    // Extract social accounts (platforms + account questions)
    if (listing.social_account && Array.isArray(listing.social_account)) {
      const socialAccountsData: Record<string, { url?: string; followers?: string }> = {};
      const socialAccountQuestionsData: Record<string, string> = {};

      listing.social_account.forEach((acc: any) => {
        const questionText = (acc.question || '').toLowerCase();
        const answerText = acc.answer ? String(acc.answer) : '';

        // Match account questions by question text
        if (accountQuestions.length > 0 && acc.question) {
          const questionId = matchQuestionToId(acc.question, accountQuestions);
          if (questionId && answerText) {
            socialAccountQuestionsData[questionId] = answerText;
            return;
          }
        }

        // Match platform by name in question text or answer_for
        const platform = socialAccounts.find((sa: any) => {
          const platformName = (sa.platform || sa.social_account_option || '').toLowerCase();
          if (!platformName) return false;
          return questionText.includes(platformName) || (acc.answer_for && platformName.includes(String(acc.answer_for).toLowerCase()));
        });

        if (platform) {
          const platformId = platform.id;
          if (!socialAccountsData[platformId]) {
            socialAccountsData[platformId] = {};
          }
          if (answerText) {
            // Try to split followers from URL if possible
            const followersMatch = answerText.match(/\d+/);
            if (followersMatch && answerText.toLowerCase().includes('follower')) {
              socialAccountsData[platformId].followers = followersMatch[0];
            } else {
              socialAccountsData[platformId].url = answerText;
            }
          }
        }
      });

      if (Object.keys(socialAccountsData).length > 0) {
        transformedData.socialAccounts = socialAccountsData;
      }
      if (Object.keys(socialAccountQuestionsData).length > 0) {
        transformedData.socialAccountQuestions = socialAccountQuestionsData;
      }
    }

    // Extract financials (table format or legacy monthly/yearly)
    if (listing.financials && Array.isArray(listing.financials)) {
      const tableFinancial = listing.financials.find((f: any) => f.name === '__FINANCIAL_TABLE__' && f.revenue_amount);
      if (tableFinancial && tableFinancial.revenue_amount) {
        try {
          const tableData = JSON.parse(tableFinancial.revenue_amount);
          if (tableData) {
            transformedData.financialType = tableData.financialType || 'detailed';
            transformedData.rowLabels = tableData.rowLabels || [
              'Gross Revenue',
              'Net Revenue',
              'Cost of Goods',
              'Advertising costs',
              'Freelancer/Employees',
              'Transaction Costs',
              'Other Expenses',
            ];
            transformedData.columnLabels = tableData.columnLabels || [
              { key: '2023', label: '2023' },
              { key: '2024', label: '2024' },
              { key: 'today', label: getTodayDate() },
              { key: 'Forecast 2025', label: 'Forecast 2025' },
            ];
            transformedData.financialData = tableData.financialData || {};
          }
        } catch (error) {
          console.error('Failed to parse financial table data:', error);
        }
      } else {
      const months = listing.financials.map((fin: any) => ({
        period: fin.name || '',
        revenue: fin.revenue_amount || '0',
        revenue2: fin.revenue_amount || '0',
        cost: fin.annual_cost || '0',
      }));
      transformedData.months = months;
      transformedData.financialType = listing.financials[0]?.type === 'yearly' ? 'yearly' : 'monthly';
      }
    }

    // Extract tools
    if (listing.tools && Array.isArray(listing.tools)) {
      transformedData.tools = listing.tools.map((tool: any) => tool.id || tool.name);
    }

    // Extract portfolio link
    if (listing.portfolioLink) {
      transformedData.portfolioLink = listing.portfolioLink;
    }

    // Set status
    if (listing.status) {
      transformedData.listingStatus = listing.status === 'PUBLISH' ? 'PUBLISH' : 'DRAFT';
    }

    console.log('Transformed form data keys:', Object.keys(transformedData));
    console.log('Transformed form data:', transformedData);
    setFormData(transformedData);
    
    // Only show toast if we actually loaded some data
    if (Object.keys(transformedData).length > 0) {
      toast.success("Listing data loaded");
    } else {
      console.warn('No data was transformed - questions may not be loaded yet');
    }
  };

  // Redirect if not authenticated (wait for auth to finish loading)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleFileUpload = async (questionId: string, file: File, answerType: string) => {
    setUploadingFields(prev => new Set(prev).add(questionId));
    try {
      const uploadType = answerType === "PHOTO" ? "photo" : "attachment";
      const response = await apiClient.uploadFile(file, uploadType);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Upload failed");
      }
      const fileUrl = response.data.url || response.data.path || "";
      if (!fileUrl) {
        throw new Error("No file URL returned");
      }
      setFormData({ ...formData, [questionId]: fileUrl });
      toast.success("File uploaded successfully");
    } catch (error: any) {
      console.error("File upload failed:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploadingFields(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  const handleAccountQuestionFileUpload = async (questionId: string, file: File, answerType: string) => {
    setUploadingFields(prev => new Set(prev).add(questionId));
    try {
      const uploadType = answerType === "PHOTO" ? "photo" : "attachment";
      const response = await apiClient.uploadFile(file, uploadType);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Upload failed");
      }
      const fileUrl = response.data.url || response.data.path || "";
      if (!fileUrl) {
        throw new Error("No file URL returned");
      }
      setFormData({
        ...formData,
        socialAccountQuestions: {
          ...(formData.socialAccountQuestions || {}),
          [questionId]: fileUrl,
        },
      });
      toast.success("File uploaded successfully");
    } catch (error: any) {
      console.error("File upload failed:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploadingFields(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  const renderField = (question: any) => {
    const rawValue = formData[question.id];
    const value = rawValue ?? "";
    const isUploading = uploadingFields.has(question.id);
    const normalizedDate = question.answer_type === "DATE" && typeof value === "string" && value
      ? (() => {
          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? value : parsed.toISOString().split("T")[0];
        })()
      : value;
    const normalizedYesNo = (question.answer_type === "YESNO" || question.answer_type === "BOOLEAN") && typeof value === "string"
      ? (() => {
          const lower = value.toLowerCase();
          if (lower === "yes" || lower === "true" || lower === "1") return "Yes";
          if (lower === "no" || lower === "false" || lower === "0") return "No";
          return value;
        })()
      : value;

    switch (question.answer_type) {
      case "TEXT":
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder="Enter your answer"
            className="bg-background"
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder="Enter a number"
            className="bg-background"
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder="Enter your answer"
            className="bg-background min-h-[100px]"
          />
        );

      case "DATE":
        return (
          <Input
            type="date"
            value={normalizedDate}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            className="bg-background"
          />
        );

      case "YESNO":
      case "BOOLEAN":
        return (
          <Select value={normalizedYesNo} onValueChange={(val) => setFormData({ ...formData, [question.id]: val })}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case "SELECT":
        return (
          <Select value={value} onValueChange={(val) => setFormData({ ...formData, [question.id]: val })}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.option && Array.isArray(question.option) && question.option.map((opt: string, idx: number) => (
                <SelectItem key={idx} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "PHOTO":
      case "FILE":
        return (
          <div className="space-y-2">
            {value && (
              <div className="text-xs text-muted-foreground">
                Current:{" "}
                <a href={String(value)} target="_blank" rel="noreferrer" className="underline">
                  {String(value).split("/").pop() || "View file"}
                </a>
              </div>
            )}
          <Input
            type="file"
              disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                  handleFileUpload(question.id, file, question.answer_type);
              }
            }}
            className="bg-background"
            accept={question.answer_type === "PHOTO" ? "image/*" : "*"}
          />
            {isUploading && (
              <div className="text-xs text-muted-foreground">Uploading...</div>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder="Enter your answer"
            className="bg-background"
          />
        );
    }
  };

  const renderAccountQuestionField = (question: any) => {
    const rawValue = formData.socialAccountQuestions?.[question.id];
    const value = rawValue ?? "";
    const isUploading = uploadingFields.has(question.id);
    const normalizedDate = question.answer_type === "DATE" && typeof value === "string" && value
      ? (() => {
          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? value : parsed.toISOString().split("T")[0];
        })()
      : value;
    const normalizedYesNo = (question.answer_type === "YESNO" || question.answer_type === "BOOLEAN") && typeof value === "string"
      ? (() => {
          const lower = value.toLowerCase();
          if (lower === "yes" || lower === "true" || lower === "1") return "Yes";
          if (lower === "no" || lower === "false" || lower === "0") return "No";
          return value;
        })()
      : value;

    const updateValue = (nextValue: any) => {
      setFormData({
        ...formData,
        socialAccountQuestions: {
          ...(formData.socialAccountQuestions || {}),
          [question.id]: nextValue,
        },
      });
    };

    switch (question.answer_type) {
      case "TEXT":
        return (
          <Input
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="Enter your answer"
            className="bg-background"
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="Enter a number"
            className="bg-background"
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="Enter your answer"
            className="bg-background min-h-[100px]"
          />
        );

      case "DATE":
        return (
          <Input
            type="date"
            value={normalizedDate}
            onChange={(e) => updateValue(e.target.value)}
            className="bg-background"
          />
        );

      case "YESNO":
      case "BOOLEAN":
        return (
          <Select value={normalizedYesNo} onValueChange={(val) => updateValue(val)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case "SELECT":
        return (
          <Select value={value} onValueChange={(val) => updateValue(val)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.option && Array.isArray(question.option) && question.option.map((opt: string, idx: number) => (
                <SelectItem key={idx} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "PHOTO":
      case "FILE":
        return (
          <div className="space-y-2">
            {value && (
              <div className="text-xs text-muted-foreground">
                Current:{" "}
                <a href={String(value)} target="_blank" rel="noreferrer" className="underline">
                  {String(value).split("/").pop() || "View file"}
                </a>
              </div>
            )}
            <Input
              type="file"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleAccountQuestionFileUpload(question.id, file, question.answer_type);
                }
              }}
              className="bg-background"
              accept={question.answer_type === "PHOTO" ? "image/*" : "*"}
            />
            {isUploading && (
              <div className="text-xs text-muted-foreground">Uploading...</div>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="Enter your answer"
            className="bg-background"
          />
        );
    }
  };

  const defaultRowLabels = [
    "Gross Revenue",
    "Net Revenue",
    "Cost of Goods",
    "Advertising costs",
    "Freelancer/Employees",
    "Transaction Costs",
    "Other Expenses",
  ];

  const defaultColumnLabels = [
    { key: "2023", label: "2023" },
    { key: "2024", label: "2024" },
    { key: "today", label: getTodayDate() },
    { key: "Forecast 2025", label: "Forecast 2025" },
  ];

  const rowLabels = formData.rowLabels || defaultRowLabels;
  const columnLabels = formData.columnLabels || defaultColumnLabels;
  const financialData = formData.financialData || {};
  const financialType = formData.financialType || "detailed";

  const handleFinancialCellChange = (rowLabel: string, colKey: string, value: string) => {
    setFormData({
      ...formData,
      rowLabels,
      columnLabels,
      financialData: {
        ...financialData,
        [rowLabel]: {
          ...(financialData[rowLabel] || {}),
          [colKey]: value,
        },
      },
    });
  };

  const handleFinancialMonthChange = (index: number, field: string, value: string) => {
    const months = Array.isArray(formData.months) ? [...formData.months] : [];
    months[index] = {
      ...months[index],
      [field]: value,
    };
    setFormData({ ...formData, months });
  };

  const handleAddFinancialMonth = () => {
    const months = Array.isArray(formData.months) ? [...formData.months] : [];
    months.push({ period: "", revenue: "", cost: "" });
    setFormData({ ...formData, months });
  };

  const handleRemoveFinancialMonth = (index: number) => {
    const months = Array.isArray(formData.months) ? [...formData.months] : [];
    months.splice(index, 1);
    setFormData({ ...formData, months });
  };

  const handleSave = async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      // Transform form data to API format (similar to PackagesStep)
      const transformQuestions = (questions: any[], answers: Record<string, any>, answerFor: string) => {
        if (!questions || !Array.isArray(questions)) return [];
        
        const validAnswerTypes = ['TEXT', 'SELECT', 'BOOLEAN', 'NUMBER', 'FILE', 'PHOTO'];
        
        return questions.map((question) => {
          const answer = answers[question.id];
          
          if (answer === null || answer === undefined || answer === '') {
            return null;
          }
          
          let answerStr = '';
          if (Array.isArray(answer)) {
            answerStr = answer.join(', ');
          } else {
            answerStr = String(answer);
          }
          
          if (answerStr.length < 2) {
            return null;
          }
          
          let answerType = question.answer_type || 'TEXT';
          if (!validAnswerTypes.includes(answerType)) {
            answerType = 'TEXT';
          }
          
          const questionText = question.question || '';
          if (questionText && questionText.length < 2) {
            return null;
          }
          
          return {
            question: questionText,
            answer: answerStr,
            answer_type: answerType,
            answer_for: answerFor,
            option: question.option || [],
          };
        }).filter(Boolean);
      };

      const transformFinancials = () => {
        // New table format support
        if (formData.financialData && formData.rowLabels && formData.columnLabels) {
          const tableData = {
            financialType: formData.financialType || 'detailed',
            rowLabels: formData.rowLabels,
            columnLabels: formData.columnLabels,
            financialData: formData.financialData,
          };
          
          return [{
            type: 'yearly' as const,
            name: '__FINANCIAL_TABLE__',
            revenue_amount: JSON.stringify(tableData),
            annual_cost: '0',
            net_profit: '0',
          }];
        }
        
        // Legacy monthly/yearly format
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

      const transformSocialAccounts = () => {
        if (!formData.socialAccounts || typeof formData.socialAccounts !== 'object') return [];
        
        const accounts: any[] = [];
        Object.keys(formData.socialAccounts).forEach((platformId) => {
          const platformData = formData.socialAccounts[platformId];
          const platform = socialAccounts.find((sa: any) => sa.id === platformId);
          
          if (platform && platformData) {
            const url = platformData.url ? String(platformData.url).trim() : '';
            const followers = platformData.followers ? String(platformData.followers).trim() : '';
            const answer = url || (followers ? `${followers} followers` : '');
            
            if (answer && answer.length >= 2) {
              const platformName = platform.platform || platform.social_account_option || 'Social';
                accounts.push({
                question: `${platformName} account`,
                answer: answer,
                  answer_type: 'TEXT',
                answer_for: 'SOCIAL',
                option: [],
                });
              }
          }
        });
        
        return accounts;
      };

      const transformAccountQuestions = () => {
        if (!formData.socialAccountQuestions || typeof formData.socialAccountQuestions !== 'object') return [];
        if (!accountQuestions || !Array.isArray(accountQuestions)) return [];
        return transformQuestions(accountQuestions, formData.socialAccountQuestions, 'SOCIAL');
      };

      // Fetch categories and tools to get names from IDs
      const categoriesResponse = await apiClient.getCategories();
      const toolsResponse = await apiClient.getTools();
      
      const categoriesList = categoriesResponse.success && Array.isArray(categoriesResponse.data) 
        ? categoriesResponse.data 
        : [];
      const toolsList = toolsResponse.success && Array.isArray(toolsResponse.data) 
        ? toolsResponse.data 
        : [];
      
      // Transform category from ID to { name }
      let categoryArray: any[] = [];
      if (formData.category) {
        if (Array.isArray(formData.category)) {
          categoryArray = formData.category.map((catId: string) => {
            const cat = categoriesList.find((c: any) => c.id === catId);
            return { name: cat?.name || catId };
          });
        } else {
          const categoryName = categoriesList.find((c: any) => c.id === formData.category)?.name || formData.category;
          if (categoryName) {
            categoryArray = [{ name: categoryName }];
          }
        }
      }
      
      // Transform tools from IDs to { name }
      const toolsArray = (formData.tools || []).map((toolId: string) => {
        const tool = toolsList.find((t: any) => t.id === toolId);
        return { name: tool?.name || toolId };
      });
      
      // Transform all question-based data
      const brandArray = transformQuestions(brandQuestions, formData, 'BRAND');
      const statisticsArray = transformQuestions(statisticQuestions, formData, 'STATISTIC');
      const productQuestionArray = transformQuestions(productQuestions, formData, 'PRODUCT');
      const managementQuestionArray = transformQuestions(managementQuestions, formData, 'MANAGEMENT');
      const advertisementArray = transformQuestions(adQuestions, formData, 'ADVERTISMENT');
      const handoverArray = transformQuestions(handoverQuestions, formData, 'HANDOVER');
      const socialAccountPlatformsArray = transformSocialAccounts();
      const accountQuestionsArray = transformAccountQuestions();
      const socialAccountArray = [...socialAccountPlatformsArray, ...accountQuestionsArray];
      
      // Transform financials
      const financialsArray = transformFinancials();
      
      // Prepare listing data for API
      const listingPayload: any = {
        status: formData.listingStatus || listing?.status || 'DRAFT',
        productQuestion: productQuestionArray,
        managementQuestion: managementQuestionArray,
        social_account: socialAccountArray,
        brand: brandArray.length > 0 ? brandArray : [],
        category: categoryArray.length > 0 ? categoryArray : [],
        tools: toolsArray.length > 0 ? toolsArray : [],
        financials: financialsArray.length > 0 ? financialsArray : [],
        statistics: statisticsArray.length > 0 ? statisticsArray : [],
        advertisement: advertisementArray.length > 0 ? advertisementArray : [],
        handover: handoverArray.length > 0 ? handoverArray : [],
      };

      if (formData.portfolioLink && formData.portfolioLink.trim()) {
        listingPayload.portfolioLink = formData.portfolioLink.trim();
      }

      const response = await apiClient.updateListing(id, listingPayload);

      if (response.success) {
        toast.success("Listing updated successfully!");
        navigate(`/listing/${id}`);
      } else {
        toast.error(response.error || "Failed to update listing");
      }
    } catch (error: any) {
      console.error("Error updating listing:", error);
      toast.error("Failed to update listing");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {authLoading ? "Checking authentication..." : "Loading listing data..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Listing not found</p>
          <Button onClick={() => navigate("/my-listings")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/listing/${id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Listing
          </Button>
          
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Edit Listing</h1>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#D3FC50] text-black hover:bg-[#D3FC50]/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Category */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Category</h2>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Brand Information */}
          {brandQuestions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Brand Information</h2>
              <div className="space-y-4">
                {brandQuestions.map((question: any) => (
                  <div key={question.id} className="space-y-2">
                    <Label>{question.question}</Label>
                    {renderField(question)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Statistics */}
          {statisticQuestions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Statistics</h2>
              <div className="space-y-4">
                {statisticQuestions.map((question: any) => (
                  <div key={question.id} className="space-y-2">
                    <Label>{question.question}</Label>
                    {renderField(question)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Products */}
          {productQuestions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Products</h2>
              <div className="space-y-4">
                {productQuestions.map((question: any) => (
                  <div key={question.id} className="space-y-2">
                    <Label>{question.question}</Label>
                    {renderField(question)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Management */}
          {managementQuestions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Management</h2>
              <div className="space-y-4">
                {managementQuestions.map((question: any) => (
                  <div key={question.id} className="space-y-2">
                    <Label>{question.question}</Label>
                    {renderField(question)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Advertisement */}
          {adQuestions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Advertisement</h2>
              <div className="space-y-4">
                {adQuestions.map((question: any) => (
                  <div key={question.id} className="space-y-2">
                    <Label>{question.question}</Label>
                    {renderField(question)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Handover */}
          {handoverQuestions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Handover</h2>
              <div className="space-y-4">
                {handoverQuestions.map((question: any) => (
                  <div key={question.id} className="space-y-2">
                    <Label>{question.question}</Label>
                    {renderField(question)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tools */}
          {tools.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Tools</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tools.map((tool: any) => {
                  const isSelected = (formData.tools || []).includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        const currentTools = formData.tools || [];
                        const newTools = isSelected
                          ? currentTools.filter((t: string) => t !== tool.id)
                          : [...currentTools, tool.id];
                        setFormData({ ...formData, tools: newTools });
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-accent bg-accent/5"
                          : "border-border bg-background hover:border-accent/50"
                      }`}
                    >
                      {tool.image_path && (
                        <img src={tool.image_path} alt={tool.name} className="w-12 h-12 object-contain" />
                      )}
                      <span className="text-sm font-medium text-center">{tool.name}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Social Media Accounts */}
          {socialAccounts.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Social Media Accounts</h2>
              <div className="space-y-6">
                {socialAccounts.map((account: any) => {
                  const platformLabel = account.platform || account.social_account_option || "Social";
                  const platformId = account.id;
                  const platformData = formData.socialAccounts?.[platformId] || {};
                  return (
                    <div key={platformId} className="space-y-3">
                      <Label className="text-base font-semibold capitalize">{platformLabel}</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Account Link</Label>
                          <Input
                            value={platformData.url || ""}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                socialAccounts: {
                                  ...(formData.socialAccounts || {}),
                                  [platformId]: {
                                    ...(formData.socialAccounts?.[platformId] || {}),
                                    url: e.target.value,
                                  },
                                },
                              });
                            }}
                            placeholder="facebook.com/yourname or @yourname"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Followers</Label>
                          <Input
                            type="number"
                            value={platformData.followers || ""}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                socialAccounts: {
                                  ...(formData.socialAccounts || {}),
                                  [platformId]: {
                                    ...(formData.socialAccounts?.[platformId] || {}),
                                    followers: e.target.value,
                                  },
                                },
                              });
                            }}
                            placeholder="1000"
                            className="bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Account Questions */}
          {accountQuestions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Account Questions</h2>
              <div className="space-y-4">
                {accountQuestions.map((question: any) => (
                  <div key={question.id} className="space-y-2">
                    <Label>{question.question}</Label>
                    {renderAccountQuestionField(question)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Financials */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Financials</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Financial Type</Label>
                <Select
                  value={financialType}
                  onValueChange={(val) => setFormData({ ...formData, financialType: val })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(financialType === "detailed" || financialType === "simple") && (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-[220px_repeat(auto-fit,minmax(140px,1fr))] border-b border-border">
                      <div className="p-3 font-medium text-sm text-muted-foreground">Category</div>
                      {columnLabels.map((col: any) => (
                        <div key={col.key} className="p-3 font-medium text-sm text-muted-foreground text-center">
                          {col.label}
                        </div>
                      ))}
                    </div>
                    {rowLabels.map((rowLabel: string) => (
                      <div key={rowLabel} className="grid grid-cols-[220px_repeat(auto-fit,minmax(140px,1fr))] border-b border-border last:border-b-0">
                        <div className="p-3 text-sm font-medium">{rowLabel}</div>
                        {columnLabels.map((col: any) => (
                          <div key={col.key} className="p-2">
                            <Input
                              value={financialData[rowLabel]?.[col.key] || ""}
                              onChange={(e) => handleFinancialCellChange(rowLabel, col.key, e.target.value)}
                              className="bg-background h-8 text-sm"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(financialType === "monthly" || financialType === "yearly") && (
                <div className="space-y-3">
                  {(formData.months || []).map((month: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Period</Label>
                        <Input
                          value={month.period || ""}
                          onChange={(e) => handleFinancialMonthChange(index, "period", e.target.value)}
                          placeholder="Jan 2024"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Revenue</Label>
                        <Input
                          type="number"
                          value={month.revenue || ""}
                          onChange={(e) => handleFinancialMonthChange(index, "revenue", e.target.value)}
                          placeholder="0"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Cost</Label>
                        <Input
                          type="number"
                          value={month.cost || ""}
                          onChange={(e) => handleFinancialMonthChange(index, "cost", e.target.value)}
                          placeholder="0"
                          className="bg-background"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFinancialMonth(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={handleAddFinancialMonth}>
                    Add Period
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Portfolio Link */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio Link</h2>
            <div className="space-y-2">
              <Label>Portfolio Link</Label>
              <Input
                value={formData.portfolioLink || ""}
                onChange={(e) => setFormData({ ...formData, portfolioLink: e.target.value })}
                placeholder="https://example.com"
                className="bg-background"
              />
            </div>
          </Card>

          {/* Status */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            <div className="space-y-2">
              <Label>Listing Status</Label>
              <Select
                value={formData.listingStatus || listing?.status || 'DRAFT'}
                onValueChange={(val) => setFormData({ ...formData, listingStatus: val })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISH">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="bg-[#D3FC50] text-black hover:bg-[#D3FC50]/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EditListing;


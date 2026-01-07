import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Package, Target, ImageIcon, X, Loader2 } from "lucide-react";
import { useStatisticQuestions } from "@/hooks/useStatisticQuestions";
import { useProductQuestions } from "@/hooks/useProductQuestions";
import { useManagementQuestions } from "@/hooks/useManagementQuestions";
import { toast } from "sonner";
import { uploadToCloudinary, uploadMultipleToCloudinary } from "@/lib/cloudinary";

interface AdditionalInformationStepProps {
  formData?: any;
  onNext: (data: any) => void;
  onBack: () => void;
  defaultTab?: "statistics" | "products" | "management";
}

export const AdditionalInformationStep = ({ formData: parentFormData, onNext, onBack, defaultTab = "statistics" }: AdditionalInformationStepProps) => {
  const [activeTab, setActiveTab] = useState<"statistics" | "products" | "management">(defaultTab);
  
  // Update active tab when defaultTab changes
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Fetch questions for each tab
  const { data: statisticQuestions = [], isLoading: statisticsLoading } = useStatisticQuestions();
  const { data: productQuestions = [], isLoading: productsLoading } = useProductQuestions();
  const { data: managementQuestions = [], isLoading: managementLoading } = useManagementQuestions();

  const [formData, setFormData] = useState<Record<string, any>>(parentFormData || {});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (parentFormData) {
      setFormData(parentFormData);
    }
  }, [parentFormData]);

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    let questionsToValidate: any[] = [];
    
    // Get questions for the active tab
    if (activeTab === "statistics") {
      questionsToValidate = statisticQuestions;
    } else if (activeTab === "products") {
      questionsToValidate = productQuestions;
    } else if (activeTab === "management") {
      questionsToValidate = managementQuestions;
    }
    
    // Check if all questions have answers
    questionsToValidate.forEach((question: any) => {
      const value = formData[question.id];
      
      // Required fields validation
      if (!value || (typeof value === 'string' && value.trim() === '') || 
          (Array.isArray(value) && value.length === 0)) {
        errors.push(`${question.question} is required`);
      }
      
      // Additional validations based on answer type
      if (question.answer_type === 'NUMBER' && value && isNaN(Number(value))) {
        errors.push(`${question.question} must be a valid number`);
      }
      
      if (question.answer_type === 'DATE' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push(`${question.question} must be a valid date`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleContinue = () => {
    // Check if any uploads are in progress
    const isUploading = Object.values(uploadingFiles).some(uploading => uploading);
    if (isUploading) {
      toast.error("Please wait for file uploads to complete");
      return;
    }

    const validation = validateForm();
    
    if (!validation.isValid) {
      // Show first error
      if (validation.errors.length > 0) {
        toast.error(validation.errors[0]);
      } else {
        toast.error("Please fill in all required fields");
      }
      return;
    }
    
    onNext(formData);
  };

  const handlePhotoUpload = async (questionId: string, file: File) => {
    setUploadingFiles(prev => ({ ...prev, [questionId]: true }));
    
    try {
      const result = await uploadToCloudinary(file, 'listings/photos');
      
      if (result.success && result.url) {
        setFormData(prev => ({ ...prev, [questionId]: result.url }));
        toast.success("Photo uploaded successfully");
      } else {
        toast.error(result.error || "Failed to upload photo");
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    setUploadingFiles(prev => ({ ...prev, [questionId]: true }));
    
    try {
      const result = await uploadToCloudinary(file, 'listings/attachments');
      
      if (result.success && result.url) {
        const currentFiles = formData[questionId] || [];
        setFormData(prev => ({ 
          ...prev, 
          [questionId]: Array.isArray(currentFiles) ? [...currentFiles, result.url] : [result.url]
        }));
        toast.success("File uploaded successfully");
      } else {
        toast.error(result.error || "Failed to upload file");
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const renderField = (question: any) => {
    const value = formData[question.id] || "";
    
    switch (question.answer_type) {
      case "TEXT":
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder="Enter your answer"
            className="bg-background border-border h-11 sm:h-12 focus:ring-2 focus:ring-accent focus:border-accent"
          />
        );
      
      case "NUMBER":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder="Enter a number"
            className="bg-background border-border h-11 sm:h-12 focus:ring-2 focus:ring-accent focus:border-accent"
          />
        );
      
      case "TEXTAREA":
        return (
          <Textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder="Enter your answer"
            className="bg-background border-border min-h-[120px] focus:ring-2 focus:ring-accent focus:border-accent resize-y"
          />
        );
      
      case "DATE":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            className="bg-background border-border h-11 sm:h-12 focus:ring-2 focus:ring-accent focus:border-accent"
          />
        );
      
      case "YESNO":
      case "BOOLEAN":
        return (
          <div className="flex gap-3 sm:gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({ ...formData, [question.id]: "yes" })}
              className={`px-8 sm:px-12 h-11 sm:h-12 rounded-lg font-medium transition-all ${
                value === "yes" || value === "true" 
                  ? "bg-accent text-accent-foreground hover:bg-accent/90 border-accent shadow-md" 
                  : "border-2 hover:bg-muted/50"
              }`}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({ ...formData, [question.id]: "no" })}
              className={`px-8 sm:px-12 h-11 sm:h-12 rounded-lg font-medium transition-all ${
                value === "no" || value === "false" 
                  ? "bg-accent text-accent-foreground hover:bg-accent/90 border-accent shadow-md" 
                  : "border-2 hover:bg-muted/50"
              }`}
            >
              No
            </Button>
          </div>
        );
      
      case "SELECT":
        return (
          <Select value={value} onValueChange={(val) => setFormData({ ...formData, [question.id]: val })}>
            <SelectTrigger className="bg-background border-border h-11 sm:h-12 focus:ring-2 focus:ring-accent focus:border-accent">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.option && Array.isArray(question.option) && question.option.map((opt: string, idx: number) => (
                <SelectItem key={idx} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "PHOTO":
        const isUploadingPhoto = uploadingFiles[question.id];
        const photoUrl = typeof value === 'string' ? value : '';
        
        return (
          <div className="space-y-2">
            {photoUrl ? (
              <div className="relative inline-block">
                <img 
                  src={photoUrl} 
                  alt="Preview" 
                  className="h-32 w-32 object-cover rounded-lg border-2 border-border"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, [question.id]: "" })}
                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
                  disabled={isUploadingPhoto}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center hover:border-accent/50 transition-colors bg-muted/30">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error("Photo must be less than 10MB");
                        return;
                      }
                      handlePhotoUpload(question.id, file);
                    }
                  }}
                  className="hidden"
                  id={`photo-${question.id}`}
                  disabled={isUploadingPhoto}
                />
                <label htmlFor={`photo-${question.id}`} className="cursor-pointer text-center w-full">
                  {isUploadingPhoto ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-12 h-12 text-accent mb-3 animate-spin" />
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-12 h-12 text-muted-foreground mb-3 mx-auto" />
                      <p className="text-sm text-muted-foreground">Click to upload photo</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
        );
      
      case "FILE":
        const isUploadingFile = uploadingFiles[question.id];
        const fileUrls = Array.isArray(value) ? value : (value ? [value] : []);
        
        return (
          <div className="space-y-2">
            <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center hover:border-accent/50 transition-colors bg-muted/30">
              <input
                type="file"
                accept="*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error("File must be less than 10MB");
                      return;
                    }
                    handleFileUpload(question.id, file);
                  }
                }}
                className="hidden"
                id={`file-${question.id}`}
                disabled={isUploadingFile}
              />
              <label htmlFor={`file-${question.id}`} className="cursor-pointer text-center w-full">
                {isUploadingFile ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-accent mb-2 animate-spin" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Click to upload file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, etc. up to 10MB</p>
                  </>
                )}
              </label>
            </div>
            {fileUrls.length > 0 && (
              <div className="space-y-2">
                {fileUrls.map((url: string, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline truncate flex-1"
                    >
                      File {index + 1}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = fileUrls.filter((_: string, i: number) => i !== index);
                        setFormData({ ...formData, [question.id]: updated.length === 1 ? updated[0] : updated });
                      }}
                      className="ml-2 text-destructive hover:text-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder="Enter your answer"
            className="bg-background border-border h-11 sm:h-12 focus:ring-2 focus:ring-accent focus:border-accent"
          />
        );
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Additional Information</h1>

      <div className="flex gap-1.5 sm:gap-2 md:gap-3 mb-6 bg-muted/30 p-1 sm:p-1.5 md:p-2 rounded-xl w-full max-w-fit border border-border/50 overflow-hidden">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveTab("statistics")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 h-9 sm:h-10 md:h-11 rounded-lg transition-all font-medium flex-shrink-0 ${
            activeTab === "statistics"
              ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <TrendingUp className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">Statistics</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 h-9 sm:h-10 md:h-11 rounded-lg transition-all font-medium flex-shrink-0 ${
            activeTab === "products"
              ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Package className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">Products</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveTab("management")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 h-9 sm:h-10 md:h-11 rounded-lg transition-all font-medium flex-shrink-0 ${
            activeTab === "management"
              ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Target className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">Management</span>
        </Button>
      </div>

      {activeTab === "statistics" && (
        <div className="space-y-6 bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-lg">
          {statisticsLoading ? (
            <div className="text-muted-foreground text-center py-12">Loading questions...</div>
          ) : statisticQuestions.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No statistic questions available. Please contact the administrator.
            </div>
          ) : (
            statisticQuestions.map((question: any) => (
              <div key={question.id} className="space-y-3">
                <Label className="text-base sm:text-lg font-semibold text-foreground">{question.question}</Label>
                {renderField(question)}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-6 bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-lg">
          {productsLoading ? (
            <div className="text-muted-foreground text-center py-12">Loading questions...</div>
          ) : productQuestions.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No product questions available. Please contact the administrator.
            </div>
          ) : (
            productQuestions.map((question: any) => (
              <div key={question.id} className="space-y-3">
                <Label className="text-base sm:text-lg font-semibold text-foreground">{question.question}</Label>
                {renderField(question)}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "management" && (
        <div className="space-y-6 bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-lg">
          {managementLoading ? (
            <div className="text-muted-foreground text-center py-12">Loading questions...</div>
          ) : managementQuestions.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No management questions available. Please contact the administrator.
            </div>
          ) : (
            managementQuestions.map((question: any) => (
              <div key={question.id} className="space-y-3">
                <Label className="text-base sm:text-lg font-semibold text-foreground">{question.question}</Label>
                {renderField(question)}
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="w-full sm:w-auto px-8 h-11 sm:h-12 border-2"
        >
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto sm:ml-auto px-12 sm:px-16 h-11 sm:h-12 font-semibold rounded-full shadow-md"
        >
          Save
        </Button>
      </div>
    </div>
  );
};

import { LayoutGrid, Building2, Wrench, CreditCard, Info, Users, Megaphone, HandHeart, Package, TrendingUp, ShoppingBag, Target, ChevronDown, ChevronRight, Menu } from "lucide-react";
import type { DashboardStep } from "@/pages/Dashboard";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/_App Icon 1 (2).png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface DashboardSidebarProps {
  activeStep: DashboardStep;
  onStepChange: (step: DashboardStep) => void;
  isMobile?: boolean;
}

const menuItems = [
  { id: "category" as DashboardStep, label: "Category", icon: LayoutGrid },
  { id: "brand-information" as DashboardStep, label: "Brand Information", icon: Building2 },
  { id: "tools" as DashboardStep, label: "Tools you use", icon: Wrench },
  { id: "financials" as DashboardStep, label: "Financials", icon: CreditCard },
  { id: "additional-information" as DashboardStep, label: "Additional Information", icon: Info, hasSubItems: true },
  { id: "accounts" as DashboardStep, label: "Accounts", icon: Users },
  { id: "ad-informations" as DashboardStep, label: "Ad Informations", icon: Megaphone },
  { id: "handover" as DashboardStep, label: "Handover", icon: HandHeart },
  { id: "packages" as DashboardStep, label: "Packages", icon: Package },
];

const additionalInfoSubItems = [
  { id: "statistics" as DashboardStep, label: "Statistics", icon: TrendingUp },
  { id: "products" as DashboardStep, label: "Products", icon: ShoppingBag },
  { id: "management" as DashboardStep, label: "Management", icon: Target },
];

const SidebarContent = ({ activeStep, onStepChange, onLinkClick }: { activeStep: DashboardStep; onStepChange: (step: DashboardStep) => void; onLinkClick?: () => void }) => {
  const [isAdditionalInfoExpanded, setIsAdditionalInfoExpanded] = useState(
    activeStep === "additional-information" || activeStep === "statistics" || activeStep === "products" || activeStep === "management"
  );

  const isAdditionalInfoActive = activeStep === "additional-information" || activeStep === "statistics" || activeStep === "products" || activeStep === "management";

  const handleStepChange = (step: DashboardStep) => {
    onStepChange(step);
    onLinkClick?.();
  };

  return (
    <>
      <div className="p-4 sm:p-6">
        <Link to="/" className="flex items-center justify-center" onClick={onLinkClick}>
          <img 
            src={logo} 
            alt="EX Logo" 
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
          />
        </Link>
      </div>
      
      <nav className="flex-1 px-3 sm:px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === "additional-information" ? isAdditionalInfoActive : activeStep === item.id;
          const hasSubItems = item.hasSubItems;
          
          if (item.id === "additional-information") {
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    setIsAdditionalInfoExpanded(!isAdditionalInfoExpanded);
                    if (!isAdditionalInfoExpanded) {
                      handleStepChange("additional-information");
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-accent text-[hsl(0_0%_0%)]" 
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                  </div>
                  {hasSubItems && (
                    isAdditionalInfoExpanded ? <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  )}
                </button>
                
                {isAdditionalInfoExpanded && (
                  <div className="ml-2 sm:ml-4 mt-1 space-y-1">
                    {additionalInfoSubItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = activeStep === subItem.id;
                      
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleStepChange(subItem.id)}
                          className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm ${
                            isSubActive
                              ? "bg-white/10 text-white" 
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <SubIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => handleStepChange(item.id)}
              className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all ${
                isActive 
                  ? "bg-accent text-[hsl(0_0%_0%)]" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export const DashboardSidebar = ({ activeStep, onStepChange, isMobile }: DashboardSidebarProps) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  // Desktop sidebar
  if (isMobile === false) {
    return (
      <aside className="hidden md:flex w-60 bg-[hsl(0_0%_0%)] text-white flex flex-col">
        <SidebarContent activeStep={activeStep} onStepChange={onStepChange} />
      </aside>
    );
  }

  // Mobile sidebar as Sheet
  if (isMobile === true) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-[hsl(0_0%_0%)] text-white border-none p-0">
          <div className="flex flex-col h-full">
            <SidebarContent activeStep={activeStep} onStepChange={onStepChange} onLinkClick={handleClose} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Default: Desktop sidebar when isMobile is undefined
  return (
    <aside className="hidden md:flex w-60 bg-[hsl(0_0%_0%)] text-white flex flex-col">
      <SidebarContent activeStep={activeStep} onStepChange={onStepChange} />
    </aside>
  );
};

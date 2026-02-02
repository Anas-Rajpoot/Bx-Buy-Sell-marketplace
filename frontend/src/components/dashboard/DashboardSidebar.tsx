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
        <Link to="/" className="flex items-center justify-start" onClick={onLinkClick}>
          <img 
            src={logo} 
            alt="EX Logo" 
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
          />
        </Link>
      </div>
      
      <nav
        className="flex-1 overflow-y-auto"
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingRight: "12px",
          paddingLeft: "12px",
        }}
      >
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
                  className={`w-full flex items-center justify-between transition-all ${
                    isActive ? "" : "hover:bg-white/5 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3"
                  }`}
                  style={
                    isActive
                      ? {
                          width: "100%",
                          minHeight: "48px",
                          borderRadius: "12px",
                          paddingTop: "12px",
                          paddingRight: "16px",
                          paddingBottom: "12px",
                          paddingLeft: "16px",
                          gap: "8px",
                          backgroundColor: "rgba(174, 243, 31, 1)",
                        }
                      : { gap: "8px" }
                  }
                >
                  <div className="flex items-center" style={{ gap: "6px" }}>
                    <Icon
                      className="flex-shrink-0"
                      style={{
                        width: "20px",
                        height: "20px",
                        color: isActive ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 1)",
                        opacity: 1,
                      }}
                    />
                    <span
                      className="font-medium"
                      style={{
                        fontFamily: "Lufga",
                        fontWeight: 500,
                        fontSize: "14px",
                        lineHeight: "150%",
                        letterSpacing: "0%",
                        color: isActive ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 1)",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {hasSubItems && (
                    isAdditionalInfoExpanded ? (
                  <ChevronDown
                        className="flex-shrink-0 w-4 h-4 lg:w-7 lg:h-7"
                        style={{
                          color: isActive ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 1)",
                          opacity: 1,
                        }}
                      />
                    ) : (
                  <ChevronRight
                        className="flex-shrink-0 w-4 h-4 lg:w-7 lg:h-7"
                        style={{
                          color: isActive ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 1)",
                          opacity: 1,
                        }}
                      />
                    )
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
                          className={`w-full flex items-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all ${
                            isSubActive ? "bg-white/10" : "hover:bg-white/5"
                          }`}
                          style={{ gap: "6px" }}
                        >
                          <SubIcon
                            className="flex-shrink-0 w-4 h-4 lg:w-7 lg:h-7"
                            style={{
                              color: "rgba(255, 255, 255, 1)",
                              opacity: 1,
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "Lufga",
                              fontWeight: 500,
                              fontSize: "14px",
                              lineHeight: "150%",
                              letterSpacing: "0%",
                              color: "rgba(255, 255, 255, 1)",
                            }}
                          >
                            {subItem.label}
                          </span>
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
              className={`w-full flex items-center transition-all ${
                isActive ? "" : "hover:bg-white/5 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3"
              }`}
              style={
                isActive
                  ? {
                      width: "100%",
                      minHeight: "48px",
                      borderRadius: "12px",
                      paddingTop: "12px",
                      paddingRight: "16px",
                      paddingBottom: "12px",
                      paddingLeft: "16px",
                      gap: "6px",
                      backgroundColor: "rgba(174, 243, 31, 1)",
                    }
                  : { gap: "6px" }
              }
            >
              <Icon
                className="flex-shrink-0"
                style={{
                  width: "20px",
                  height: "20px",
                  color: isActive ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 1)",
                  opacity: 1,
                }}
              />
              <span
                className="font-medium"
                style={{
                  fontFamily: "Lufga",
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "150%",
                  letterSpacing: "0%",
                  color: isActive ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 1)",
                }}
              >
                {item.label}
              </span>
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

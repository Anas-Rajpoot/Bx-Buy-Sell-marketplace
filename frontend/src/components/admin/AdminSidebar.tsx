import { LayoutDashboard, Users, List, MessageSquare, FileText, Settings, LogOut, UserCog, Bell, AlertCircle, FileSearch, Grid3x3, Building2, Wrench, CreditCard, Info, User, Megaphone, HandshakeIcon, Package, Menu } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import logo from "@/assets/_App Icon 1 (2).png";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { id: "team", label: "Team Members", icon: UserCog, path: "/admin/team" },
  { id: "users", label: "Users", icon: Users, path: "/admin/users" },
  { id: "listings", label: "Listings", icon: List, path: "/admin/listings" },
  { 
    id: "chat", 
    label: "Chat", 
    icon: MessageSquare, 
    path: "/admin/chats",
    subItems: [
      { id: "chat-list", label: "Chat List", icon: MessageSquare, path: "/admin/chat-list" },
      { id: "all-chats", label: "All Chats", icon: MessageSquare, path: "/admin/chats" },
      { id: "analytics", label: "Analytics & Routing", icon: LayoutDashboard, path: "/admin/chat-analytics" },
      { id: "monitoring", label: "Monitoring Alerts", icon: Bell, path: "/admin/monitoring-alerts" },
      { id: "detect-words", label: "Detect Words", icon: FileSearch, path: "/admin/detect-words" },
    ]
  },
  { 
    id: "content", 
    label: "Content Management", 
    icon: FileText, 
    path: "/admin/content",
    subItems: [
      { id: "category", label: "Category", icon: Grid3x3, path: "/admin/content/category" },
      { id: "brand-info", label: "Brand Information", icon: Building2, path: "/admin/content/brand-info" },
      { id: "tools", label: "Tools", icon: Wrench, path: "/admin/content/tools" },
      { id: "financials", label: "Financials", icon: CreditCard, path: "/admin/content/financials" },
      { id: "additional-infos", label: "Additional Infos", icon: Info, path: "/admin/content/additional-infos" },
      { id: "accounts", label: "Accounts", icon: User, path: "/admin/content/accounts" },
      { id: "ad-informations", label: "Ad Informations", icon: Megaphone, path: "/admin/content/ad-informations" },
      { id: "handover", label: "Handover", icon: HandshakeIcon, path: "/admin/content/handover" },
      { id: "packages", label: "Packages", icon: Package, path: "/admin/content/packages" },
    ]
  },
];

interface AdminSidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const AdminSidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(["chat", "content"]);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  const isPathActive = (path: string, subItems?: any[]) => {
    if (location.pathname === path) return true;
    if (subItems) {
      return subItems.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
    }
    return location.pathname.startsWith(path + '/');
  };

  // Check if any sub-item is active (for parent tab highlighting)
  const hasActiveSubItem = (subItems?: any[]) => {
    if (!subItems) return false;
    return subItems.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
  };

  return (
    <div 
      className="bg-[hsl(0_0%_0%)] h-full flex flex-col overflow-hidden"
      style={{
        width: '346px',
        maxWidth: '100%',
        paddingTop: '20px',
        paddingRight: '0px', // Remove right padding so scrollbar is at the edge
        paddingBottom: '12px',
        paddingLeft: '12px',
        backgroundColor: 'rgba(0, 0, 0, 1)',
      }}
    >
      <div className="p-0 flex-shrink-0 mb-4">
        <Link to="/" className="flex items-center justify-start" onClick={onClose}>
          <img 
            src={logo} 
            alt="EX Logo" 
            className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain"
          />
        </Link>
      </div>
      
      <nav 
        className="flex-1 overflow-y-auto overflow-x-hidden admin-sidebar-scroll"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingRight: '12px', // Add padding to content instead of container
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = isPathActive(item.path, item.subItems);
          const hasActiveChild = hasActiveSubItem(item.subItems);
          const isExpanded = expandedItems.includes(item.id);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          // Parent tab is active if it's directly active OR has an active child
          const isParentActive = isActive || hasActiveChild;
          
          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasSubItems) {
                    toggleExpanded(item.id);
                  } else {
                    handleNavigation(item.path);
                  }
                }}
                className={`w-full flex items-center justify-between transition-all ${
                  (isParentActive && !hasSubItems) || (hasSubItems && hasActiveChild)
                    ? "" 
                    : "hover:bg-white/5 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3"
                }`}
                style={(isParentActive && !hasSubItems) || (hasSubItems && hasActiveChild) ? {
                  width: '100%',
                  height: 'auto',
                  minHeight: '48px',
                  borderRadius: '12px',
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  gap: '8px',
                  backgroundColor: 'rgba(174, 243, 31, 1)',
                } : {}}
              >
                <div className="flex items-center" style={isActive && !hasSubItems ? { gap: '8px' } : { gap: '8px' }}>
                  <Icon 
                    className="flex-shrink-0" 
                    style={{
                      width: '20px',
                      height: '20px',
                      color: (isParentActive && !hasSubItems) || (hasSubItems && hasActiveChild) ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.6)',
                      opacity: 1,
                    }}
                  />
                  <span 
                    className="font-lufga font-medium text-sm lg:text-base"
                    style={{
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '150%',
                      letterSpacing: '0%',
                      color: (isParentActive && !hasSubItems) || (hasSubItems && hasActiveChild) ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                {hasSubItems && (
                  isExpanded ? (
                    <ChevronDown 
                      className="flex-shrink-0 w-4 h-4 lg:w-7 lg:h-7" 
                      style={{
                        color: (isParentActive && !hasSubItems) || (hasSubItems && hasActiveChild) ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.6)',
                        opacity: 1,
                      }}
                    />
                  ) : (
                    <ChevronRight 
                      className="flex-shrink-0 w-4 h-4 lg:w-7 lg:h-7" 
                      style={{
                        color: (isParentActive && !hasSubItems) || (hasSubItems && hasActiveChild) ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.6)',
                        opacity: 1,
                      }}
                    />
                  )
                )}
              </button>

              {/* Sub-items */}
              {hasSubItems && isExpanded && (
                <div className="ml-2 sm:ml-4 mt-1 space-y-1">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/');
                    
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all ${
                          isSubActive
                            ? "bg-white/10" 
                            : "hover:bg-white/5"
                        }`}
                      >
                        <SubIcon 
                          className="flex-shrink-0 w-4 h-4 lg:w-7 lg:h-7" 
                          style={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            opacity: 1,
                          }}
                        />
                        <span
                          className="font-lufga text-sm lg:text-base"
                          style={{
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '150%',
                            letterSpacing: '0%',
                            color: 'rgba(255, 255, 255, 1)',
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
        })}
      </nav>

      <div className="p-0 space-y-1 border-t border-white/10 flex-shrink-0 mt-4 pt-4 w-full">
        <button
          onClick={() => handleNavigation("/admin/settings")}
          className={`w-full flex items-center justify-between transition-all ${
            location.pathname === "/admin/settings" || location.pathname.startsWith("/admin/settings/")
              ? "" 
              : "hover:bg-white/5 rounded-lg px-3 py-2"
          }`}
          style={location.pathname === "/admin/settings" || location.pathname.startsWith("/admin/settings/") ? {
            width: '100%',
            height: 'auto',
            minHeight: '48px',
            borderRadius: '12px',
            paddingTop: '12px',
            paddingRight: '16px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            gap: '8px',
            backgroundColor: 'rgba(174, 243, 31, 1)',
          } : {}}
        >
          <div className="flex items-center" style={{ gap: '8px' }}>
            <Settings 
              className="flex-shrink-0 w-5 h-5 lg:w-7 lg:h-7" 
              style={{
                color: location.pathname === "/admin/settings" || location.pathname.startsWith("/admin/settings/") ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.6)',
                opacity: 1,
              }}
            />
            <span 
              className="font-lufga font-medium text-sm lg:text-base"
              style={{
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '150%',
                letterSpacing: '0%',
                color: location.pathname === "/admin/settings" || location.pathname.startsWith("/admin/settings/") ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)',
              }}
            >
              Settings
            </span>
          </div>
        </button>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between transition-all hover:bg-white/5 rounded-lg px-3 py-2"
        >
          <div className="flex items-center" style={{ gap: '8px' }}>
            <LogOut 
              className="flex-shrink-0 w-5 h-5 lg:w-7 lg:h-7" 
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                opacity: 1,
              }}
            />
            <span 
              className="font-lufga font-medium text-sm lg:text-base"
              style={{
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '150%',
                letterSpacing: '0%',
                color: 'rgba(255, 255, 255, 1)',
              }}
            >
              Log Out
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export const AdminSidebar = ({ isMobile = false }: AdminSidebarProps) => {
  if (isMobile) {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="p-0 bg-[hsl(0_0%_0%)] border-0 w-[346px] sm:w-[346px] overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 1)',
          }}
        >
          <AdminSidebarContent onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden lg:flex">
      <AdminSidebarContent />
    </aside>
  );
};

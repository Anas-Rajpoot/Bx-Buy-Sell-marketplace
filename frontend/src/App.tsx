import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BuyerSignup from "./pages/BuyerSignup";
import SellerSignup from "./pages/SellerSignup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyListings from "./pages/MyListings";
import Favourites from "./pages/Favourites";
import Chat from "./pages/Chat";
import VerifyAccount from "./pages/VerifyAccount";
import ForgotPassword from "./pages/ForgotPassword";
import PhoneVerification from "./pages/PhoneVerification";
import VerifyOTP from "./pages/VerifyOTP";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminForgotPassword from "./pages/admin/AdminForgotPassword";
import AdminVerifyOTP from "./pages/admin/AdminVerifyOTP";
import AdminResetPassword from "./pages/admin/AdminResetPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTeamMembers from "./pages/admin/AdminTeamMembers";
import AdminMemberDetails from "./pages/admin/AdminMemberDetails";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import AdminUserListings from "./pages/admin/AdminUserListings";
import AdminUserFavorites from "./pages/admin/AdminUserFavorites";
import AdminUserChats from "./pages/admin/AdminUserChats";
import AdminListings from "./pages/admin/AdminListings";
import AdminListingDetails from "./pages/admin/AdminListingDetails";
import AdminChats from "./pages/admin/AdminChats";
import AdminMonitoringAlerts from "./pages/admin/AdminMonitoringAlerts";
import AdminDetectWords from "./pages/admin/AdminDetectWords";
import AdminChatList from "./pages/admin/AdminChatList";
import AdminChatAnalytics from "./pages/admin/AdminChatAnalytics";
import AdminContentManagement from "./pages/admin/AdminContentManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import AllListings from "./pages/AllListings";
import ListingDetail from "./pages/ListingDetail";
import HowToBuy from "./pages/HowToBuy";
import HowToSell from "./pages/HowToSell";
import EditListing from "./pages/EditListing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/all-listings" element={<AllListings />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/listing/:id/edit" element={<EditListing />} />
          <Route path="/how-to-buy" element={<HowToBuy />} />
          <Route path="/how-to-sell" element={<HowToSell />} />
          <Route path="/buyer-signup" element={<BuyerSignup />} />
          <Route path="/seller-signup" element={<SellerSignup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/edit/:id" element={<Dashboard />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/verify-account" element={<VerifyAccount />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/phone-verification" element={<PhoneVerification />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/register" element={<Register />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/verify-otp" element={<AdminVerifyOTP />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/team" element={<AdminTeamMembers />} />
          <Route path="/admin/team/:id" element={<AdminMemberDetails />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:id" element={<AdminUserDetails />} />
          <Route path="/admin/users/:id/listings" element={<AdminUserListings />} />
          <Route path="/admin/users/:id/favorites" element={<AdminUserFavorites />} />
          <Route path="/admin/users/:id/chats" element={<AdminUserChats />} />
          <Route path="/admin/listings" element={<AdminListings />} />
          <Route path="/admin/listings/:id" element={<AdminListingDetails />} />
          <Route path="/admin/chats" element={<AdminChats />} />
          <Route path="/admin/chat-list" element={<AdminChatList />} />
          <Route path="/admin/chat-analytics" element={<AdminChatAnalytics />} />
          <Route path="/admin/monitoring-alerts" element={<AdminMonitoringAlerts />} />
          <Route path="/admin/detect-words" element={<AdminDetectWords />} />
          <Route path="/admin/content/*" element={<AdminContentManagement />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
  </QueryClientProvider>
);

export default App;

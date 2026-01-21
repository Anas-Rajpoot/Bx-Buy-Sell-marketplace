import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ListingDetail from "@/pages/ListingDetail";

export default function AdminListingDetails() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <main className="flex-1">
        <AdminHeader title="Edit Listing" />
        <div className="p-8">
          <Button
            variant="ghost"
            className="mb-6 flex items-center gap-2 p-0 hover:bg-transparent"
            onClick={() => navigate("/admin/listings")}
          >
            <ArrowLeft className="h-4 w-4 text-black" />
            <span className="font-outfit font-bold text-[18px] leading-[100%] text-black">
              All Listing
            </span>
          </Button>
          <ListingDetail embedded adminLayout />
        </div>
      </main>
    </div>
  );
}

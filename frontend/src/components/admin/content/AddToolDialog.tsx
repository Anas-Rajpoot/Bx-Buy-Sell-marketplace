import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAddTool } from "@/hooks/useAddTool";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface AddToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddToolDialog = ({ open, onOpenChange }: AddToolDialogProps) => {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { mutate: addTool, isPending } = useAddTool();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const uploadToBackend = async (file: File): Promise<string> => {
    const response = await apiClient.uploadFile(file, 'photo');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Upload failed');
    }
    return response.data.url || response.data.path || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a tool name");
      return;
    }

    let finalLogoUrl = logo.trim();

    // Upload image if provided
    if (imageFile) {
      setUploading(true);
      try {
        finalLogoUrl = await uploadToBackend(imageFile);
        toast.success("Image uploaded successfully");
      } catch (error) {
        console.error('Upload error:', error);
        toast.error("Failed to upload image");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    if (!finalLogoUrl) {
      toast.error("Please provide a logo URL or upload an image");
      return;
    }

    addTool(
      { name: name.trim(), image_path: finalLogoUrl },
      {
        onSuccess: () => {
          setName("");
          setLogo("");
          setImageFile(null);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Add New Tool</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tool Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter tool name"
              className="bg-[#F5F5F5]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="Enter logo URL"
              className="bg-[#F5F5F5]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Or Upload Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="bg-[#F5F5F5]"
            />
            {imageFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {imageFile.name}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-white border border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || uploading || !name.trim()}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {uploading ? "Uploading..." : isPending ? "Adding..." : "Add Tool"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

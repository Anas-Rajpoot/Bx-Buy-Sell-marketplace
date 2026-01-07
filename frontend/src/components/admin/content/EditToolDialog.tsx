import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateTool } from "@/hooks/useUpdateTool";
import { Tool } from "@/hooks/useTools";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface EditToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: Tool | null;
}

export const EditToolDialog = ({ open, onOpenChange, tool }: EditToolDialogProps) => {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { mutate: updateTool, isPending } = useUpdateTool();

  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setLogo(tool.image_path);
    }
  }, [tool]);

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
    
    if (!tool || !name.trim()) {
      toast.error("Please enter a tool name");
      return;
    }

    let finalLogoUrl = logo.trim();

    // Upload new image if provided
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
      toast.error("Please provide a logo URL");
      return;
    }

    updateTool(
      { 
        id: tool.id, 
        data: { name: name.trim(), image_path: finalLogoUrl } 
      },
      {
        onSuccess: () => {
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
          <DialogTitle>Edit Tool</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Tool Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter tool name"
              className="bg-[#F5F5F5]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-logo">Logo URL</Label>
            <Input
              id="edit-logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="Enter logo URL"
              className="bg-[#F5F5F5]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-image">Or Upload New Image</Label>
            <Input
              id="edit-image"
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
              {uploading ? "Uploading..." : isPending ? "Updating..." : "Update Tool"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

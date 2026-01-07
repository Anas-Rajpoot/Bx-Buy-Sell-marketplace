import { useState, useEffect } from "react";
// TODO: Implement assign responsible backend endpoints
// import { apiClient } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AssignResponsibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: any;
  onAssigned: () => void;
}

export const AssignResponsibleDialog = ({
  open,
  onOpenChange,
  alert,
  onAssigned,
}: AssignResponsibleDialogProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTeamMembers();
    }
  }, [open]);

  const fetchTeamMembers = async () => {
    try {
      // TODO: Implement backend endpoints for fetching team members
      // const response = await apiClient.getTeamMembers();
      // if (response.success && response.data) {
      //   setTeamMembers(response.data);
      // }
      setTeamMembers([]); // Disabled until backend endpoints are implemented

      setTeamMembers(profiles || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch team members",
        variant: "destructive"
      });
    }
  };

  const handleAssign = async () => {
    if (!selectedMember || !alert) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ responsible_id: selectedMember })
        .eq('id', alert.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alert assigned successfully"
      });
      onAssigned();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning alert:', error);
      toast({
        title: "Error",
        description: "Failed to assign alert",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Responsible Team Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team member" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback>{member.full_name?.[0] || 'T'}</AvatarFallback>
                    </Avatar>
                    <span>{member.full_name || 'Team Member'}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedMember || loading}
            className="bg-[#D4FF00] hover:bg-[#D4FF00]/90 text-black"
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

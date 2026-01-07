import { useState, useEffect } from "react";
// TODO: Implement monitoring alerts backend endpoints
// import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, ExternalLink, AlertCircle, User as UserIcon, List, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AssignResponsibleDialog } from "./AssignResponsibleDialog";

interface Alert {
  id: string;
  problem_type: string;
  reporter_id: string | null;
  problematic_user_id: string | null;
  status: string;
  responsible_id: string | null;
  notes: string | null;
  created_at: string;
  reporter?: { full_name: string | null; avatar_url: string | null };
  problematic_user?: { full_name: string | null; avatar_url: string | null };
  responsible?: { full_name: string | null; avatar_url: string | null };
}

interface MonitoringAlertsTableProps {
  searchQuery: string;
}

export const MonitoringAlertsTable = ({ searchQuery }: MonitoringAlertsTableProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('monitoring-alerts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'monitoring_alerts'
      }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data: alertsData, error } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for reporter, problematic_user, and responsible
      const alertsWithProfiles = await Promise.all(
        (alertsData || []).map(async (alert) => {
          const [reporter, problematicUser, responsible] = await Promise.all([
            alert.reporter_id
              ? supabase.from('profiles').select('full_name, avatar_url').eq('id', alert.reporter_id).single()
              : Promise.resolve({ data: null }),
            alert.problematic_user_id
              ? supabase.from('profiles').select('full_name, avatar_url').eq('id', alert.problematic_user_id).single()
              : Promise.resolve({ data: null }),
            alert.responsible_id
              ? supabase.from('profiles').select('full_name, avatar_url').eq('id', alert.responsible_id).single()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...alert,
            reporter: reporter.data,
            problematic_user: problematicUser.data,
            responsible: responsible.data,
          };
        })
      );

      setAlerts(alertsWithProfiles);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch monitoring alerts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (alertId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ status: newStatus })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alert status updated successfully"
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update alert status",
        variant: "destructive"
      });
    }
  };

  const handleAssign = (alert: Alert) => {
    setSelectedAlert(alert);
    setAssignDialogOpen(true);
  };

  const filteredAlerts = alerts.filter(alert => 
    alert.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.reporter?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.problematic_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProblemIcon = (type: string) => {
    switch (type) {
      case 'word':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'user':
        return <UserIcon className="h-4 w-4 text-red-500" />;
      case 'listing':
        return <List className="h-4 w-4 text-red-500" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unsolved':
        return <Badge variant="destructive" className="bg-red-500/20 text-red-700 border-red-300">Unsolved</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-300">In Review</Badge>;
      case 'solved':
        return <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-300">Solved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading alerts...</div>;
  }

  return (
    <>
      <div className="p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-4 px-4 font-semibold text-sm">Problem</th>
              <th className="text-left py-4 px-4 font-semibold text-sm">Reporter</th>
              <th className="text-left py-4 px-4 font-semibold text-sm">Problematic User</th>
              <th className="text-left py-4 px-4 font-semibold text-sm">Status</th>
              <th className="text-left py-4 px-4 font-semibold text-sm">Date</th>
              <th className="text-left py-4 px-4 font-semibold text-sm">Responsible</th>
              <th className="text-left py-4 px-4 font-semibold text-sm">Notes</th>
              <th className="text-left py-4 px-4 font-semibold text-sm">Edit</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert) => (
              <tr key={alert.id} className="border-b hover:bg-muted/50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {getProblemIcon(alert.problem_type)}
                    <span className="capitalize">{alert.problem_type}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={alert.reporter?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {alert.reporter?.full_name?.[0] || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{alert.reporter?.full_name || 'Automatic'}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={alert.problematic_user?.avatar_url || ''} />
                      <AvatarFallback>{alert.problematic_user?.full_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{alert.problematic_user?.full_name || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Select
                    value={alert.status}
                    onValueChange={(value) => updateStatus(alert.id, value)}
                  >
                    <SelectTrigger className="w-32 border-0 bg-transparent">
                      <SelectValue>{getStatusBadge(alert.status)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unsolved">{getStatusBadge('unsolved')}</SelectItem>
                      <SelectItem value="in_review">{getStatusBadge('in_review')}</SelectItem>
                      <SelectItem value="solved">{getStatusBadge('solved')}</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-4 px-4 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </td>
                <td className="py-4 px-4">
                  {alert.responsible ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={alert.responsible.avatar_url || ''} />
                        <AvatarFallback>{alert.responsible.full_name?.[0] || 'R'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{alert.responsible.full_name}</span>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAssign(alert)}
                    >
                      Add+
                    </Button>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-muted-foreground max-w-xs truncate">
                  {alert.notes || '-'}
                </td>
                <td className="py-4 px-4">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No alerts found
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing 1-{filteredAlerts.length} of {filteredAlerts.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="w-10 h-10 rounded-full">1</Button>
            <Button variant="ghost" size="sm" className="w-10 h-10 rounded-full">2</Button>
            <Button variant="ghost" size="sm" className="w-10 h-10 rounded-full">3</Button>
          </div>
        </div>
      </div>

      <AssignResponsibleDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        alert={selectedAlert}
        onAssigned={fetchAlerts}
      />
    </>
  );
};

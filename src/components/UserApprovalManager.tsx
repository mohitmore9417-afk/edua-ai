import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  approval_status: string;
  created_at: string;
}

const UserApprovalManager = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, approval_status, created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPendingUsers((data as any) || []);
    }
    setLoading(false);
  };

  const updateApprovalStatus = async (userId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc('update_approval_status', {
      p_user_id: userId,
      p_status: status
    });

    if (error) {
      // Fallback to direct update if RPC doesn't exist
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ approval_status: status } as any)
        .eq("id", userId);
      
      if (updateError) {
        toast({
          title: "Error updating status",
          description: updateError.message,
          variant: "destructive",
        });
        return;
      }
    }
    
    toast({
      title: status === "approved" ? "User approved!" : "User rejected",
      description: `User has been ${status}`,
    });
    fetchPendingUsers();
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <CardTitle>Pending User Approvals</CardTitle>
        </div>
        <CardDescription>
          Review and approve new teacher and student registrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No pending approvals</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateApprovalStatus(user.id, "approved")}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateApprovalStatus(user.id, "rejected")}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default UserApprovalManager;
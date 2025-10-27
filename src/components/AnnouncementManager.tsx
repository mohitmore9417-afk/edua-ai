import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Bell } from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface AnnouncementManagerProps {
  classId: string;
  className: string;
}

const AnnouncementManager = ({ classId, className }: AnnouncementManagerProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
  });

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching announcements",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAnnouncements(data || []);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("announcements")
      .insert({
        class_id: classId,
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        created_by: user.id,
      });

    if (error) {
      toast({
        title: "Error creating announcement",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Announcement posted!",
        description: "Your announcement has been shared with students",
      });
      fetchAnnouncements();
      setIsCreateDialogOpen(false);
      setNewAnnouncement({ title: "", content: "" });
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{className}</CardTitle>
            <CardDescription>Post announcements for your students</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Post an announcement for {className}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="e.g., Important: Test on Friday"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Write your announcement here..."
                    rows={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateAnnouncement}>Post Announcement</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No announcements yet</p>
            <p className="text-sm">Create your first announcement to notify students</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  <CardDescription>
                    {format(new Date(announcement.created_at), "PPP 'at' p")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementManager;

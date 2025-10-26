import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  classes: {
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get student's enrolled classes
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("class_id")
      .eq("student_id", user.id);

    if (!enrollments || enrollments.length === 0) {
      setLoading(false);
      return;
    }

    const classIds = enrollments.map(e => e.class_id);

    // Fetch announcements for enrolled classes
    const { data, error } = await supabase
      .from("announcements")
      .select(`
        *,
        classes:class_id (name),
        profiles:created_by (full_name)
      `)
      .in("class_id", classIds)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast({
        title: "Error fetching announcements",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAnnouncements(data as any || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading announcements...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <CardTitle>Announcements</CardTitle>
        </div>
        <CardDescription>Latest updates from your teachers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No announcements yet</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="p-4 border rounded-lg bg-card hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{announcement.title}</h3>
                <Badge variant="outline">{announcement.classes?.name}</Badge>
              </div>
              <p className="text-muted-foreground mb-3">{announcement.content}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(announcement.created_at), "PPP")}
                </div>
                <div>By {announcement.profiles?.full_name}</div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default StudentAnnouncements;
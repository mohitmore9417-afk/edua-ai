import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string;
  classes: {
    name: string;
  };
}

const StudentTimetable = () => {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
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

    // Fetch timetable for enrolled classes
    const { data, error } = await supabase
      .from("timetable")
      .select(`
        *,
        classes:class_id (name)
      `)
      .in("class_id", classIds)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Error fetching timetable",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTimetable(data as any || []);
    }
    setLoading(false);
  };

  const groupByDay = () => {
    const grouped: { [key: number]: TimetableEntry[] } = {};
    timetable.forEach((entry) => {
      if (!grouped[entry.day_of_week]) {
        grouped[entry.day_of_week] = [];
      }
      grouped[entry.day_of_week].push(entry);
    });
    return grouped;
  };

  if (loading) {
    return <div className="text-center py-8">Loading timetable...</div>;
  }

  const groupedTimetable = groupByDay();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle>My Timetable</CardTitle>
        </div>
        <CardDescription>Your weekly class schedule</CardDescription>
      </CardHeader>
      <CardContent>
        {timetable.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No timetable entries yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTimetable).map(([day, entries]) => (
              <div key={day}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Badge variant="outline">{dayNames[parseInt(day)]}</Badge>
                </h3>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 border rounded-lg bg-card hover:shadow-md transition-all flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-semibold">{entry.subject}</h4>
                        <p className="text-sm text-muted-foreground">
                          {entry.classes?.name} • Room {entry.room || "TBA"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{entry.start_time} - {entry.end_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentTimetable;
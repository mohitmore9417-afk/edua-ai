import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string;
}

interface TimetableManagerProps {
  classId: string;
  className: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TimetableManager = ({ classId, className }: TimetableManagerProps) => {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    day_of_week: "1",
    start_time: "",
    end_time: "",
    subject: "",
    room: "",
  });

  useEffect(() => {
    fetchTimetable();
  }, [classId]);

  const fetchTimetable = async () => {
    const { data, error } = await supabase
      .from("timetable")
      .select("*")
      .eq("class_id", classId)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      toast({
        title: "Error fetching timetable",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTimetable(data || []);
    }
  };

  const handleCreateEntry = async () => {
    const { data, error } = await supabase
      .from("timetable")
      .insert({
        ...newEntry,
        day_of_week: parseInt(newEntry.day_of_week),
        class_id: classId,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating timetable entry",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Timetable updated!",
        description: "New schedule entry has been added.",
      });
      setTimetable([...timetable, data]);
      setIsCreateDialogOpen(false);
      setNewEntry({ day_of_week: "1", start_time: "", end_time: "", subject: "", room: "" });
    }
  };

  const groupByDay = () => {
    const grouped: Record<number, TimetableEntry[]> = {};
    timetable.forEach((entry) => {
      if (!grouped[entry.day_of_week]) {
        grouped[entry.day_of_week] = [];
      }
      grouped[entry.day_of_week].push(entry);
    });
    return grouped;
  };

  const grouped = groupByDay();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Class Timetable
          </h3>
          <p className="text-sm text-muted-foreground">{className}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="transition-all hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Timetable Entry</DialogTitle>
              <DialogDescription>
                Create a new schedule entry for this class
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={newEntry.day_of_week}
                  onValueChange={(value) => setNewEntry({ ...newEntry, day_of_week: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={newEntry.start_time}
                    onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={newEntry.end_time}
                    onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newEntry.subject}
                  onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  value={newEntry.room}
                  onChange={(e) => setNewEntry({ ...newEntry, room: e.target.value })}
                  placeholder="e.g., Room 305"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateEntry}>Add to Timetable</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {timetable.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No schedule yet</h3>
            <p className="text-muted-foreground mb-4">Add your first timetable entry</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.entries(grouped).map(([day, entries]) => (
            <Card key={day} className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">{DAYS[parseInt(day)]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all"
                    >
                      <div>
                        <div className="font-medium">{entry.subject}</div>
                        <div className="text-sm text-muted-foreground">{entry.room}</div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {entry.start_time} - {entry.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimetableManager;
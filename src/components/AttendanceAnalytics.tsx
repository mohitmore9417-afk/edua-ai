import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, TrendingUp, TrendingDown, Activity, Download } from "lucide-react";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface MonthlyData {
  month: string;
  percentage: number;
  present: number;
  total: number;
}

interface YearlyData {
  year: string;
  percentage: number;
  present: number;
  total: number;
}

interface ComparisonData {
  period: string;
  current: number;
  previous: number;
}

interface AttendanceAnalyticsProps {
  userId: string;
  userRole: 'teacher' | 'student';
}

const AttendanceAnalytics = ({ userId, userRole }: AttendanceAnalyticsProps) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [trendPercentage, setTrendPercentage] = useState<number>(0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchAnalytics();
  }, [userId, selectedYear]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMonthlyData(),
        fetchYearlyData(),
        fetchComparisonData(),
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error loading analytics",
        description: "Failed to load attendance analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getClassIds = async () => {
    if (userRole === 'teacher') {
      const { data } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", userId);
      return data?.map(c => c.id) || [];
    } else {
      const { data } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("student_id", userId);
      return data?.map(e => e.class_id) || [];
    }
  };

  const fetchMonthlyData = async () => {
    const classIds = await getClassIds();
    if (classIds.length === 0) return;

    const monthlyStats: MonthlyData[] = [];
    const year = parseInt(selectedYear);

    for (let month = 0; month < 12; month++) {
      const startDate = startOfMonth(new Date(year, month));
      const endDate = endOfMonth(new Date(year, month));

      let query = supabase
        .from("attendance")
        .select("status")
        .in("class_id", classIds)
        .gte("date", format(startDate, 'yyyy-MM-dd'))
        .lte("date", format(endDate, 'yyyy-MM-dd'));

      if (userRole === 'student') {
        query = query.eq("student_id", userId);
      }

      const { data } = await query;

      const total = data?.length || 0;
      const present = data?.filter(a => a.status === "present").length || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      monthlyStats.push({
        month: format(new Date(year, month), 'MMM'),
        percentage,
        present,
        total,
      });
    }

    setMonthlyData(monthlyStats);
  };

  const fetchYearlyData = async () => {
    const classIds = await getClassIds();
    if (classIds.length === 0) return;

    const yearlyStats: YearlyData[] = [];

    for (let i = 0; i < 5; i++) {
      const year = currentYear - i;
      const startDate = startOfYear(new Date(year, 0));
      const endDate = endOfYear(new Date(year, 0));

      let query = supabase
        .from("attendance")
        .select("status")
        .in("class_id", classIds)
        .gte("date", format(startDate, 'yyyy-MM-dd'))
        .lte("date", format(endDate, 'yyyy-MM-dd'));

      if (userRole === 'student') {
        query = query.eq("student_id", userId);
      }

      const { data } = await query;

      const total = data?.length || 0;
      const present = data?.filter(a => a.status === "present").length || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      yearlyStats.push({
        year: year.toString(),
        percentage,
        present,
        total,
      });
    }

    setYearlyData(yearlyStats.reverse());
  };

  const fetchComparisonData = async () => {
    const classIds = await getClassIds();
    if (classIds.length === 0) return;

    const comparisons: ComparisonData[] = [];
    const year = parseInt(selectedYear);

    // Compare last 6 months
    for (let i = 0; i < 6; i++) {
      const currentMonth = subMonths(new Date(year, new Date().getMonth()), i);
      const previousMonth = subMonths(currentMonth, 12);

      const currentData = await fetchMonthAttendance(classIds, currentMonth);
      const previousData = await fetchMonthAttendance(classIds, previousMonth);

      comparisons.unshift({
        period: format(currentMonth, 'MMM yyyy'),
        current: currentData,
        previous: previousData,
      });
    }

    setComparisonData(comparisons);

    // Calculate trend
    if (comparisons.length >= 2) {
      const recent = comparisons[comparisons.length - 1].current;
      const previous = comparisons[comparisons.length - 2].current;
      const diff = recent - previous;
      setTrendPercentage(Math.abs(diff));
      
      if (diff > 2) setTrend('up');
      else if (diff < -2) setTrend('down');
      else setTrend('stable');
    }
  };

  const fetchMonthAttendance = async (classIds: string[], date: Date): Promise<number> => {
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);

    let query = supabase
      .from("attendance")
      .select("status")
      .in("class_id", classIds)
      .gte("date", format(startDate, 'yyyy-MM-dd'))
      .lte("date", format(endDate, 'yyyy-MM-dd'));

    if (userRole === 'student') {
      query = query.eq("student_id", userId);
    }

    const { data } = await query;
    const total = data?.length || 0;
    const present = data?.filter(a => a.status === "present").length || 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  const getBestMonth = () => {
    if (monthlyData.length === 0) return null;
    return monthlyData.reduce((best, current) => 
      current.percentage > best.percentage ? current : best
    );
  };

  const getWorstMonth = () => {
    if (monthlyData.length === 0) return null;
    const validMonths = monthlyData.filter(m => m.total > 0);
    if (validMonths.length === 0) return null;
    return validMonths.reduce((worst, current) => 
      current.percentage < worst.percentage ? current : worst
    );
  };

  const bestMonth = getBestMonth();
  const worstMonth = getWorstMonth();
  const avgAttendance = monthlyData.length > 0
    ? Math.round(monthlyData.reduce((sum, m) => sum + m.percentage, 0) / monthlyData.filter(m => m.total > 0).length)
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <TrendingUp className="w-6 h-6" /> : 
                 trend === 'down' ? <TrendingDown className="w-6 h-6" /> : 
                 <span>—</span>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
                </p>
                {trend !== 'stable' && (
                  <p className="text-xs text-muted-foreground">
                    {trendPercentage.toFixed(1)}% change
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Best Month ({selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestMonth && bestMonth.total > 0 ? (
              <>
                <div className="text-2xl font-bold text-green-600">{bestMonth.month}</div>
                <p className="text-xs text-muted-foreground">{bestMonth.percentage}% attendance</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {worstMonth && worstMonth.total > 0 ? (
              <>
                <div className="text-2xl font-bold text-orange-600">{worstMonth.month}</div>
                <p className="text-xs text-muted-foreground">{worstMonth.percentage}% attendance</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Attendance Analytics
            </CardTitle>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Average attendance for {selectedYear}: <span className="font-semibold text-primary">{avgAttendance}%</span>
                </p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'percentage') return [`${value}%`, 'Attendance'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="percentage" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                    name="Attendance %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="yearly" className="space-y-4">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${value}%`, 'Attendance']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Attendance %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Comparing current period vs same period last year
                </p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => `${value}%`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Current Period"
                  />
                  <Line
                    type="monotone"
                    dataKey="previous"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: 'hsl(var(--muted-foreground))' }}
                    name="Previous Year"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceAnalytics;

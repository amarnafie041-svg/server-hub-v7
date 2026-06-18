import { useGetDashboardStats } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, HardDrive, MemoryStick, Activity, Server, FileBox, Globe } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (!stats) return null;

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold mb-2">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على النظام والموارد</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المعالج (CPU)</CardTitle>
            <Cpu className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{stats.cpu}%</div>
            <Progress value={stats.cpu} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الذاكرة (RAM)</CardTitle>
            <MemoryStick className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{stats.memory?.percent || 0}%</div>
            <Progress value={stats.memory?.percent || 0} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {stats.memory?.used || 0}MB / {stats.memory?.total || 0}MB
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">التخزين</CardTitle>
            <HardDrive className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{stats.disk?.percent || 0}%</div>
            <Progress value={stats.disk?.percent || 0} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {stats.disk?.used || 0}GB / {stats.disk?.total || 0}GB
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">وقت التشغيل</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.uptime}</div>
            <p className="text-xs text-muted-foreground mt-2">النظام يعمل بشكل طبيعي</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border col-span-1">
          <CardHeader>
            <CardTitle>الإحصائيات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">العمليات</div>
                  <div className="text-sm text-muted-foreground">{stats.runningProcesses} قيد التشغيل / {stats.totalProcesses} إجمالي</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileBox className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">الملفات</div>
                  <div className="text-sm text-muted-foreground">{stats.totalFiles} إجمالي الملفات</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">النطاقات الفرعية</div>
                  <div className="text-sm text-muted-foreground">{stats.totalSubdomains} إجمالي النطاقات</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border col-span-1">
          <CardHeader>
            <CardTitle>آخر النشاطات</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-4 items-start pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{activity.action}</div>
                      <div className="text-xs text-muted-foreground mt-1" dir="ltr">{activity.target}</div>
                      <div className="text-xs text-muted-foreground/60 mt-1">{new Date(activity.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">لا يوجد نشاطات حديثة</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

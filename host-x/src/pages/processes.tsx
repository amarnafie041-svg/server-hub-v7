import { useState } from "react";
import { useListProcesses, useStartProcess, useStopProcess, useRestartProcess, useGetProcessLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RotateCw, FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Processes() {
  const { data: processes, refetch, isLoading } = useListProcesses();
  const startProc = useStartProcess();
  const stopProc = useStopProcess();
  const restartProc = useRestartProcess();
  const { toast } = useToast();

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [logsOpenFor, setLogsOpenFor] = useState<string | null>(null);

  // New process form
  const [name, setName] = useState("");
  const [type, setType] = useState<any>("nodejs");
  const [command, setCommand] = useState("");
  const [dir, setDir] = useState("/");
  const [port, setPort] = useState("");

  const handleStart = () => {
    startProc.mutate({
      data: {
        name,
        type,
        command,
        workingDir: dir,
        port: port ? parseInt(port) : null
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم بدء العملية بنجاح" });
        setIsStartOpen(false);
        refetch();
      },
      onError: (err) => {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleStop = (id: string) => {
    stopProc.mutate({ processId: id }, {
      onSuccess: () => { toast({ title: "تم إيقاف العملية" }); refetch(); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" })
    });
  };

  const handleRestart = (id: string) => {
    restartProc.mutate({ processId: id }, {
      onSuccess: () => { toast({ title: "تم إعادة التشغيل" }); refetch(); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" })
    });
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">إدارة العمليات</h1>
          <p className="text-muted-foreground">مراقبة وتشغيل تطبيقات الويب والبوتات</p>
        </div>
        <Button onClick={() => setIsStartOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          عملية جديدة
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-muted-foreground bg-muted/20 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">الاسم</th>
                  <th className="px-6 py-4 font-medium">النوع</th>
                  <th className="px-6 py-4 font-medium">الحالة</th>
                  <th className="px-6 py-4 font-medium">البورت</th>
                  <th className="px-6 py-4 font-medium">الذاكرة / CPU</th>
                  <th className="px-6 py-4 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center p-8">جاري التحميل...</td></tr>
                ) : !processes || processes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8">لا يوجد عمليات قيد التشغيل</td></tr>
                ) : (
                  processes.map(proc => (
                    <tr key={proc.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{proc.name}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-mono text-xs uppercase">{proc.type}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={
                          proc.status === 'running' ? 'bg-green-500/20 text-green-500 border-green-500/30' : 
                          proc.status === 'error' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 
                          'bg-gray-500/20 text-gray-500 border-gray-500/30'
                        } variant="outline">
                          {proc.status === 'running' ? 'يعمل' : proc.status === 'error' ? 'خطأ' : 'متوقف'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground" dir="ltr">{proc.port || '-'}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground text-xs" dir="ltr">
                        {proc.memoryMb ? `${proc.memoryMb}MB` : '-'} / {proc.cpuPercent ? `${proc.cpuPercent}%` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {proc.status === 'running' ? (
                            <Button variant="outline" size="sm" onClick={() => handleStop(proc.id.toString())} className="h-8 w-8 p-0 text-amber-500">
                              <Square className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleRestart(proc.id.toString())} className="h-8 w-8 p-0 text-green-500">
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleRestart(proc.id.toString())} className="h-8 w-8 p-0">
                            <RotateCw className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setLogsOpenFor(proc.id.toString())} className="h-8 w-8 p-0">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تشغيل عملية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم العملية</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="my-discord-bot" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={type} onValueChange={setType} dir="rtl">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nodejs">Node.js</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="php">PHP</SelectItem>
                  <SelectItem value="html">Static HTML</SelectItem>
                  <SelectItem value="bot">Bot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الأمر (Command)</Label>
              <Input value={command} onChange={e => setCommand(e.target.value)} placeholder="node index.js" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>مسار العمل (Working Directory)</Label>
              <Input value={dir} onChange={e => setDir(e.target.value)} placeholder="/app/my-bot" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>المنفذ (Port) - اختياري</Label>
              <Input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="3000" dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartOpen(false)}>إلغاء</Button>
            <Button onClick={handleStart} disabled={startProc.isPending || !name || !command}>تشغيل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogsDialog processId={logsOpenFor} onClose={() => setLogsOpenFor(null)} />
    </div>
  );
}

function LogsDialog({ processId, onClose }: { processId: string | null, onClose: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs } = useGetProcessLogs(processId || "", { query: { enabled: !!processId, refetchInterval: 3000 } as any });

  return (
    <Dialog open={!!processId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>سجل العملية</DialogTitle>
        </DialogHeader>
        <div className="bg-[#0c0c0c] text-green-400 font-mono text-xs p-4 rounded-md h-[400px] overflow-y-auto whitespace-pre-wrap mt-4" dir="ltr">
          {logs?.logs?.join("\n") || "جاري جلب السجلات..."}
        </div>
      </DialogContent>
    </Dialog>
  );
}

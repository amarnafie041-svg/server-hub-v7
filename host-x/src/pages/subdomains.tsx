import { useState } from "react";
import { useListSubdomains, useCreateSubdomain, useDeleteSubdomain } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Subdomains() {
  const { data: subdomains, isLoading, refetch } = useListSubdomains();
  const createSub = useCreateSubdomain();
  const deleteSub = useDeleteSubdomain();
  const { toast } = useToast();

  const [subdomain, setSubdomain] = useState("");
  const [type, setType] = useState<any>("nodejs");
  const [targetPath, setTargetPath] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomain || !targetPath) return;

    createSub.mutate({
      data: { subdomain, type, targetPath }
    }, {
      onSuccess: () => {
        toast({ title: "تم إنشاء النطاق بنجاح" });
        setSubdomain("");
        setTargetPath("");
        refetch();
      },
      onError: (err) => toast({ title: "خطأ", description: err.message, variant: "destructive" })
    });
  };

  const handleDelete = (id: string) => {
    if(confirm("هل أنت متأكد من حذف هذا النطاق؟")) {
      deleteSub.mutate({ subdomainId: Number(id) }, {
        onSuccess: () => {
          toast({ title: "تم الحذف بنجاح" });
          refetch();
        },
        onError: () => toast({ title: "حدث خطأ", variant: "destructive" })
      });
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">النطاقات الفرعية</h1>
        <p className="text-muted-foreground">ربط تطبيقاتك بنطاقات فرعية مخصصة على SERVER HUB</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-border bg-card h-fit">
          <CardHeader>
            <CardTitle>نطاق جديد</CardTitle>
            <CardDescription>إنشاء نطاق فرعي وتوجيهه إلى مجلد أو تطبيق</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <div className="flex" dir="ltr">
                  <Input 
                    value={subdomain} 
                    onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                    placeholder="my-app" 
                    className="rounded-r-none border-r-0 text-right"
                  />
                  <div className="flex items-center px-3 bg-muted border border-border rounded-r-md text-muted-foreground text-sm whitespace-nowrap">
                    .server.hub
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={type} onValueChange={setType} dir="rtl">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nodejs">Node.js App</SelectItem>
                    <SelectItem value="python">Python App</SelectItem>
                    <SelectItem value="php">PHP Site</SelectItem>
                    <SelectItem value="html">Static HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>مسار الهدف</Label>
                <Input value={targetPath} onChange={e => setTargetPath(e.target.value)} placeholder="/app/my-app/public" dir="ltr" />
                <p className="text-xs text-muted-foreground">المجلد الذي يحتوي على ملفات الموقع</p>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createSub.isPending || !subdomain || !targetPath}>
                إنشاء النطاق
              </Button>
            </CardContent>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground">جاري التحميل...</div>
          ) : !subdomains || subdomains.length === 0 ? (
            <Card className="border-border bg-card border-dashed">
              <CardContent className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground h-full min-h-[200px]">
                <Globe className="w-12 h-12 mb-4 opacity-20" />
                <p>لا يوجد نطاقات فرعية مسجلة بعد</p>
              </CardContent>
            </Card>
          ) : (
            subdomains.map(sub => (
              <Card key={sub.id} className="border-border bg-card overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-lg flex items-center gap-2" dir="ltr">
                        {sub.fullDomain || `${sub.subdomain}.server.hub`}
                        <a href={`http://${sub.fullDomain || `${sub.subdomain}.server.hub`}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{sub.type}</Badge>
                        <span className="text-xs text-muted-foreground font-mono" dir="ltr">{"-> "}{sub.targetPath}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className={sub.status === 'active' ? 'bg-green-500/20 text-green-500 hover:bg-green-500/20 border-green-500/30' : ''}>
                      {sub.status === 'active' ? 'نشط' : 'غير نشط'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(sub.id.toString())}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

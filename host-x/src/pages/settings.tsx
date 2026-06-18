import { useState, useEffect, useRef } from "react";
import { useGetSettings, useUpdateSettings, useChangePassword, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, Eye, EyeOff, Calendar } from "lucide-react";

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const { data: me } = useGetMe();
  const updateSettings = useUpdateSettings();
  const changePwd = useChangePassword();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState("dark");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const initialized = useRef(false);

  // Create user dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [expiryDays, setExpiryDays] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (settings && !initialized.current) {
      setDisplayName(settings.displayName || "");
      setEmail(settings.email || "");
      setTheme(settings.theme || "dark");
      initialized.current = true;
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings.mutate({ data: { displayName, email, theme: theme as "dark" | "light" } }, {
      onSuccess: () => toast({ title: "تم حفظ الإعدادات" }),
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" })
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    changePwd.mutate({ data: { currentPassword, newPassword } }, {
      onSuccess: () => {
        toast({ title: "تم تغيير كلمة المرور بنجاح" });
        setCurrentPassword("");
        setNewPassword("");
      },
      onError: (err) => toast({ title: "خطأ", description: err.message, variant: "destructive" })
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPassword.trim()) return;
    setIsCreating(true);
    try {
      const days = parseInt(expiryDays);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newUserPassword,
          expiryDays: isNaN(days) || days <= 0 ? 0 : days,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحساب");
      const expiryNote = !isNaN(days) && days > 0 ? ` (تنتهي بعد ${days} يوم)` : "";
      toast({ title: `✅ تم إنشاء حساب ${newUsername}${expiryNote}` });
      setNewUsername("");
      setNewUserPassword("");
      setExpiryDays("");
      setIsCreateOpen(false);
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const isOwner = me?.role === "owner";

  if (isLoading) return <div className="p-8 flex items-center justify-center h-full text-muted-foreground text-sm">جاري التحميل...</div>;

  return (
    <div className="p-4 h-full overflow-y-auto" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-5 pb-4">
        <div>
          <h1 className="text-xl font-bold">إعدادات الحساب</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة تفضيلاتك والأمان</p>
        </div>

        {/* Admin section */}
        {isOwner && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-4 h-4 text-primary" />
                إدارة المستخدمين
                <Badge variant="secondary" className="text-[10px]">مشرف</Badge>
              </CardTitle>
              <CardDescription>إنشاء حسابات جديدة للمستخدمين مع تحديد صلاحية الحساب</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                إنشاء حساب جديد
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Profile & Theme */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">الملف الشخصي والمظهر</CardTitle>
            <CardDescription>تعديل بياناتك وتفضيلات العرض</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">الاسم</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} dir="auto" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">البريد الإلكتروني</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
              <div>
                <div className="text-sm font-medium">الوضع الليلي</div>
                <div className="text-xs text-muted-foreground">تفعيل أو تعطيل الوضع المظلم</div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={c => setTheme(c ? "dark" : "light")} />
            </div>
            <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} size="sm">
              {updateSettings.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">الأمان</CardTitle>
            <CardDescription>تغيير كلمة مرورك</CardDescription>
          </CardHeader>
          <form onSubmit={handleChangePassword}>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">كلمة المرور الحالية</Label>
                <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">كلمة المرور الجديدة</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} dir="ltr" />
              </div>
              <Button type="submit" variant="destructive" size="sm" disabled={changePwd.isPending || !currentPassword || !newPassword}>
                {changePwd.isPending ? "جاري التحديث..." : "تحديث كلمة المرور"}
              </Button>
            </CardContent>
          </form>
        </Card>

        <div className="text-center text-xs text-muted-foreground/50 py-2">
          𝚂𝙴𝚁𝚅𝙴𝚁 𝙷𝚄𝙱 — Hosting Control Panel
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              إنشاء حساب جديد
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">اسم المستخدم</Label>
              <Input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="username"
                dir="ltr"
                required
                autoFocus
                autoComplete="off"
                minLength={2}
                maxLength={32}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">كلمة المرور</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  required
                  minLength={4}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPw(!showNewPw)}
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                مدة صلاحية الحساب (أيام)
              </Label>
              <Input
                type="number"
                value={expiryDays}
                onChange={e => setExpiryDays(e.target.value)}
                placeholder="اتركه فارغاً = بلا انتهاء"
                dir="ltr"
                min="1"
                max="3650"
              />
              {expiryDays && parseInt(expiryDays) > 0 && (
                <p className="text-xs text-muted-foreground">
                  ينتهي الحساب في:{" "}
                  <span className="text-primary font-mono">
                    {new Date(Date.now() + parseInt(expiryDays) * 86400000).toLocaleDateString("ar-EG")}
                  </span>
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isCreating || !newUsername.trim() || !newUserPassword.trim()}>
                {isCreating ? "جاري الإنشاء..." : "إنشاء الحساب"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { username, password } }, {
      onSuccess: () => setLocation("/"),
      onError: (error) => {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: error?.message || "اسم المستخدم أو كلمة المرور غير صحيحة",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050508]" dir="rtl">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-bg" />
      </div>

      <style>{`
        .orb { position:absolute; border-radius:50%; filter:blur(80px); animation:float 14s ease-in-out infinite; }
        .orb-1 { width:520px;height:520px;background:radial-gradient(circle,#7c3aed 0%,transparent 70%);top:-12%;left:-10%;opacity:.3;animation-duration:16s; }
        .orb-2 { width:420px;height:420px;background:radial-gradient(circle,#4f46e5 0%,transparent 70%);bottom:-15%;right:-8%;opacity:.25;animation-duration:20s;animation-delay:-7s; }
        .orb-3 { width:280px;height:280px;background:radial-gradient(circle,#a855f7 0%,transparent 70%);top:45%;left:50%;opacity:.2;animation-duration:24s;animation-delay:-3s; }
        .grid-bg { position:absolute;inset:0;background-image:linear-gradient(rgba(124,58,237,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.05) 1px,transparent 1px);background-size:48px 48px; }
        @keyframes float {
          0%,100%{transform:translate(0,0) scale(1);}
          25%{transform:translate(3%,5%) scale(1.06);}
          50%{transform:translate(-3%,2%) scale(.95);}
          75%{transform:translate(5%,-3%) scale(1.03);}
        }
      `}</style>

      <div className="relative z-10 w-full max-w-[360px] px-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Logo + Brand */}
          <div className="flex flex-col items-center pt-8 pb-5 px-6 border-b border-white/8">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
              <img
                src="https://i.ibb.co/ymPvHxNR/photo.jpg"
                alt="SERVER HUB Logo"
                className="relative w-20 h-20 rounded-2xl object-cover border border-white/20 shadow-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <h1 className="text-2xl font-mono font-bold text-primary tracking-tight leading-none">𝚂𝙴𝚁𝚅𝙴𝚁 𝙷𝚄𝙱</h1>
            <p className="text-xs text-white/40 mt-1.5 tracking-wide">لوحة تحكم الاستضافة الاحترافية</p>
          </div>

          {/* Form */}
          <div className="px-6 py-6">
            <h2 className="text-center text-sm font-medium text-white/60 mb-5">تسجيل الدخول إلى حسابك</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs text-white/60">اسم المستخدم</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  dir="ltr"
                  className="h-11 bg-white/5 border-white/10 focus-visible:ring-primary focus-visible:border-primary/50 text-white placeholder:text-white/20"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-white/60">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="h-11 bg-white/5 border-white/10 focus-visible:ring-primary focus-visible:border-primary/50 text-white pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold mt-1 shadow-lg shadow-primary/30"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الدخول...
                  </span>
                ) : "دخول"}
              </Button>
            </form>
          </div>

          <div className="pb-4 text-center">
            <p className="text-[10px] text-white/20">𝚂𝙴𝚁𝚅𝙴𝚁 𝙷𝚄𝙱 · Hosting Control Panel</p>
          </div>
        </div>
      </div>
    </div>
  );
}

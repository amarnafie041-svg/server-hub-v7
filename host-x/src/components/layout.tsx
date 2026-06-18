import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  FolderGit2,
  Code2,
  TerminalSquare,
  Bot,
  Cpu,
  Globe,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/files", label: "الملفات", icon: FolderGit2 },
    { href: "/editor", label: "المحرر", icon: Code2 },
    { href: "/terminal", label: "الطرفية", icon: TerminalSquare },
    { href: "/ai", label: "الذكاء", icon: Bot },
    { href: "/processes", label: "العمليات", icon: Cpu },
    { href: "/subdomains", label: "النطاقات", icon: Globe },
    { href: "/settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-card shrink-0">
        <div className="font-mono text-base font-bold tracking-tight text-primary">
          𝚂𝙴𝚁𝚅𝙴𝚁 𝙷𝚄𝙱
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">{user.username}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              logout.mutate(undefined, {
                onSuccess: () => setLocation("/login"),
              });
            }}
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content — flex-1 + min-h-0 so children h-full works */}
      <main className="flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: "3.5rem" }}>
        <div className="h-full overflow-hidden">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 h-14 border-t border-border bg-card z-50 flex items-stretch">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[9px] font-medium transition-colors h-full px-0.5
                ${active
                  ? "text-primary border-t-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground border-t-2 border-transparent"
                }`}
            >
              <item.icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

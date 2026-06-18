import { Link } from "wouter";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-6 max-w-sm px-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">التسجيل محظور</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            إنشاء الحسابات متاح للمشرف فقط.<br />
            يرجى التواصل مع المشرف للحصول على حساب.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">العودة لتسجيل الدخول</Link>
        </Button>
      </div>
    </div>
  );
}

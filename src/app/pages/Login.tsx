import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { GraduationCap, School } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { supabase } from '../../services/supabase';
import { toast } from 'sonner';
import logo from '../../assets/logo.svg';

export const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState<number>(10); // Default grade for students

  const handleSubmit = async () => {
    if (!email || !password || !role) {
      toast.error('נא למלא את כל השדות ולבחור תפקיד');
      return;
    }

    if (!isLogin && !fullName) {
      toast.error('נא להזין שם מלא');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;

        // Strict Role Verification
        if (authData.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();

          if (profileError) {
            console.error(profileError);
            throw new Error('שגיאה בטעינת פרופיל משתמש');
          }

          if (role === 'student' && profile?.role !== 'student') {
            await supabase.auth.signOut();
            throw new Error('אין לך הרשאה להתחבר כתלמיד');
          }

          if (role === 'teacher' && profile?.role !== 'teacher') {
            await supabase.auth.signOut();
            throw new Error('אין לך הרשאה להתחבר כמורה');
          }
        }

        toast.success('התחברת בהצלחה');
        navigate(role === 'student' ? '/student/home' : '/teacher/home');
      } else {
        // SignUp with Metadata for Trigger
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
              grade: role === 'student' ? grade : null,
              avatar_url: null
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          toast.success('החשבון נוצר בהצלחה!');
          navigate(role === 'student' ? '/student/home' : '/teacher/home');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-primary/10 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="z-10 w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center justify-center w-24 h-24 mb-4">
            <img src={logo} alt="CheckMate Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">CheckMate</h1>
          <p className="text-muted-foreground text-lg">מערכת בדיקת מבחנים חכמה</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setRole('student')}
            className={cn(
              "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all duration-300",
              role === 'student'
                ? "bg-primary/20 border-primary shadow-lg shadow-primary/10"
                : "bg-card border-border hover:bg-card/80 hover:border-primary/50"
            )}
          >
            <GraduationCap className={cn("h-8 w-8", role === 'student' ? "text-primary" : "text-muted-foreground")} />
            <div className="text-center">
              <div className="font-semibold">כניסת תלמיד</div>
              <div className="text-xs text-muted-foreground">אזור אישי</div>
            </div>
          </button>

          <button
            onClick={() => setRole('teacher')}
            className={cn(
              "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all duration-300",
              role === 'teacher'
                ? "bg-secondary/20 border-secondary shadow-lg shadow-secondary/10"
                : "bg-card border-border hover:bg-card/80 hover:border-secondary/50"
            )}
          >
            <School className={cn("h-8 w-8", role === 'teacher' ? "text-secondary" : "text-muted-foreground")} />
            <div className="text-center">
              <div className="font-semibold">כניסת מורה</div>
              <div className="text-xs text-muted-foreground">ניהול כיתות</div>
            </div>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: role ? 1 : 0.5, height: 'auto' }}
          className="space-y-4"
        >
          <div className="space-y-4 bg-card/50 p-6 rounded-2xl border border-border/50 backdrop-blur-sm">
            {!isLogin && (
              <Input
                placeholder="שם מלא"
                className="bg-background/50"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            )}

            {/* Grade Selector for Student Signup */}
            {!isLogin && role === 'student' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground mr-1">כיתה</label>
                <select
                  value={grade}
                  onChange={e => setGrade(Number(e.target.value))}
                  className="flex h-12 w-full rounded-xl border border-input bg-input-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {[7, 8, 9, 10, 11, 12].map(g => (
                    <option key={g} value={g}>כיתה {g}</option>
                  ))}
                </select>
              </div>
            )}

            <Input
              placeholder="אימייל"
              className="bg-background/50"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="סיסמה"
              className="bg-background/50"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <div className="flex justify-between text-sm text-muted-foreground px-1">
              <button
                className="hover:text-primary transition-colors"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'אין לך חשבון? הרשמה' : 'יש לך חשבון? התחברות'}
              </button>
              {isLogin && <button className="hover:text-primary">שכחתי סיסמה</button>}
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg shadow-xl shadow-primary/20"
            onClick={handleSubmit}
            disabled={!role || loading}
            isLoading={loading}
          >
            {isLogin ? 'התחברות' : 'הרשמה'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

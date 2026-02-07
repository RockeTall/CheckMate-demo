import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Upload, ChevronLeft, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { gradeToHebrew } from '../utils';

export const StudentHome = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchClasses = async () => {
      try {
        const { data, error } = await supabase
          .from('class_enrollments')
          .select(`
            class_id,
            classes (
              id,
              name,
              grade,
              teacher_id
            )
          `)
          .eq('student_id', user.id);

        if (error) throw error;

        // Flatten logic and filter out nulls (in case RLS hides a class or it was deleted)
        const formatted = data?.map((item: any) => item.classes).filter((c: any) => c !== null) || [];
        setClasses(formatted);
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">שלום, {profile?.full_name?.split(' ')[0] || 'תלמיד'} 👋</h1>
        <Button onClick={() => navigate('/student/upload')} variant="secondary" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          העלאת מבחן
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">הכיתות שלי</h2>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">טוען כיתות...</div>
        ) : classes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-2 opacity-20" />
              <p>אינך רשום לאף כיתה עדיין.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className="cursor-pointer hover:border-primary/50 group overflow-hidden relative"
                onClick={() => navigate(`/student/class/${cls.id}`)}
              >
                <div className="absolute top-0 right-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{cls.name}</h3>
                      <p className="text-muted-foreground">שכבה {gradeToHebrew(cls.grade)}</p>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/practice/${cls.id}`); // This should actually be an exam ID, but keeping class for now as placeholder or need logic
                    }}
                    title="תרגול"
                  >
                    <BookOpen className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

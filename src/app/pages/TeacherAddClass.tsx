import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowRight, Check, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../utils';

export const TeacherAddClass = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState<number>(10);
  const [subject, setSubject] = useState(''); // Note: Subject isn't in DB schema yet? Prompt said "name, grade". We can put subject in name or add column. Let's assume Name includes subject or just use Name.
  // Prompt SQL: name TEXT, grade INTEGER.
  // I will concatenate Subject to Name or just use Name.

  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Fetch students when grade changes
  useEffect(() => {
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .eq('grade', grade);

      if (error) {
        console.error(error);
        toast.error('שגיאה בטעינת תלמידים');
      } else {
        setAvailableStudents(data || []);
        setSelectedStudents([]); // Reset selection
      }
    };

    fetchStudents();
  }, [grade]);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!className) {
      toast.error('נא להזין שם כיתה');
      return;
    }
    if (!user) {
      toast.error('שגיאת אימות משתמש - נסה להתחבר מחדש');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating class:', { className, grade, teacher_id: user.id });

      // 1. Create Class
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert({
          name: className,
          grade: grade,
          teacher_id: user.id
        })
        .select()
        .single();

      if (classError) {
        console.error('Class creation error:', classError);
        throw new Error('שגיאה ביצירת הכיתה: ' + classError.message);
      }

      if (!classData) throw new Error('Failed to retrieve Created Class object');

      if (selectedStudents.length > 0) {
        console.log('Enrolling students:', selectedStudents.length);

        // 2. Enroll Students
        const enrollments = selectedStudents.map(studentId => ({
          class_id: classData.id,
          student_id: studentId
        }));

        const { error: enrollError } = await supabase
          .from('class_enrollments')
          .insert(enrollments);

        if (enrollError) {
          console.error('Enrollment error:', enrollError);
          toast.warning('הכיתה נוצרה, אך הייתה שגיאה ברישום התלמידים.');
          // Don't throw, allow success
        } else {
          // 3. Notify Students (Only if enrollment succeeded)
          const notifications = selectedStudents.map(studentId => ({
            user_id: studentId,
            title: 'הצטרפת לכיתה חדשה',
            message: `המורה צירף אותך לכיתה ${className}`,
          }));

          const { error: notifError } = await supabase.from('notifications').insert(notifications);
          if (notifError) console.error('Notification error:', notifError);

          console.log('Enrollments created successfully:', enrollments);
        }
      } else {
        console.log('No students selected for enrollment.');
      }

      toast.success('הכיתה נוצרה בהצלחה!');
      // Small delay to ensure toast is visible and state settles
      setTimeout(() => navigate('/teacher/home'), 500);

    } catch (error: any) {
      console.error('Transaction failed:', error);
      toast.error(error.message || 'שגיאה בלתי צפויה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 text-muted-foreground">
        <button onClick={() => navigate(-1)} className="hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <span>חזרה</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">יצירת כיתה חדשה</h1>
        <p className="text-muted-foreground">הגדר כיתה והוסף תלמידים</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              פרטי הכיתה
            </h3>

            <Input
              label="שם הכיתה (לדוגמה: היסטוריה י״א 5)"
              value={className}
              onChange={e => setClassName(e.target.value)}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">שכבה</label>
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
          </CardContent>
        </Card>

        <Card className="md:row-span-2">
          <CardContent className="p-6 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                תלמידים משכבה {grade}
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {selectedStudents.length} נבחרו
              </span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] space-y-2 border rounded-xl p-2 bg-muted/20">
              {availableStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mb-2 opacity-50" />
                  לא נמצאו תלמידים בשכבה זו
                </div>
              ) : (
                availableStudents.map(student => (
                  <div
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                      selectedStudents.includes(student.id)
                        ? "bg-primary/10 border-primary"
                        : "bg-background border-transparent hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                      selectedStudents.includes(student.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}>
                      {selectedStudents.includes(student.id) && <Check className="h-3 w-3" />}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium text-sm">{student.full_name || student.email}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Button className="w-full md:w-1/2" size="lg" onClick={handleCreate} isLoading={loading}>
        יצירת כיתה
      </Button>
    </div>
  );
};

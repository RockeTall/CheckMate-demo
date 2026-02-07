import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { StatusChip } from '../components/ui/StatusChip';
import { ArrowRight, BrainCircuit, FileText } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { gradeToHebrew } from '../utils';

export const StudentClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [classData, setClassData] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId || !user) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Class Details
        const { data: cls, error: clsError } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classId)
          .single();

        if (clsError) throw clsError;
        setClassData(cls);

        // 2. Fetch Exams for this class
        const { data: examsData, error: examsError } = await supabase
          .from('exams')
          .select('*')
          .eq('class_id', classId)
          .order('created_at', { ascending: false });

        if (examsError) throw examsError;

        // 3. Fetch My Submissions
        const { data: submissions, error: subError } = await supabase
          .from('exam_submissions')
          .select('*')
          .eq('student_id', user.id)
          .in('exam_id', (examsData || []).map(e => e.id));

        if (subError) throw subError;

        // 4. Merge Data
        const mergedExams = (examsData || []).map(exam => {
          const sub = submissions?.find(s => s.exam_id === exam.id);
          let status = 'pending';
          let statusLabel = 'ממתין להגשה';
          let grade = null;

          if (sub) {
            if (sub.final_grade !== null) { // Exam is public so we can show grade if it exists
              status = 'graded';
              statusLabel = `ציון: ${sub.final_grade}`;
              grade = sub.final_grade;
            } else {
              status = 'submitted';
              statusLabel = 'ממתין לבדיקה';
            }
          }
          // If no submission, it remains 'pending'/'waiting'

          return {
            ...exam,
            status,
            statusLabel,
            grade
          };
        });

        setExams(mergedExams);

      } catch (error) {
        console.error('Error fetching student class data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classId, user]);

  if (loading) return <div className="p-6 text-center text-muted-foreground">טוען נתונים...</div>;
  if (!classData) return <div className="p-6 text-center text-red-500">כיתה לא נמצאה</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <button onClick={() => navigate('/student/home')} className="hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <span>חזרה לכיתות</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{classData.name}</h1>
        <p className="text-muted-foreground">שכבה {gradeToHebrew(classData.grade)}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">מבחנים ועבודות</h2>
        {exams.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground">
            <p>אין מבחנים בכיתה זו עדיין.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="overflow-hidden hover:bg-card/80 transition-colors cursor-pointer"
                onClick={() => {
                  if (exam.status === 'graded') {
                    navigate(`/student/exam/${exam.id}`);
                  } else if (exam.status === 'submitted') {
                    toast.info('המבחן הוגש ונמצא בבדיקה.');
                  } else {
                    // If pending, go to upload page
                    navigate(`/student/exam/${exam.id}/upload`);
                  }
                }}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="mt-1 h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold line-clamp-2">{exam.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(exam.created_at).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <StatusChip
                      status={exam.status === 'graded' ? 'completed' : exam.status === 'submitted' ? 'grading' : 'pending'}
                      label={exam.statusLabel}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/practice/${exam.id}`);
                      }}
                    >
                      <BrainCircuit className="h-4 w-4 ml-2" />
                      תרגול נושא
                    </Button>
                    {exam.status === 'graded' && (
                      <Button
                        className="flex-1"
                        size="sm"
                        variant='primary'
                      >
                        צפייה במשוב
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

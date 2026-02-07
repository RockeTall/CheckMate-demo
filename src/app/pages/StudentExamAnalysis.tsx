import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowRight, BrainCircuit, CheckCircle2, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '../utils';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const StudentExamAnalysis = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [gradeDetails, setGradeDetails] = useState<any[]>([]);

  useEffect(() => {
    if (!examId || !user) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Exam
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .single();
        if (examError) throw examError;
        setExam(examData);

        // 2. Fetch Submission
        const { data: subData, error: subError } = await supabase
          .from('exam_submissions')
          .select('*')
          .eq('exam_id', examId)
          .eq('student_id', user.id)
          .single();

        if (subError) throw subError;
        setSubmission(subData);

        // 3. Fetch Question Grades
        const { data: qGrades, error: qError } = await supabase
          .from('question_grades')
          .select('*')
          .eq('submission_id', subData.id)
          .order('question_number', { ascending: true });

        if (qError) throw qError;
        setGradeDetails(qGrades || []);

      } catch (error) {
        console.error('Error fetching analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId, user]);

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  if (!exam) return <div className="p-10 text-center">מבחן לא נמצא</div>;

  if (!submission || !exam.is_sent_to_students) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">טרם התקבל ציון</h2>
          <p className="text-muted-foreground">המבחן עדיין בבדיקה או שהציונים טרם פורסמו.</p>
        </div>
        <Button onClick={() => navigate(-1)} variant="outline">חזרה</Button>
      </div>
    );
  }


  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-2 text-muted-foreground">
        <button onClick={() => navigate(-1)} className="hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <span>חזרה למבחן</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold">{exam.name}</h1>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">שכבה {exam.grade || 'יא'}</span>
          <span className="text-sm text-muted-foreground">{new Date(submission.submitted_at).toLocaleDateString('he-IL')}</span>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-card to-primary/5 border-primary/20">
        <CardContent className="p-6 text-center space-y-4">
          <div className="inline-flex flex-col items-center justify-center">
            <span className="text-sm text-muted-foreground mb-1">ציון סופי</span>
            <div className="text-6xl font-bold text-primary tracking-tighter">{submission.final_grade}</div>
          </div>

          <div className="bg-background/40 p-4 rounded-xl border border-white/5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              כל הכבוד על ההשקעה! עיין במשוב המפורט למטה כדי ללמוד ולהשתפר לפעם הבאה.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          ניתוח תשובות
        </h2>

        {gradeDetails.map((gradeItem, _index) => {
          // Find original question text if available
          const questionText = exam.questions?.find((q: any) => q.number === gradeItem.question_number)?.text || gradeItem.question_text || `שאלה ${gradeItem.question_number}`;
          const deduction = gradeItem.points_deducted || 0;

          return (
            <Card key={gradeItem.id} className="overflow-hidden">
              <div className={cn(
                "h-1 w-full",
                deduction === 0 ? "bg-green-500" : deduction < 5 ? "bg-yellow-500" : "bg-red-500"
              )} />
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-muted-foreground">שאלה {gradeItem.question_number}</span>
                  <div className="text-sm font-medium">
                    {gradeItem.final_grade} / {gradeItem.points_possible}
                  </div>
                </div>

                <h3 className="font-medium">{questionText}</h3>

                <div className="bg-muted/30 p-3 rounded-lg space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">תשובתך:</span>
                  <p className="text-sm">{gradeItem.student_answer || "(ללא תשובה)"}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">משוב CheckMate</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-primary/5 p-3 rounded-lg border border-primary/10 whitespace-pre-line">
                    {gradeItem.ai_remarks || "אין הערות."}
                  </p>
                </div>

                {gradeItem.teacher_remarks && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-primary">הערות המורה:</span>
                    <p className="text-sm text-muted-foreground bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                      {gradeItem.teacher_remarks}
                    </p>
                  </div>
                )}

                {deduction > 0 && (
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium bg-destructive/10 p-2 rounded px-3 w-fit">
                    <span>נוכו {deduction} נקודות</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border z-10 max-w-6xl mx-auto">
        <Button
          className="w-full shadow-lg shadow-primary/20"
          size="lg"
          onClick={() => navigate(`/student/practice/${encodeURIComponent(exam.name)}`)}
        >
          <TrendingUp className="ml-2 h-5 w-5" />
          תרגול נושא זה
        </Button>
      </div>
    </div>
  );
};

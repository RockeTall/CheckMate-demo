import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowRight, BrainCircuit, Edit2, Check, Loader2 } from 'lucide-react';
import { GeminiScanner, GradedQuestion } from '../../services/GeminiScanner';
import { supabase } from '../../services/supabase';
import { toast } from 'sonner';

export const TeacherGrading = () => {
  const { examId, studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [grades, setGrades] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  // Local state for editing
  const [isEditing, setIsEditing] = useState<string | null>(null); // question_grade id
  const [editForm, setEditForm] = useState({
    points_deducted: 0,
    ai_remarks: '',
    teacher_remarks: ''
  });

  const fetchData = async () => {
    try {
      // 1. Fetch Exam Metadata & Questions
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      if (examError) throw examError;
      setExam(examData);

      // 2. Fetch Student Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single();
      setStudentProfile(profileData);

      // 3. Fetch Submission
      const { data: subData, error: subError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError; // If not found, that's okay (not submitted)

      if (subData) {
        setSubmission(subData);
        // 4. Fetch Question Grades
        const { data: qGrades, error: qError } = await supabase
          .from('question_grades')
          .select('*')
          .eq('submission_id', subData.id)
          .order('question_number', { ascending: true });

        if (qError) throw qError;
        setGrades(qGrades || []);
      } else {
        // No submission found
        toast.info('התלמיד טרם הגיש את המבחן');
      }

    } catch (error) {
      console.error('Error fetching grading data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!examId || !studentId) return;
    fetchData();
  }, [examId, studentId]);

  const handleEditStart = (gradeItem: any) => {
    setIsEditing(gradeItem.id);
    setEditForm({
      points_deducted: gradeItem.points_deducted || 0,
      ai_remarks: gradeItem.ai_remarks || '',
      teacher_remarks: gradeItem.teacher_remarks || ''
    });
  };

  const handleSave = async (gradeItem: any) => {
    try {
      const newScore = Math.max(0, gradeItem.points_possible - Number(editForm.points_deducted));

      // 1. Update question grade
      const { error } = await supabase
        .from('question_grades')
        .update({
          points_deducted: Number(editForm.points_deducted),
          final_grade: newScore,
          ai_remarks: editForm.ai_remarks,
          teacher_remarks: editForm.teacher_remarks
        })
        .eq('id', gradeItem.id);

      if (error) throw error;

      // 2. Update local state
      const updatedGrades = grades.map(g =>
        g.id === gradeItem.id ? { ...g, ...editForm, final_grade: newScore } : g
      );
      setGrades(updatedGrades);
      setIsEditing(null);

      // 3. Recalculate Final Exam Grade (Average)
      const validGrades = updatedGrades.filter(g => g.final_grade !== null);
      const sum = validGrades.reduce((acc, g) => acc + (g.final_grade || 0), 0);
      const totalScore = validGrades.length > 0 ? Math.round(sum / validGrades.length) : 0;

      // Update submission
      await supabase
        .from('exam_submissions')
        .update({ final_grade: totalScore })
        .eq('id', submission.id);

      setSubmission({ ...submission, final_grade: totalScore });
      toast.success('ציון עודכן');

    } catch (error: any) {
      toast.error('שגיאה בשמירה: ' + error.message);
    }
  };

  const [isGrading, setIsGrading] = useState(false);

  const handleAIGrade = async () => {
    if (!submission?.images_urls?.length) {
      toast.error('אין תמונות לבדיקה');
      return;
    }

    // Check Session before starting
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('החיבור התנתק, נא להתחבר מחדש');
      navigate('/login');
      return;
    }

    setIsGrading(true);
    const toastId = toast.loading('מתחיל בבדיקה...', { description: 'טוען מודלים...' });

    try {
      // Use Client-Side Scanner
      const result = await GeminiScanner.gradeExam(
        submission,
        exam,
        (status) => {
          toast.loading(status, { id: toastId });
        }
      );

      // Preparation for payload
      let finalAvgGrade = 0;
      let payload: any[] = []; // Explicit type

      if (result.gradedQuestions.length > 0) {
        payload = result.gradedQuestions.map((g: GradedQuestion) => ({
          submission_id: submission.id,
          question_number: g.question_number,
          question_text: g.question_text,
          student_answer: g.student_answer,
          ai_grade: g.ai_grade,
          ai_remarks: g.ai_remarks,
          points_possible: g.points_possible,
          final_grade: g.ai_grade,
          ai_confidence: g.confidence
        }));

        // Calculate Average
        const sum = payload.reduce((acc, g) => acc + (g.ai_grade || 0), 0);
        finalAvgGrade = Math.round(sum / payload.length);
      }

      // Save results to Supabase (including final grade)
      const { error: updateError } = await supabase
        .from('exam_submissions')
        .update({
          transcribed_text: result.transcribed_text,
          ai_processing_status: 'completed',
          ai_processing_completed_at: new Date().toISOString(),
          final_grade: finalAvgGrade // Update final grade immediately
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Delete old grades
      await supabase.from('question_grades').delete().eq('submission_id', submission.id);

      // Insert new grades
      if (payload.length > 0) {
        const { error: insertError } = await supabase.from('question_grades').insert(payload);
        if (insertError) throw insertError;
      }

      toast.success('הבדיקה הושלמה בהצלחה!', { id: toastId });

      // INSTANTLY UPDATE UI STATE
      setSubmission((prev: any) => ({
        ...prev,
        final_grade: finalAvgGrade,
        transcribed_text: result.transcribed_text
      }));

      // We need to fetch the inserted IDs usually, but for display we can use payload with temp IDs or just fetch.
      // Since we just inserted, fetching is safer to get the generated IDs for future edits.
      await fetchData();

    } catch (error: any) {
      console.error('AI Grading Error:', error);
      toast.error('שגיאה בבדיקה האוטומטית: ' + error.message, { id: toastId, duration: 5000 });
    } finally {
      setIsGrading(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  if (!exam) return <div className="p-10 text-center text-red-500">מבחן לא נמצא</div>;
  if (!submission) return <div className="p-10 text-center">התלמיד טרם הגיש מבחן זה.</div>;

  // Use exam questions array to drive the list, matching with grades
  // If no grades exist yet (bug?), fallback to questions list
  // FIX: If exam.questions is empty (dynamic exam), use grades to drive the UI
  const questionsList = (exam.questions && exam.questions.length > 0)
    ? exam.questions
    : grades.map(g => ({
      number: g.question_number,
      text: g.question_text || `Question ${g.question_number}`,
      points: g.points_possible
    }));

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <button onClick={() => navigate(`/teacher/exam/${examId}`)} className="hover:text-foreground">
            <ArrowRight className="h-5 w-5" />
          </button>
          <span>חזרה לרשימה</span>
        </div>
        <div>{/* Next/Prev buttons could go here */}</div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between sticky top-[60px] z-30 shadow-sm">
        <div>
          <div className="font-bold">{studentProfile?.full_name || 'תלמיד'}</div>
          <div className="text-xs text-muted-foreground">{exam.name}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{submission.final_grade || 0}</div>
          <div className="text-xs text-muted-foreground">ציון סופי</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Images / Transcriptions */}
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-muted-foreground/20 overflow-hidden relative">
            {submission.images_urls && submission.images_urls.length > 0 ? (
              <img
                src={submission.images_urls[selectedPageIndex]}
                alt={`Exam Page ${selectedPageIndex + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-muted-foreground">אין צילום מחברת</span>
            )}
          </div>

          {/* Thumbnail Strip */}
          {submission.images_urls && submission.images_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {submission.images_urls.map((url: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPageIndex(idx)}
                  className={`shrink-0 w-16 h-20 rounded-lg border-2 overflow-hidden transition-all ${selectedPageIndex === idx
                    ? 'border-primary ring-2 ring-primary/30 scale-105'
                    : 'border-border hover:border-primary/50 opacity-60 hover:opacity-100'
                    }`}
                >
                  <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Page Counter */}
          {submission.images_urls && submission.images_urls.length > 1 && (
            <div className="text-center text-sm text-muted-foreground">
              עמוד {selectedPageIndex + 1} מתוך {submission.images_urls.length}
            </div>
          )}
        </div>

        {/* Questions Grading Form */}
        <div className="space-y-6">

          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5" />
                  בדיקה אוטומטית
                </h3>
                <p className="text-indigo-100 text-sm opacity-90">תן לבינה המלאכותית לבדוק את המבחן ולתת ציונים ראשוניים.</p>
              </div>
              {/* Confidence Badge if grades exist */}
              {grades.length > 0 && grades[0].ai_confidence && (
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                  רמת ביטחון: {Math.round(grades[0].ai_confidence * 100)}%
                </div>
              )}
            </div>

            <Button
              onClick={handleAIGrade}
              disabled={isGrading}
              className="w-full bg-white text-indigo-600 hover:bg-white/90 font-bold h-12 text-lg shadow-sm border-0"
            >
              {isGrading ? (
                <>
                  <Loader2 className="animate-spin ml-2 h-5 w-5" />
                  הבינה המלאכותית בודקת...
                </>
              ) : (
                '🤖 בדוק עם בינה מלאכותית'
              )}
            </Button>
          </div>

          {questionsList.map((q: any, idx: number) => {
            // Find corresponding grade record
            // Assuming question_number aligns with index + 1 or q.number
            const qNum = q.number || idx + 1;
            const gradeItem = grades.find(g => g.question_number === qNum);

            // If we don't have a grade record yet (maybe AI hasn't run), show placeholder or handle it.
            // For now assuming rows exist. If not, can't edit.
            if (!gradeItem) return (
              <Card key={idx} className="opacity-50">
                <CardContent className="p-4">שאלה {q.number}: טרם נבדקה (אין נתונים ב-DB)</CardContent>
              </Card>
            );

            const isEditingThis = isEditing === gradeItem.id;
            const currentScore = gradeItem.final_grade ?? gradeItem.points_possible;

            return (
              <Card key={gradeItem.id} className={`transition-all ${isEditingThis ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-muted-foreground">שאלה {gradeItem.question_number}</span>
                    <div className="flex items-center gap-2">
                      {/* Score Display / Edit */}
                      {isEditingThis ? (
                        <div className="flex items-center gap-2">
                          <div className="text-xs">הפחתה:</div>
                          <Input
                            type="number"
                            className="w-16 h-8 text-red-500"
                            value={editForm.points_deducted}
                            onChange={(e) => setEditForm({ ...editForm, points_deducted: Number(e.target.value) })}
                          />
                          <div className="text-xs text-muted-foreground">מתוך {gradeItem.points_possible}</div>
                        </div>
                      ) : (
                        <div className="text-lg font-bold">
                          {currentScore} <span className="text-sm font-normal text-muted-foreground">/ {gradeItem.points_possible}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="font-medium">{q.text}</p>

                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">תשובת התלמיד (מתומלל):</span>
                    <p className="text-sm">{gradeItem.student_answer || "(ללא תשובה)"}</p>
                  </div>

                  {/* AI Remarks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary text-xs font-bold">
                        <BrainCircuit className="h-3 w-3" />
                        משוב AI
                      </div>
                      {!isEditingThis && (
                        <button onClick={() => handleEditStart(gradeItem)} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary">
                          <Edit2 className="h-3 w-3" />
                          עריכה
                        </button>
                      )}
                    </div>

                    {isEditingThis ? (
                      <textarea
                        className="w-full h-24 bg-background border rounded-lg p-2 text-sm resize-none"
                        value={editForm.ai_remarks}
                        onChange={(e) => setEditForm({ ...editForm, ai_remarks: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
                        {gradeItem.ai_remarks}
                      </p>
                    )}
                  </div>

                  {/* Teacher Remarks */}
                  {isEditingThis && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold">הערות מורה</label>
                      <textarea
                        className="w-full h-16 bg-background border rounded-lg p-2 text-sm resize-none"
                        placeholder="כתוב הערה אישית..."
                        value={editForm.teacher_remarks}
                        onChange={(e) => setEditForm({ ...editForm, teacher_remarks: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  {isEditingThis && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(null)}>ביטול</Button>
                      <Button size="sm" onClick={() => handleSave(gradeItem)}>
                        <Check className="mr-2 h-4 w-4" />
                        שמירה
                      </Button>
                    </div>
                  )}

                </CardContent>
              </Card>
            );
          })}
        </div>
      </div >
    </div >
  );
};

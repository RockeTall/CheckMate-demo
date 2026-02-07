import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowRight, BrainCircuit, User, Settings, Send, Save, Loader2, CheckCircle2, Upload, X, FileText, Camera } from 'lucide-react';
import { cn } from '../utils';
import { supabase } from '../../services/supabase';
import { toast } from 'sonner';
import { GeminiScanner } from '../../services/GeminiScanner';


import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const TeacherExamMain = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [_rubricFile, setRubricFile] = useState<File | null>(null);

  const [activeTab, setActiveTab] = useState<'students' | 'insights'>('students');
  const [loading, setLoading] = useState(true);

  // Data State
  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Setup Form State
  const [guidelines, setGuidelines] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [rubricText, setRubricText] = useState('');
  const [saving, setSaving] = useState(false);

  // Questions Sheet Upload State (for separate_sheet mode)
  const [questionsFiles, setQuestionsFiles] = useState<File[]>([]);
  const [questionsPreviews, setQuestionsPreviews] = useState<string[]>([]);
  const [scanningQuestions, setScanningQuestions] = useState(false);

  useEffect(() => {
    if (!examId) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Exam Details
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .single();

        if (examError) throw examError;
        setExam(examData);
        setGuidelines(examData.grading_guidelines || '');
        setRubricText(examData.rubric || '');
        setQuestionsText(JSON.stringify(examData.questions || [], null, 2));

        // 2. Fetch Class Students (via enrollments)
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('class_enrollments')
          .select('student:profiles(*)') // Join profile
          .eq('class_id', examData.class_id);

        if (enrollmentError) throw enrollmentError;

        // 3. Fetch Submissions
        const { data: submissionsData, error: subError } = await supabase
          .from('exam_submissions')
          .select('*')
          .eq('exam_id', examId);

        if (subError) throw subError;

        // 4. Merge Data
        const mergedStudents = enrollmentData?.map((enrollment: any) => {
          const student = enrollment.student;
          const submission = submissionsData?.find(s => s.student_id === student.id);

          let status = 'pending'; // Not submitted
          let score = null;

          if (submission) {
            if (submission.final_grade !== null) {
              status = 'graded';
              score = submission.final_grade;
            } else {
              status = 'submitted'; // Submitted but not graded
            }
          }

          return {
            id: student.id,
            name: student.full_name,
            avatar_url: student.avatar_url,
            status,
            score,
            submissionId: submission?.id,
            submittedAt: submission?.submitted_at
          };
        }) || [];

        setStudents(mergedStudents);

        // 5. Fetch Analytics
        const { data: analyticsData } = await supabase
          .from('class_analytics')
          .select('*')
          .eq('exam_id', examId)
          .single();

        if (analyticsData) setAnalytics(analyticsData);

      } catch (error) {
        console.error('Error fetching exam data:', error);
        toast.error('שגיאה בטעינת נתוני המבחן');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Try parse questions JSON
      let parsedQuestions = null;
      try {
        if (questionsText) parsedQuestions = JSON.parse(questionsText);
      } catch (e) {
        toast.error('פורמט השאלות אינו תקין (JSON)');
        setSaving(false);
        return;
      }

      let rubricUrl = exam?.rubric_file_url;
      // Mock File Upload (assuming storage logic is complex for now, but user asked for it)
      // Real implementation would be:
      /*
      if (rubricFile) {
        const fileExt = rubricFile.name.split('.').pop();
        const fileName = `${exam.id}-rubric.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('exam-files').upload(fileName, rubricFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('exam-files').getPublicUrl(fileName);
        rubricUrl = data.publicUrl;
      }
      */

      const { error } = await supabase
        .from('exams')
        .update({
          grading_guidelines: guidelines,
          rubric: rubricText,
          questions: parsedQuestions,
          rubric_file_url: rubricUrl,
          exam_type: exam.exam_type || 'integrated',
          use_teacher_style: exam.use_teacher_style || false
        })
        .eq('id', examId);

      if (error) throw error;
      toast.success('ההגדרות נשמרו בהצלחה');
      setShowSettings(false);
    } catch (error: any) {
      toast.error('שגיאה בשמירה: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle questions sheet file upload
  const handleQuestionsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setQuestionsFiles(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setQuestionsPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeQuestionsFile = (index: number) => {
    setQuestionsFiles(prev => prev.filter((_, i) => i !== index));
    setQuestionsPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Scan uploaded questions sheet with AI
  const handleScanQuestions = async () => {
    if (questionsFiles.length === 0) {
      toast.error('נא להעלות תמונות של גיליון השאלות');
      return;
    }

    setScanningQuestions(true);
    const toastId = toast.loading('סורק את גיליון השאלות...');

    try {
      // Convert files to base64
      const imagePromises = questionsFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(imagePromises);

      // Use GeminiScanner to extract questions
      const extractedQuestions = await GeminiScanner.extractQuestionsFromSheet(base64Images, (status) => {
        toast.loading(status, { id: toastId });
      });

      if (extractedQuestions && extractedQuestions.length > 0) {
        setQuestionsText(JSON.stringify(extractedQuestions, null, 2));
        toast.success(`נמצאו ${extractedQuestions.length} שאלות!`, { id: toastId });
      } else {
        toast.error('לא הצלחתי לזהות שאלות בתמונות', { id: toastId });
      }
    } catch (error: any) {
      console.error('Questions scan error:', error);
      toast.error('שגיאה בסריקת השאלות: ' + error.message, { id: toastId });
    } finally {
      setScanningQuestions(false);
    }
  };

  const handleSendGrades = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך לפרסם את הציונים לכל התלמידים?')) return;

    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_sent_to_students: true })
        .eq('id', examId);

      if (error) throw error;

      setExam((prev: any) => ({ ...prev, is_sent_to_students: true }));
      toast.success('הציונים פורסמו בהצלחה!');
      toast.success('הציונים פורסמו בהצלחה!');
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בפרסום הציונים');
    }
  };

  const handleGenerateInsights = async () => {
    // Only graded students
    const gradedStudents = students.filter(s => s.status === 'graded');

    if (gradedStudents.length < 1) { // Allow even 1 for testing
      toast.error('אין מספיק מבחנים בדוקים כדי לייצר תובנות.');
      return;
    }

    if (!window.confirm('האם אתה רוצה לייצר תובנות חדשות לכל הכיתה? פעולה זו עשויה לקחת כדקה.')) return;

    setLoading(true);
    const toastId = toast.loading('מנתח נתוני כיתה...');

    try {
      // We need detailed submissions for the AI (with question grades)
      // The current 'students' state is shallow. We need to fetch full structure for graded ones or use what we have if specific enough.
      // Actually we merged 'submissionsData' in fetchData, but didn't store the full structure in state, only summary. 
      // We need to re-fetch full details or (better) fetch deeper in the beginning?
      // Let's fetch specifically for this action to be safe and fresh.

      const { data: fullSubmissions, error: subError } = await supabase
        .from('exam_submissions')
        .select('*, student:profiles(*), question_grades(*)')
        .eq('exam_id', examId)
        .not('final_grade', 'is', null);

      if (subError) throw subError;

      const insights = await GeminiScanner.generateClassInsights(exam, fullSubmissions, (status) => {
        toast.loading(status, { id: toastId });
      });

      if (!insights) throw new Error('Could not generate insights');

      // Save to DB
      const { error: saveError } = await supabase
        .from('class_analytics')
        .upsert({
          exam_id: examId,
          teaching_suggestions: insights.teaching_suggestions,
          struggling_topics: insights.struggling_topics,
          students_needing_help: insights.students_needing_help,
          average_grade: fullSubmissions.reduce((acc, curr) => acc + (curr.final_grade || 0), 0) / fullSubmissions.length
        }, { onConflict: 'exam_id' })
        .select()
        .single();

      if (saveError) throw saveError;

      setAnalytics(insights);
      toast.success('התובנות נוצרו בהצלחה!', { id: toastId });

    } catch (error: any) {
      console.error('Insights Error:', error);
      toast.error('שגיאה ביצירת תובנות: ' + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (student: any) => {
    if (student.status === 'pending') {
      toast.info('התלמיד טרם הגיש את המבחן');
      return;
    }
    navigate(`/teacher/grading/${examId}/${student.id}`);
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  if (!exam) return <div className="p-10 text-center text-red-500">מבחן לא נמצא</div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <button onClick={() => navigate(`/teacher/class/${exam.class_id}`)} className="hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <span>חזרה לכיתה</span>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold">{exam.name}</h1>
          <p className="text-muted-foreground">נושא: {exam.subject}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
            הגדרות מבחן
          </Button>

          {/* Show Send Grades only if graded somehow? Or just always allow if not sent yet? */}
          {!exam.is_sent_to_students && (
            <Button size="sm" className="gap-2" onClick={handleSendGrades}>
              <Send className="h-4 w-4" />
              פרסם ציונים
            </Button>
          )}
          {exam.is_sent_to_students && (
            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              הציונים פורסמו
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-blue-600">{students.filter(s => s.status !== 'pending').length}</span>
            <span className="text-sm text-muted-foreground">הוגשו</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-green-600">{students.filter(s => s.status === 'graded').length}</span>
            <span className="text-sm text-muted-foreground">נבדקו</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-yellow-600">{students.filter(s => s.status === 'pending').length}</span>
            <span className="text-sm text-muted-foreground">טרם הוגשו</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-muted/50 rounded-xl w-fit">
        {['students', 'insights'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-6 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === tab ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === 'students' && 'תלמידים'}
            {tab === 'insights' && 'תובנות'}
          </button>
        ))}
      </div>

      {/* Content: Students List */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="space-y-2">
            {students.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">אין תלמידים רשומים לכיתה זו.</div>
            ) : (
              students.map((student) => (
                <Card
                  key={student.id}
                  className="hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleStudentClick(student)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className={cn(
                          "text-xs",
                          student.status === 'graded' ? "text-green-600 font-medium" :
                            student.status === 'submitted' ? "text-yellow-600 font-medium" : "text-muted-foreground"
                        )}>
                          {student.status === 'graded' ? `ציון: ${student.score}` :
                            student.status === 'submitted' ? 'ממתין לבדיקה' : 'טרם הגיש'}
                        </div>
                      </div>
                    </div>
                    {student.status !== 'pending' && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground rotate-180" />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Content: Insights */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-muted/20 p-4 rounded-xl border">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                ניתוח כיתתי (Beta)
              </h3>
              <p className="text-sm text-muted-foreground">הפק תובנות פדגוגיות על בסיס ציוני התלמידים</p>
            </div>
            <Button onClick={handleGenerateInsights} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
              {analytics ? 'רענן תובנות' : 'צור תובנות כיתתיות'}
            </Button>
          </div>

          {!analytics ? (
            <div className="text-center py-10 border border-dashed rounded-xl">
              <BrainCircuit className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">לחץ על "צור תובנות" כדי להתחיל בניתוח.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teaching Suggestions - Full Width */}
              <Card className="md:col-span-2 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <BrainCircuit className="h-5 w-5" />
                    המלצות להוראה
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {analytics.teaching_suggestions || 'אין המלצות זמינות.'}
                  </div>
                </CardContent>
              </Card>

              {/* Struggling Topics Chart */}
              {analytics.struggling_topics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-red-600">נושאים לחיזוק</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.struggling_topics}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="topic" type="category" width={120} tick={{ fontSize: 11, fill: '#666' }} />
                        <Tooltip />
                        <Bar dataKey="percentage" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} name="אחוז כישלון" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Students Needing Attention */}
              {analytics.students_needing_help && analytics.students_needing_help.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-orange-600">תלמידים שזקוקים לתשומת לב</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analytics.students_needing_help.map((name: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 text-orange-800 text-sm">
                          <User className="h-4 w-4 opacity-50" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border p-6 space-y-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">הגדרות מבחן</h2>
              <p className="text-muted-foreground">ערוך את שאלות המבחן והמחוון</p>
            </div>

            <div className="space-y-4">
              {/* Exam Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">סוג המבחן</label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${exam.exam_type === 'integrated' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setExam({ ...exam, exam_type: 'integrated' })}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="exam_type"
                        className="mt-1"
                        checked={exam.exam_type === 'integrated'}
                        onChange={() => setExam({ ...exam, exam_type: 'integrated' })}
                      />
                      <div>
                        <span className="font-semibold block">שאלות במבחן</span>
                        <span className="text-xs text-muted-foreground block mt-1">השאלות והתשובות נמצאות באותו גיליון (מקום לכתיבה)</span>
                      </div>
                    </label>
                  </div>

                  <div
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${exam.exam_type === 'separate_sheet' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setExam({ ...exam, exam_type: 'separate_sheet' })}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="exam_type"
                        className="mt-1"
                        checked={exam.exam_type === 'separate_sheet'}
                        onChange={() => setExam({ ...exam, exam_type: 'separate_sheet' })}
                      />
                      <div>
                        <span className="font-semibold block">גיליון נפרד</span>
                        <span className="text-xs text-muted-foreground block mt-1">התלמיד כותב בדף תשובות נפרד ממחברת השאלות</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Questions Sheet Upload - Only for Separate Sheet Mode */}
                {exam.exam_type === 'separate_sheet' && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-amber-600" />
                      <div>
                        <h4 className="font-semibold text-amber-800">גיליון השאלות</h4>
                        <p className="text-xs text-amber-700">העלה תמונות של גיליון השאלות כדי שה-AI יוכל לקשר בין השאלות לתשובות התלמידים</p>
                      </div>
                    </div>

                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-amber-500/30 rounded-xl p-4 text-center hover:bg-amber-500/5 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={handleQuestionsFileChange}
                      />
                      <div className="flex flex-col items-center gap-2 text-amber-700">
                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Camera className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium">לחץ להעלאת תמונות גיליון השאלות</span>
                        <span className="text-xs text-amber-600">JPG, PNG - ניתן להעלות מספר תמונות</span>
                      </div>
                    </div>

                    {/* Preview Grid */}
                    {questionsPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {questionsFiles.map((file, i) => (
                          <div key={`${file.name}-${i}`} className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-amber-500/30 bg-muted/30">
                            <img src={questionsPreviews[i]} alt={file.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => removeQuestionsFile(i)}
                                className="p-1.5 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Scan Button */}
                    {questionsFiles.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={handleScanQuestions}
                        disabled={scanningQuestions}
                      >
                        {scanningQuestions ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> סורק שאלות...</>
                        ) : (
                          <><BrainCircuit className="h-4 w-4" /> סרוק שאלות עם AI</>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">שאלות המבחן (JSON)</label>
                <textarea
                  className="w-full h-32 bg-muted/30 border rounded-xl p-3 text-sm font-mono text-left resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                  placeholder='[{"number": 1, "text": "Question...", "points": 20}]'
                  value={questionsText}
                  onChange={e => setQuestionsText(e.target.value)}
                />
              </div>

              {/* Rubric Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium">מחוון (רובריקה)</label>
                <textarea
                  className="w-full h-24 bg-muted/30 border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="הוראות ניקוד כלליות..."
                  value={rubricText}
                  onChange={e => setRubricText(e.target.value)}
                />
              </div>

              {/* Grading Guidelines */}
              <div className="space-y-2">
                <label className="text-sm font-medium">הנחיות ל-AI</label>
                <textarea
                  className="w-full h-24 bg-muted/30 border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="כתוב כאן דגשים לבדיקה..."
                  value={guidelines}
                  onChange={e => setGuidelines(e.target.value)}
                />
              </div>

              {/* Rubric File (Visual Only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">קובץ מחוון (אופציונלי)</label>
                <div className="flex items-center gap-2">
                  <input type="file" className="text-sm" onChange={e => setRubricFile(e.target.files?.[0] || null)} />
                  {exam?.rubric_file_url && <a href={exam.rubric_file_url} target="_blank" className="text-xs text-blue-500 underline">צפה בקובץ קיים</a>}
                </div>
              </div>

              {/* Personalized Grading Toggle */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium block">בדיקה מותאמת לסגנון שלי</label>
                    <p className="text-xs text-muted-foreground">השתמש בדוגמאות הבדיקה שלי לאימון הבינה המלאכותית</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExam({ ...exam, use_teacher_style: !exam.use_teacher_style })}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${exam.use_teacher_style ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-muted'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${exam.use_teacher_style ? 'translate-x-0' : 'translate-x-4'
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setShowSettings(false)}>
                ביטול
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSaveSettings} isLoading={saving}>
                <Save className="h-4 w-4" />
                שמירה
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

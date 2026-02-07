import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent } from '../components/ui/Card';
import { StatusChip } from '../components/ui/StatusChip';
import { ArrowRight, FileText, BarChart3, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';

export const TeacherClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classData, setClassData] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Exam State
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [subject, setSubject] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchClassData = async () => {
    try {
      // Fetch Class Details
      const { data: cls, error: clsError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (clsError) throw clsError;
      setClassData(cls);

      // Fetch Exams
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select(`
            *,
            exam_submissions (count)
          `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;
      setExams(examsData || []);

    } catch (error) {
      console.error('Error fetching class data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!classId) return;
    fetchClassData();
  }, [classId]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Create exam in database
      const { data: newExam, error } = await supabase
        .from('exams')
        .insert({
          name: examName,
          class_id: classId,
          subject: subject,
          is_graded: false,
          is_sent_to_students: false
        })
        .select()
        .single();

      if (error) throw error;

      // Success
      toast.success('המבחן נוצר בהצלחה!');
      setShowCreateExamModal(false);

      // Refresh exams list
      fetchClassData();

      // Reset form
      setExamName('');
      setSubject('');

    } catch (error) {
      console.error('שגיאה ביצירת מבחן:', error);
      alert('שגיאה ביצירת המבחן. אנא נסה שוב.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClass = async () => {
    // Confirmation dialog
    const confirmed = window.confirm(
      'האם אתה בטוח שברצונך למחוק את הכיתה? פעולה זו תמחק את כל המבחנים והציונים וגם תסיר את התלמידים מהכיתה.'
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // Delete class (cascade will handle enrollments, exams, etc.)
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      // Success - redirect to home
      toast.success('הכיתה נמחקה בהצלחה');
      navigate('/teacher/home');

    } catch (error: any) {
      console.error('שגיאה במחיקת כיתה:', error);
      toast.error('שגיאה במחיקת הכיתה: ' + error.message);
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">טוען נתונים...</div>;
  if (!classData) return <div className="p-6 text-center text-red-500">כיתה לא נמצאה</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <button onClick={() => navigate('/teacher/home')} className="hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <span>חזרה לראשי</span>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{classData.name}</h1>
          <p className="text-muted-foreground">שכבה {classData.grade}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleDeleteClass} disabled={isDeleting} className="gap-2 bg-red-500 hover:bg-red-600 text-white">
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'מוחק...' : 'מחק כיתה'}
          </Button>
          <Button onClick={() => setShowCreateExamModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            צור מבחן חדש
          </Button>
        </div>
      </div>

      {/* ... existing exams list ... */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">מבחנים</h2>
        {exams.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground">
            <p>עדיין אין מבחנים בכיתה זו. לחץ על "צור מבחן חדש" להתחיל.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* ... existing map ... */}
            {exams.map((exam) => {
              // ... existing logic ...
              let status = 'pending';
              let statusLabel = 'ממתין לבדיקה';

              if (exam.is_sent_to_students) {
                status = 'completed';
                statusLabel = 'נשלח לתלמידים';
              } else if (exam.is_graded) {
                status = 'graded';
                statusLabel = 'נבדק, לא נשלח';
              }
              // ...
              const submissionCount = exam.exam_submissions?.[0]?.count || 0;

              return (
                <Card key={exam.id} className="overflow-hidden hover:bg-card/80 transition-colors cursor-pointer" onClick={() => navigate(`/teacher/exam/${exam.id}`)}>
                  <CardContent className="p-5 space-y-4">
                    {/* ... content ... */}
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {/* ... icon ... */}
                        <div className="mt-1 h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold line-clamp-2">{exam.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(exam.created_at).toLocaleDateString('he-IL')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">נושא: {exam.subject || 'כללי'}</p>
                        </div>
                      </div>
                    </div>
                    {/* ... status ... */}
                    <div className="flex items-center justify-between">
                      <StatusChip
                        status={status as any}
                        label={statusLabel}
                        className={status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-200' :
                          status === 'graded' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' : ''}
                      />
                    </div>
                    {/* ... count ... */}
                    <div className="flex items-center justify-between text-sm bg-muted/30 p-3 rounded-lg">
                      <span className="text-muted-foreground">הגשות:</span>
                      <div className="flex items-center gap-2 font-medium">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        {submissionCount}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      {showCreateExamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowCreateExamModal(false)}>
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border p-6 space-y-6" onClick={e => e.stopPropagation()}>
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold">צור מבחן חדש</h2>
              <p className="text-muted-foreground">הגדר את פרטי המבחן החדש</p>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">שם המבחן *</label>
                <input
                  type="text"
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  placeholder="לדוגמה: מבחן באלגברה"
                  required
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">כיתה</label>
                <input
                  type="text"
                  value={classData?.name || ''}
                  disabled
                  className="flex h-12 w-full rounded-xl border border-input bg-muted px-3 py-2 text-base opacity-70"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">נושא המבחן *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="לדוגמה: אלגברה, גאומטריה, אנגלית"
                  required
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateExamModal(false)}
                  className="flex-1"
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  isLoading={isCreating}
                  className="flex-1"
                >
                  צור מבחן
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

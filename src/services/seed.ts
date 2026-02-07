import { supabase } from './supabase';
import { toast } from 'sonner';

export const seedDemoData = async (userId: string, role: 'teacher' | 'student') => {
    const loadingToast = toast.loading('מייצר נתוני דמו...');

    try {
        if (role === 'teacher') {
            // 1. Create Class
            const { data: newClass, error: classError } = await supabase
                .from('classes')
                .insert({
                    name: 'היסטוריה יא׳ 5',
                    subject: 'היסטוריה',
                    grade: 'יא',
                    teacher_id: userId,
                    school_id: 'demo-school' // Optional if using school
                })
                .select()
                .single();

            if (classError) throw classError;

            // 2. Create Dummy Students Profiles (we can't easily create auth users, so we'll just insert into profiles if policies allow, 
            // OR we just create "fake" profiles that aren't linked to real auth users for display purposes)
            // *Note:* In a real app, profiles are strictly linked to auth.users. 
            // For this demo, we might struggle if RLS enforces auth.uid() match.
            // *Alternative:* We only create the Class and Exam, and the *Teacher* has to wait for real students.
            // *Better Idea:* Insert 'profiles' with fake IDs. If RLS checks (id = auth.uid()), we can't.
            // Let's assume for DEMO purposes we just create the Exam and Class fully configured.

            // 3. Create Exam
            const questions = [
                { number: 1, text: "הסבר את הגורמים לפרוץ מלחמת העולם השנייה.", points: 30 },
                { number: 2, text: "מהי 'מלחמה טוטאלית'? הדגם.", points: 30 },
                { number: 3, text: "תאר את מהלך קרב סטלינגרד וחשיבותו.", points: 40 }
            ];

            const { data: newExam, error: examError } = await supabase
                .from('exams')
                .insert({
                    class_id: newClass.id,
                    name: 'מבחן מסכם - מלחמת העולם השנייה',
                    subject: 'היסטוריה',
                    date: new Date().toISOString().split('T')[0],
                    questions: questions,
                    rubric: "יש להתייחס להיבטים צבאיים, כלכליים ומדיניים.",
                    is_graded: false,
                    is_sent_to_students: false,
                    created_by: userId
                })
                .select()
                .single();

            if (examError) throw examError;

            toast.success('כיתה ומבחן דמו נוצרו בהצלחה! (אין תלמידים מדומים עדיין)');
        }

        else if (role === 'student') {
            // 1. Find or Create a Class by a "Demo Teacher"
            // We need a class to enroll in.
            // Let's search for an existing class or create one with a fake teacher ID if possible.
            // Since we can't create a class as a student (RLS), we might be stuck unless we have a teacher.

            // *Workaround*: The Student Demo is harder without a Teacher. 
            // Let's just create a mock "Self-Practice" setup or try to insert a class if RLS allows (it shouldn't).
            // Actually, if the user is a scholar, maybe we just prompt them to ask a teacher.

            // OPTION B: We assume the user creates a Teacher account first.
            toast.info('דמו סטודנט דורש מורה קיים. אנא התחבר כמורה ליצירת תוכן.');
            return;
        }

    } catch (error: any) {
        console.error('Seed Error:', error);
        toast.error('שגיאה ביצירת נתונים: ' + error.message);
    } finally {
        toast.dismiss(loadingToast);
    }
};

export type Role = 'student' | 'teacher';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatar?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  studentCount: number;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  classId: string;
  date: string;
  status: 'draft' | 'published' | 'grading' | 'completed';
  totalStudents: number;
  gradedStudents: number;
}

export interface Question {
  id: string;
  text: string;
  maxScore: number;
  type: 'open' | 'multiple-choice';
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  status: 'submitted' | 'graded' | 'returned';
  score?: number;
  feedback?: string;
  submittedAt: string;
  answers: Answer[];
  images: string[];
}

export interface Answer {
  questionId: string;
  studentAnswer: string;
  aiFeedback: string;
  score: number;
  deduction: number;
}

// Mock Data

export const currentUser: User = {
  id: 'u1',
  name: 'ישראל ישראלי',
  role: 'student',
  email: 'student@school.edu',
};

export const classes: ClassGroup[] = [
  { id: 'c1', name: 'י״א 3', subject: 'היסטוריה', teacherId: 't1', studentCount: 28 },
  { id: 'c2', name: 'י״ב 1', subject: 'ספרות', teacherId: 't1', studentCount: 30 },
  { id: 'c3', name: 'י״א 2', subject: 'אזרחות', teacherId: 't1', studentCount: 25 },
];

export const exams: Exam[] = [
  { 
    id: 'e1', 
    title: 'מבחן מחצית א׳ - מלחמת העולם השנייה', 
    subject: 'היסטוריה', 
    classId: 'c1', 
    date: '2023-11-15', 
    status: 'completed',
    totalStudents: 28,
    gradedStudents: 28
  },
  { 
    id: 'e2', 
    title: 'בוחן - המהפכה התעשייתית', 
    subject: 'היסטוריה', 
    classId: 'c1', 
    date: '2023-12-10', 
    status: 'grading',
    totalStudents: 28,
    gradedStudents: 12
  },
  { 
    id: 'e3', 
    title: 'מבחן מסכם - שירת ימי הביניים', 
    subject: 'ספרות', 
    classId: 'c2', 
    date: '2023-12-20', 
    status: 'published',
    totalStudents: 30,
    gradedStudents: 0
  }
];

export const questions: Question[] = [
  { id: 'q1', text: 'הסבר את הגורמים העיקריים לפרוץ מלחמת העולם השנייה.', maxScore: 25, type: 'open' },
  { id: 'q2', text: 'תאר את מהלך "הקרב על בריטניה" והשפעתו על המלחמה.', maxScore: 25, type: 'open' },
  { id: 'q3', text: 'מה הייתה משמעות פלישת גרמניה לברית המועצות (מבצע ברברוסה)?', maxScore: 25, type: 'open' },
  { id: 'q4', text: 'הצג שתי תוצאות מדיניות של המלחמה.', maxScore: 25, type: 'open' },
];

export const examResults: ExamResult[] = [
  {
    id: 'r1',
    examId: 'e1',
    studentId: 'u1',
    studentName: 'ישראל ישראלי',
    status: 'returned',
    score: 88,
    feedback: 'עבודה טובה מאוד! ניכרת הבנה עמוקה של החומר. שים לב לדיוק בפרטים הקטנים.',
    submittedAt: '2023-11-15T10:30:00',
    images: [],
    answers: [
      {
        questionId: 'q1',
        studentAnswer: 'הגורמים העיקריים היו מדיניות הפיוס של בריטניה וצרפת, התוקפנות של גרמניה הנאצית ורצונה לכבוש שטחים במזרח (מרחב מחיה), וכן חולשתו של חבר הלאומים.',
        aiFeedback: 'תשובה מצוינת ומקיפה. ציינת את שלושת הגורמים המרכזיים בצורה ברורה.',
        score: 25,
        deduction: 0
      },
      {
        questionId: 'q2',
        studentAnswer: 'הקרב על בריטניה היה מערכה אווירית שבה הלופטוואפה ניסה להשיג עליונות אווירית מעל שמי בריטניה כהכנה לפלישה. הבריטים ניצחו בזכות הראדאר ומטוסי הספיטפייר.',
        aiFeedback: 'נכון מאוד. חסר מעט פירוט על שינוי הטקטיקה הגרמנית להפצצת ערים.',
        score: 22,
        deduction: 3
      },
      {
        questionId: 'q3',
        studentAnswer: 'מבצע ברברוסה היה הפלישה הגרמנית לרוסיה. זה פתח חזית שנייה לגרמניה והוביל בסופו של דבר לתבוסתה.',
        aiFeedback: 'תשובה טובה, אך קצרה מדי. היה כדאי להרחיב על ההפתעה האסטרטגית ועל החורף הרוסי.',
        score: 20,
        deduction: 5
      },
      {
        questionId: 'q4',
        studentAnswer: 'תוצאה אחת היא חלוקת גרמניה. תוצאה שנייה היא הקמת האו"ם.',
        aiFeedback: 'מדויק.',
        score: 21,
        deduction: 4
      }
    ]
  }
];

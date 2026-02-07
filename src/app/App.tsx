// React is auto-injected by the JSX transform
import { MemoryRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

import { Layout } from './components/ui/Layout';
import { Login } from './pages/Login';
import { StudentHome } from './pages/StudentHome';
import { StudentClass } from './pages/StudentClass';
import { StudentExamAnalysis } from './pages/StudentExamAnalysis';
import { StudentExamUpload } from './pages/StudentExamUpload';
import { StudentPractice } from './pages/StudentPractice';
import { StudentUpload } from './pages/StudentUpload';

import { TeacherHome } from './pages/TeacherHome';
import { TeacherClass } from './pages/TeacherClass';
import { TeacherExamMain } from './pages/TeacherExamMain';
import { TeacherGrading } from './pages/TeacherGrading';
import { TeacherUpload } from './pages/TeacherUpload';
import { TeacherAddClass } from './pages/TeacherAddClass';
import { TeacherTrainAssistant } from './pages/TeacherTrainAssistant';

// Wrapper to provide layout with correct role props
const LayoutWrapper = () => {
  const { profile } = useAuth();
  const location = useLocation();

  // Determine role based on profile or current path as fallback
  const isStudentPath = location.pathname.startsWith('/student');
  const isTeacherPath = location.pathname.startsWith('/teacher');

  const role = profile?.role || (isStudentPath ? 'student' : isTeacherPath ? 'teacher' : undefined);

  return (
    <Layout role={role} userName={profile?.full_name}>
      <Outlet />
    </Layout>
  );
};


import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Profile } from './pages/Profile';

export default function App() {
  return (
    <Router>
      <Toaster position="top-center" dir="rtl" />
      <Routes>
        <Route element={<LayoutWrapper />}>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Profile />} /> {/* Alias for now */}
          </Route>

          <Route element={<ProtectedRoute requiredRole="student" />}>
            <Route path="/student/home" element={<StudentHome />} />
            <Route path="/student/class/:classId" element={<StudentClass />} />
            <Route path="/student/exam/:examId" element={<StudentExamAnalysis />} />
            <Route path="/student/practice/:examId" element={<StudentPractice />} />
            <Route path="/student/exam/:examId/upload" element={<StudentExamUpload />} />
            <Route path="/student/upload" element={<StudentUpload />} />
          </Route>

          <Route element={<ProtectedRoute requiredRole="teacher" />}>
            <Route path="/teacher/home" element={<TeacherHome />} />
            <Route path="/teacher/class/:classId" element={<TeacherClass />} />
            <Route path="/teacher/exam/:examId" element={<TeacherExamMain />} />
            <Route path="/teacher/grading/:examId/:studentId" element={<TeacherGrading />} />
            <Route path="/teacher/upload" element={<TeacherUpload />} />
            <Route path="/teacher/add-class" element={<TeacherAddClass />} />
            <Route path="/teacher/train-assistant" element={<TeacherTrainAssistant />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

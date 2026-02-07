import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    requiredRole?: 'student' | 'teacher';
}

export const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Use profile role if available, otherwise we might be in a "profile creation pending" state
    // But AuthContext handles loading until profile *should* be there (or retries failed)

    if (requiredRole && profile) {
        if (profile.role !== requiredRole) {
            // Redirect to their allowed home based on their actual role
            if (profile.role === 'student') return <Navigate to="/student/home" replace />;
            if (profile.role === 'teacher') return <Navigate to="/teacher/home" replace />;
            return <Navigate to="/" replace />; // Fallback
        }
    } else if (requiredRole && !profile) {
        // User exists but profile failed to load? 
        // Might happen if AuthContext gave up. Show error or redirect to login.
        return <div className="p-10 text-center">שגיאה בטעינת פרופיל משתמש. אנא התנתק והתחבר שנית.</div>;
    }

    return <Outlet />;
};

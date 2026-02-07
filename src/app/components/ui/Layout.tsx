import React from 'react';
import { Header } from './Header';
import { cn } from '../../utils';
import { useLocation } from 'react-router';
import { Home, BookOpen, User as UserIcon, Upload } from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  role?: 'student' | 'teacher';
}

export const Layout: React.FC<LayoutProps> = ({ children, userName, role }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/' || location.pathname === '/login';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground" dir="rtl">
      {!isLoginPage && <Header userName={userName} />}
      
      <main className={cn("flex-1 px-4 py-6 md:px-6 max-w-6xl mx-auto w-full", isLoginPage ? "p-0" : "")}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          key={location.pathname}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Nav - Only show if logged in */}
      {!isLoginPage && role && (
        <div className="sticky bottom-0 z-50 w-full border-t border-border bg-background/80 backdrop-blur-lg">
          <BottomNav role={role} />
        </div>
      )}
    </div>
  );
};

import { useNavigate } from 'react-router';

const BottomNav = ({ role }: { role: 'student' | 'teacher' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="flex h-16 max-w-6xl mx-auto items-center justify-around px-2">
      <NavItem 
        icon={Home} 
        label="ראשי" 
        active={location.pathname.endsWith('home')} 
        onClick={() => navigate(`/${role}/home`)}
      />
      <NavItem 
        icon={BookOpen} 
        label={role === 'teacher' ? 'כיתות' : 'קורסים'} 
        active={location.pathname.includes('class')} 
        onClick={() => navigate(`/${role}/home`)} // Usually classes are on home, but let's point to home for now as "Classes" is main view
      />
      <NavItem 
        icon={Upload} 
        label="העלאה" 
        active={location.pathname.includes('upload')} 
        onClick={() => navigate(`/${role}/upload`)}
      />
      <NavItem 
        icon={UserIcon} 
        label="פרופיל" 
        active={location.pathname.includes('profile')} 
        onClick={() => {}} // No profile page yet
      />
    </nav>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={cn("flex flex-col items-center gap-1 p-2 rounded-lg transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
  >
    <Icon className="h-5 w-5" />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

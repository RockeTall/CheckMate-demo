import React from 'react';
import { User, Bell, LogOut } from 'lucide-react';
import { Button } from './button';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface HeaderProps {
  title?: string;
  userName?: string; // Kept for backward compatibility
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, userName: propUserName }) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const displayName = propUserName || profile?.full_name || user?.email;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/src/assets/logo.svg" alt="CheckMate" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold tracking-tight">CheckMate</span>
        </div>

        {title && (
          <div className="absolute left-1/2 -translate-x-1/2 font-medium">
            <span className="hidden sm:inline-block">{title}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {displayName ? (
            <>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Bell className="h-5 w-5" />
              </Button>

              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full overflow-hidden border border-border">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-right">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground text-right">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="justify-end cursor-pointer">
                    <span>פרופיל אישי</span>
                    <User className="ml-2 h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive justify-end cursor-pointer">
                    <span>התנתק</span>
                    <LogOut className="ml-2 h-4 w-4" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              התחברות
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

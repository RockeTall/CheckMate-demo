import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    full_name: string;
    role: 'student' | 'teacher';
    grade?: number;
    avatar_url?: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfileWithRetry(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // If we already have a profile and it matches the ID, don't re-fetch unnecessarily unless switching users
                if (!profile || profile.id !== session.user.id) {
                    fetchProfileWithRetry(session.user.id);
                }
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfileWithRetry = async (userId: string, retries = 3) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                setProfile(data);
                setLoading(false);
            } else if (retries > 0) {
                // Profile might be creating via trigger... wait and retry
                console.log(`Profile not found, retrying... (${retries})`);
                setTimeout(() => fetchProfileWithRetry(userId, retries - 1), 1000);
                return;
            } else {
                console.error('Error fetching profile (exhausted retries):', error);
                setLoading(false); // Give up
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
            {!loading ? children : <div className="flex h-screen w-screen items-center justify-center flex-col gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500">טוען נתונים...</p>
            </div>}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

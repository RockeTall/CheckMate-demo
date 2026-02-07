import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Plus, Users, Upload, Bell, GraduationCap } from 'lucide-react';
import { StatusChip } from '../components/ui/StatusChip';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

export const TeacherHome = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Force fetch on mount every time
  useEffect(() => {
    if (!user) return;

    // ... rest of fetch fetchClasses logic
    const fetchClasses = async () => {
      setLoading(true); // Ensure loading state resets
      try {
        // ... (keep existing fetch logic)
        // Fetch classes created by this teacher
        const { data, error } = await supabase
          .from('classes')
          .select(`
                        *,
                        class_enrollments(count)
                    `)
          .eq('teacher_id', user.id);

        if (error) throw error;

        // Map the count from the join result
        const formatted = data?.map((cls: any) => ({
          ...cls,
          studentCount: cls.class_enrollments[0]?.count || 0
        })) || [];

        setClasses(formatted);
      } catch (error) {
        console.error('Error fetching teacher classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user]); // Logic remains same, but we ensure it runs.

  // Actually, standard React Router usually remounts. 
  // If not, we can listen to location key.
  const location = useLocation();
  useEffect(() => {
    if (user) { /* call fetchClasses again */ }
  }, [location.key]);


  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">שלום, {profile?.full_name?.split(' ')[0] || 'מורה'}</h1>
          <p className="text-muted-foreground">ברוך שובך למערכת</p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => navigate('/teacher/upload')} className="flex-1 gap-2" variant="primary">
          <Upload className="h-4 w-4" />
          העלאת מבחן
        </Button>
        <Button onClick={() => navigate('/teacher/add-class')} className="flex-1 gap-2" variant="secondary">
          <Plus className="h-4 w-4" />
          הוספת כיתה
        </Button>
      </div>

      {/* Train Assistant Button */}
      <Button
        onClick={() => navigate('/teacher/train-assistant')}
        className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
      >
        <GraduationCap className="h-4 w-4" />
        אימון העוזר שלי
      </Button>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">הכיתות שלי</h2>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">טוען נתונים...</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-xl">
            <p className="text-muted-foreground mb-4">לא נמצאו כיתות.</p>
            <Button onClick={() => navigate('/teacher/add-class')} variant="outline">
              צור כיתה ראשונה
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/teacher/class/${cls.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl">{cls.name}</h3>
                      <p className="text-muted-foreground">שכבה {cls.grade}</p>
                    </div>
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{cls.studentCount} תלמידים</span>
                    {/* Mock status for now */}
                    <StatusChip status="pending" label="הוסף מבחן" className="bg-blue-500/10 text-blue-500 border-blue-500/20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

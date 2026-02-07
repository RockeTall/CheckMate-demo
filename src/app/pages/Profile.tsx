import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { User, Bell, LogOut, Database } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { toast } from 'sonner';
import { seedDemoData } from '../../services/seed';

export const Profile = () => {
    const { profile, signOut } = useAuth();
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile?.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setLoading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile?.id);

            if (updateError) throw updateError;

            toast.success('תמונת פרופיל עודכנה בהצלחה');
            window.location.reload(); // Simple reload to refresh context
        } catch (error: any) {
            toast.error('שגיאה בהעלאת תמונה');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSeedData = async () => {
        if (!profile) return;
        setSeeding(true);
        await seedDemoData(profile.id, profile.role);
        setSeeding(false);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">פרופיל אישי</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>פרטים אישיים</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-muted">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                                        <User className="h-12 w-12" />
                                    </div>
                                )}

                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white font-medium text-xs">
                                    {loading ? '...' : 'שנה תמונה'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={loading} />
                                </label>
                            </div>

                            <div className="text-center">
                                <h2 className="text-xl font-bold">{profile?.full_name}</h2>
                                <p className="text-muted-foreground capitalize">
                                    {profile?.role === 'student' ? 'תלמיד' : 'מורה'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Input label="שם מלא" value={profile?.full_name || ''} readOnly className="bg-muted/50" />
                            {profile?.role === 'student' && (
                                <Input label="כיתה" value={`כיתה ${profile.grade}`} readOnly className="bg-muted/50" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications / Actions */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>התראות ופעולות</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-200">
                                <Bell className="h-5 w-5" />
                                <div className="text-sm">
                                    <span className="font-bold block">התראות מערכת</span>
                                    אין התראות חדשות
                                </div>
                            </div>

                            <Button variant="destructive" className="w-full" onClick={async () => {
                                await signOut();
                                window.location.href = '/login';
                            }}>
                                <LogOut className="h-4 w-4 ml-2" />
                                התנתק מהמערכת
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Developer Tools */}
                    <Card className="border-dashed border-primary/30 bg-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                איזור מפתחים (Demo Data)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground mb-4">
                                לחץ כאן כדי לייצר נתוני דמו (כיתה, מבחן, שאלות) עבור המשתמש הנוכחי.
                                פעולה זו מומלצת למורים חדשים כדי לראות את המערכת בפעולה.
                            </p>
                            <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10" onClick={handleSeedData} isLoading={seeding}>
                                צור נתוני דמו
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

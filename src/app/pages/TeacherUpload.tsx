import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { FileImage, X, ArrowRight, UploadCloud } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// Keep using mock classes for now or fetch? Let's fetch to be consistent with "Real DB" goal.
// But first, let's just make it compile.
import { classes as mockClasses } from '../data'; // Fallback


export const TeacherUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [classes, setClasses] = useState<any[]>(mockClasses);

  useEffect(() => {
    if (!user) return;
    const fetchClasses = async () => {
      const { data } = await supabase.from('classes').select('*').eq('teacher_id', user.id);
      if (data) setClasses(data);
    };
    fetchClasses();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);

      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = () => {
    setLoading(true);
    // Mock upload for now as requested to just fix crash
    setTimeout(() => {
      setLoading(false);
      toast.success('המבחן הועלה בהצלחה (דמו)');
      navigate('/teacher/home');
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 text-muted-foreground">
        <button onClick={() => navigate(-1)} className="hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <span>חזרה</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold">העלאת מבחן חדש</h1>
          <p className="text-muted-foreground">העלה את סריקות המבחנים של התלמידים</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <Input label="שם המבחן" placeholder="לדוגמה: מבחן אמצע סמסטר" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">מקצוע</label>
                <select className="flex h-12 w-full rounded-xl border border-input bg-input-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all">
                  <option>היסטוריה</option>
                  <option>ספרות</option>
                  <option>תנ״ך</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">כיתה</label>
                <select className="flex h-12 w-full rounded-xl border border-input bg-input-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all">
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">קבצי תשובות (PDF / תמונות)</label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center gap-2 relative group">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={handleFileChange}
                />
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <span className="font-medium text-sm text-muted-foreground group-hover:text-primary transition-colors">גרור לכאן קבצים או לחץ לבחירה</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <AnimatePresence mode='popLayout'>
                {files.map((file, i) => (
                  <motion.div
                    key={`${file.name}-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted/30"
                  >
                    {/* Simple preview logic: if image show it, else generic icon */}
                    {file.type.startsWith('image/') ? (
                      <img src={previews[i]} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center flex-col gap-2 p-2">
                        <FileImage className="h-10 w-10 text-muted-foreground" />
                        <span className="text-xs text-center break-words w-full">{file.name}</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => removeFile(i)}
                        className="p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {file.type.startsWith('image/') && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                        {file.name}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              המבחנים יישמרו תחת הכיתה שנבחרה. המערכת תבצע זיהוי כתב יד (OCR) ותציע ציונים ראשוניים.
            </p>

            <Button className="w-full" size="lg" onClick={handleUpload} isLoading={loading} disabled={files.length === 0}>
              שמירה ובדיקה
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

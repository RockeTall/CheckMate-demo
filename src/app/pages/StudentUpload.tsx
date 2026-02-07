import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { classes } from '../data';
import { ArrowRight, UploadCloud, X, FileImage } from 'lucide-react';
import { toast } from 'sonner';

import { motion, AnimatePresence } from 'motion/react';

export const StudentUpload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);

      // Generate previews
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      // Revoke the old URL to avoid memory leaks
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = () => {
    setIsUploading(true);
    // Mock upload
    setTimeout(() => {
      setIsUploading(false);
      toast.success('המבחן הוגש בהצלחה!', {
        description: 'המורה וה-AI יבדקו את המבחן בקרוב.'
      });
      navigate('/student/home');
    }, 2000);
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
          <h1 className="text-2xl font-bold">העלאת מבחן לבדיקה</h1>
          <p className="text-muted-foreground">צלם את דפי המבחן והעלה אותם כאן</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <Input label="שם המבחן" placeholder="לדוגמה: מבחן בהיסטוריה" />

            <div className="space-y-2">
              <label className="text-sm font-medium">כיתה ומקצוע</label>
              <select className="flex h-12 w-full rounded-xl border border-input bg-input-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200">
                <option value="">בחר כיתה...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.subject}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">צילום המבחן</label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium">לחץ להעלאת קבצים</span>
                  <span className="text-xs">JPG, PNG עד 10MB</span>
                </div>
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
                    <img src={previews[i]} alt={file.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => removeFile(i)}
                        className="p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                      {file.name}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <Button
              className="w-full h-12 text-base mt-4"
              size="lg"
              onClick={handleSubmit}
              isLoading={isUploading}
              disabled={files.length === 0}
            >
              שליחה לבדיקה
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              המבחן יישמר בכיתה הנבחרת וייבדק על ידי המורה ומערכת ה-AI
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

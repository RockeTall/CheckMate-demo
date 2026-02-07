import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '../../services/supabase';
import { Loader2, Camera, X, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export const StudentExamUpload = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState<any>(null);
    const [uploadedImages, setUploadedImages] = useState<any[]>([]);
    const [submissionName, setSubmissionName] = useState('');
    const [notes, setNotes] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExamDetails();
    }, [examId]);

    const fetchExamDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*, classes(name)')
                .eq('id', examId)
                .single();

            if (error) throw error;

            setExam(data);
            setSubmissionName(data.name || 'הגשת מבחן');
        } catch (error) {
            console.error('שגיאה בטעינת פרטי מבחן:', error);
            toast.error('שגיאה בטעינת המבחן');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setUploadedImages(prev => [...prev, {
                    file,
                    preview: event.target?.result,
                    name: file.name
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (uploadedImages.length === 0) {
            toast.error('אנא העלה לפחות תמונה אחת של המבחן');
            return;
        }

        setIsUploading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const imageUrls: string[] = [];

            // Upload images sequentially
            for (let i = 0; i < uploadedImages.length; i++) {
                const file = uploadedImages[i].file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${examId}/${user.id}/${Date.now()}-${i}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('exam-submissions')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('exam-submissions')
                    .getPublicUrl(fileName);

                imageUrls.push(data.publicUrl);
            }

            // Create exam submission record
            const { error: submissionError } = await supabase
                .from('exam_submissions')
                .insert({
                    exam_id: examId,
                    student_id: user.id,
                    submission_name: submissionName,
                    notes: notes,
                    images_urls: imageUrls,
                    submitted_at: new Date().toISOString()
                })
                .single();

            if (submissionError) throw submissionError;

            toast.success('המבחן הוגש בהצלחה!');
            navigate(`/student/class/${exam.class_id}`);

        } catch (error: any) {
            console.error('שגיאה בהגשת מבחן:', error);
            toast.error('שגיאה בהגשת המבחן: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8 pb-20 fade-in" dir="rtl">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">הגשת מבחן</h1>
                {exam && (
                    <div className="text-muted-foreground">
                        <p className="text-lg font-medium">{exam.name}</p>
                        <p>כיתה: {exam.classes?.name}</p>
                    </div>
                )}
            </div>

            <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Submission Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">שם ההגשה</label>
                        <input
                            type="text"
                            value={submissionName}
                            onChange={e => setSubmissionName(e.target.value)}
                            placeholder="לדוגמה: הגשת מבחן באלגברה"
                            className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>

                    {/* Image Upload Area */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium">תמונות המבחן *</label>

                        {/* Two buttons: Upload & Scan */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Upload from gallery */}
                            <div className="border-2 border-dashed border-input hover:border-primary/50 hover:bg-muted/30 transition-all rounded-xl p-6 text-center cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                    <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                        <Upload className="h-6 w-6" />
                                    </div>
                                    <p className="font-semibold">העלאת תמונות</p>
                                    <p className="text-xs opacity-70">בחר מהגלריה</p>
                                </div>
                            </div>

                            {/* Scan with camera */}
                            <div className="border-2 border-dashed border-input hover:border-primary/50 hover:bg-muted/30 transition-all rounded-xl p-6 text-center cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                    <div className="h-12 w-12 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white">
                                        <Camera className="h-6 w-6" />
                                    </div>
                                    <p className="font-semibold">סריקת מבחן</p>
                                    <p className="text-xs opacity-70">צלם עם המצלמה</p>
                                </div>
                            </div>
                        </div>

                        {/* Preview Grid */}
                        {uploadedImages.length > 0 && (
                            <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-sm font-medium text-muted-foreground">תמונות שהועלו ({uploadedImages.length}):</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {uploadedImages.map((img, idx) => (
                                        <div key={idx} className="relative aspect-[3/4] border rounded-lg overflow-hidden group shadow-sm">
                                            <img src={img.preview} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transform scale-90 hover:scale-100 transition-all"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                                                עמוד {idx + 1}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">הערות למורה (אופציונלי)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="הוסף הערות אם יש..."
                            rows={3}
                            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="flex-1"
                            disabled={isUploading}
                        >
                            ביטול
                        </Button>
                        <Button
                            type="submit"
                            disabled={isUploading || uploadedImages.length === 0}
                            isLoading={isUploading}
                            className="flex-1 gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            {isUploading ? 'מעלה...' : 'הגש מבחן'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

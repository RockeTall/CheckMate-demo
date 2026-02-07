import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowRight, GraduationCap, Upload, Sparkles, Loader2, Save, Trash2, CheckCircle2, Camera } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { GeminiScanner } from '../../services/GeminiScanner';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export const TeacherTrainAssistant = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [subject, setSubject] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [extractedSamples, setExtractedSamples] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleProcess = async () => {
        if (!subject.trim()) {
            toast.error('נא להזין נושא');
            return;
        }
        if (files.length === 0) {
            toast.error('נא להעלות תמונות');
            return;
        }

        setUploading(true);
        const toastId = toast.loading('מעלה תמונות...');

        try {
            // 1. Upload images to Supabase Storage
            const uploadedUrls: string[] = [];
            for (const file of files) {
                const fileName = `training/${user?.id}/${Date.now()}_${file.name}`;
                const { data, error } = await supabase.storage
                    .from('exam-images')
                    .upload(fileName, file);

                if (error) throw error;

                const { data: publicUrl } = supabase.storage
                    .from('exam-images')
                    .getPublicUrl(data.path);

                uploadedUrls.push(publicUrl.publicUrl);
            }

            setUploading(false);
            setProcessing(true);
            toast.loading('הבינה המלאכותית מנתחת את הבדיקות...', { id: toastId });

            // 2. Process with AI
            const samples = await GeminiScanner.extractGradedExam(uploadedUrls, subject);
            setExtractedSamples(samples);

            toast.success(`נמצאו ${samples.length} דוגמאות בדיקה!`, { id: toastId });

        } catch (error: any) {
            console.error(error);
            toast.error('שגיאה בעיבוד: ' + error.message, { id: toastId });
        } finally {
            setUploading(false);
            setProcessing(false);
        }
    };

    const handleSave = async () => {
        if (extractedSamples.length === 0) return;

        setSaving(true);
        const toastId = toast.loading('שומר דוגמאות לאימון...');

        try {
            const payload = extractedSamples.map((sample) => ({
                teacher_id: user?.id,
                subject,
                question_text: sample.question_text,
                student_answer: sample.student_answer,
                teacher_grade: sample.teacher_grade,
                teacher_remarks: sample.teacher_remarks,
                points_given: sample.points_given,
                points_deducted: sample.points_deducted,
                points_possible: sample.points_possible
            }));

            const { error } = await supabase
                .from('teacher_training_samples')
                .insert(payload);

            if (error) throw error;

            toast.success('הדוגמאות נשמרו בהצלחה! העוזר שלך למד משהו חדש.', { id: toastId });

            // Reset
            setExtractedSamples([]);
            setFiles([]);
            setSubject('');

        } catch (error: any) {
            toast.error('שגיאה בשמירה: ' + error.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const removeSample = (index: number) => {
        setExtractedSamples(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center gap-2 text-muted-foreground">
                <button onClick={() => navigate('/teacher/home')} className="hover:text-foreground">
                    <ArrowRight className="h-5 w-5" />
                </button>
                <span>חזרה לדשבורד</span>
            </div>

            <div className="space-y-2">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    אימון העוזר שלי
                </h1>
                <p className="text-muted-foreground">
                    העלה מבחנים שכבר בדקת ידנית כדי שהבינה המלאכותית תלמד את סגנון הבדיקה שלך.
                </p>
            </div>

            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">העלאת מבחנים בדוקים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">נושא המבחן</label>
                        <Input
                            placeholder="לדוגמה: היסטוריה, מתמטיקה, ביולוגיה..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">תמונות המבחן הבדוק</label>

                        {/* Two buttons: Upload & Scan */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Upload from gallery */}
                            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer relative group">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                <p className="text-sm font-medium text-muted-foreground group-hover:text-primary">העלאת תמונות</p>
                                <p className="text-xs text-muted-foreground mt-1">בחר מהגלריה או PDF</p>
                            </div>

                            {/* Scan with camera */}
                            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="h-8 w-8 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white mb-2">
                                    <Camera className="h-4 w-4" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground group-hover:text-primary">סריקת מבחן</p>
                                <p className="text-xs text-muted-foreground mt-1">צלם עם המצלמה</p>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <p className="text-primary font-medium mt-3 text-center">{files.length} קבצים נבחרו</p>
                        )}
                    </div>

                    <Button
                        className="w-full h-12 text-lg"
                        onClick={handleProcess}
                        disabled={uploading || processing}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="animate-spin ml-2 h-5 w-5" />
                                מעלה...
                            </>
                        ) : processing ? (
                            <>
                                <Sparkles className="animate-pulse ml-2 h-5 w-5" />
                                מנתח בדיקות...
                            </>
                        ) : (
                            <>
                                <Sparkles className="ml-2 h-5 w-5" />
                                ניתוח והפקת דוגמאות
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Extracted Samples Preview */}
            {extractedSamples.length > 0 && (
                <Card className="border-primary/30">
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            דוגמאות שזוהו ({extractedSamples.length})
                        </CardTitle>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="animate-spin ml-2 h-4 w-4" /> : <Save className="ml-2 h-4 w-4" />}
                            שמירה לאימון
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {extractedSamples.map((sample, idx) => (
                            <div key={idx} className="border rounded-lg p-4 space-y-2 bg-muted/20 relative group">
                                <button
                                    onClick={() => removeSample(idx)}
                                    className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-500/10 p-1 rounded"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-semibold text-muted-foreground">שאלה {sample.question_number}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-primary">{sample.teacher_grade}</span>
                                        {sample.points_given !== undefined && (
                                            <span className="text-sm text-muted-foreground">({sample.points_given}/{sample.points_possible})</span>
                                        )}
                                    </div>
                                </div>

                                <p className="font-medium">{sample.question_text}</p>

                                <div className="bg-background p-2 rounded text-sm">
                                    <span className="text-xs text-muted-foreground block mb-1">תשובת התלמיד:</span>
                                    {sample.student_answer}
                                </div>

                                {sample.teacher_remarks && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded text-sm">
                                        <span className="text-xs text-amber-600 block mb-1">הערות המורה:</span>
                                        {sample.teacher_remarks}
                                    </div>
                                )}

                                {sample.points_deducted > 0 && (
                                    <div className="text-xs text-red-500">נוכו {sample.points_deducted} נקודות</div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

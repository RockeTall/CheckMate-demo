import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowRight, Check, Sparkles, Lightbulb, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { supabase } from '../../services/supabase';
import { GeminiScanner } from '../../services/GeminiScanner';
import { toast } from 'sonner';

export const StudentPractice = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
      try {
        const { data, error } = await supabase
          .from('exams')
          .select('id, name, subject')
          .eq('id', examId)
          .single();

        if (error) throw error;
        setExam(data);
        generateQuestions(data); // Auto-generate on load
      } catch (error) {
        console.error('Error fetching exam:', error);
        toast.error('שגיאה בטעינת פרטי המבחן');
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  const generateQuestions = async (examData: any) => {
    setGenerating(true);
    try {
      // toast.loading('המורה הפרטי שלך מכין שאלות...', { id: 'gen-practice' });
      const generated = await GeminiScanner.generatePracticeQuestions(examData.subject, examData.name);
      setQuestions(generated);
      // toast.success('השאלות מוכנות! בהצלחה', { id: 'gen-practice' });
      setCurrentStep(0);
      setAnswer('');
      setShowFeedback(false);
      setSelectedOption(null);
    } catch (error) {
      console.error(error);
      toast.error('שגיאה ביצירת שאלות תרגול');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const currentQ = questions[currentStep];

  const handleSubmit = () => {
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setShowFeedback(false);
      setAnswer('');
      setSelectedOption(null);
      setCurrentStep(prev => prev + 1);
    } else {
      // Finished
      toast.success('כל הכבוד! סיימת את התרגול.');
      navigate(-1);
    }
  };

  if (loading || generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-background p-4 rounded-full border shadow-lg">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold">המורה הפרטי מכין לך שאלות...</h2>
          <p className="text-muted-foreground">{exam?.subject ? `בנושא: ${exam.subject}` : 'אנא המתן'}</p>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentQ) return <div className="text-center p-10">שגיאה בטעינת שאלות. נסה לרענן.</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <button onClick={() => navigate(-1)} className="hover:text-foreground">
            <ArrowRight className="h-5 w-5" />
          </button>
          <span>חזרה</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => generateQuestions(exam)} disabled={generating}>
          <RefreshCw className="h-4 w-4 ml-2" />
          תרגול חדש
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">תרגול: {exam?.subject}</h1>
        <p className="text-muted-foreground">מתרגל למבחן: {exam?.name}</p>
      </div>

      <div className="w-full bg-muted/50 h-2 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                    {currentQ.type === 'multiple' ? 'שאלה אמריקאית' : 'שאלה פתוחה'}
                  </span>
                  <span className="text-xs text-muted-foreground">שאלה {currentStep + 1} מתוך {questions.length}</span>
                </div>
                {/* <BookOpen className="h-4 w-4 text-muted-foreground opacity-50" /> */}
              </div>

              <h3 className="text-lg font-medium leading-relaxed">
                {currentQ.question}
              </h3>

              {currentQ.type === 'multiple' ? (
                <div className="space-y-3">
                  {currentQ.options?.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => !showFeedback && setSelectedOption(idx)}
                      disabled={showFeedback}
                      className={cn(
                        "w-full p-4 rounded-xl border text-right transition-all duration-200 flex items-center justify-between",
                        selectedOption === idx
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50",
                        showFeedback && idx === currentQ.correct && "bg-green-500/10 border-green-500 text-green-700 dark:text-green-300",
                        showFeedback && selectedOption === idx && idx !== currentQ.correct && "bg-red-500/10 border-red-500"
                      )}
                    >
                      <span>{opt}</span>
                      {showFeedback && idx === currentQ.correct && <Check className="h-5 w-5 text-green-500" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="כתוב את תשובתך כאן..."
                    className="w-full h-32 p-4 rounded-xl bg-muted/30 border border-input focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                    disabled={showFeedback}
                  />
                  {!showFeedback && currentQ.hint && (
                    <div className="flex items-center gap-2 text-sm text-primary cursor-help">
                      <Lightbulb className="h-4 w-4" />
                      <span>רמז: {currentQ.hint}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Section */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <Sparkles className="h-5 w-5" />
                      <span>משוב בינה מלאכותית</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {currentQ.type === 'multiple'
                        ? currentQ.explanation
                        : (
                          <span>
                            תשובה יפה! כדאי להשוות לתשובה לדוגמה:<br />
                            <span className="italic opacity-80 mt-1 block border-r-2 border-primary/30 pr-2">
                              {currentQ.modelAnswer}
                            </span>
                          </span>
                        )
                      }
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                {!showFeedback ? (
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={currentQ.type === 'multiple' ? selectedOption === null : !answer}
                  >
                    בדיקה
                  </Button>
                ) : (
                  <Button className="w-full" onClick={handleNext} variant="secondary">
                    {currentStep < questions.length - 1 ? 'השאלה הבאה' : 'סיום תרגול'}
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                  </Button>
                )}
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

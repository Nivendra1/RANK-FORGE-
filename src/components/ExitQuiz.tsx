import React, { useState, useEffect } from 'react';
import { WordEntry } from '../types';
import { generateExitQuiz, gradeFeynmanExplanation } from '../services/ai';
import { X, Loader2, Target, Grid, Brain } from 'lucide-react';

interface ExitQuizProps {
  words: WordEntry[];
  onClose: () => void;
  addXp: (amount: number) => void;
}

export default function ExitQuiz({ words, onClose, addXp }: ExitQuizProps) {
  const [step, setStep] = useState<'select' | 'loading' | 'quiz' | 'result'>('select');
  const [quizType, setQuizType] = useState<'mcq' | 'crossword' | 'feynman' | null>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<any>(null);

  const startQuiz = async (type: 'mcq' | 'crossword' | 'feynman') => {
    setQuizType(type);
    setStep('loading');
    try {
      // Select 5 random words for the quiz to keep prompt size reasonable
      const shuffled = [...words].sort(() => 0.5 - Math.random());
      const selectedWords = shuffled.slice(0, 5);
      
      const data = await generateExitQuiz(selectedWords, type);
      setQuizData(data);
      setStep('quiz');
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      alert("Failed to generate quiz. Exiting session.");
      onClose();
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !quizData) return;

    if (quizType === 'mcq') {
      const isCorrect = answer === quizData.correctAnswer;
      setResult({ isCorrect, correct: quizData.correctAnswer });
      if (isCorrect) addXp(30);
      setStep('result');
    } else if (quizType === 'crossword') {
      const isCorrect = answer.toLowerCase() === quizData.answer.toLowerCase();
      setResult({ isCorrect, correct: quizData.answer });
      if (isCorrect) addXp(40);
      setStep('result');
    } else if (quizType === 'feynman') {
      setStep('loading');
      try {
        const wordEntry = words.find(w => w.word === quizData.word);
        if (!wordEntry) throw new Error("Word not found");
        
        const grade = await gradeFeynmanExplanation(quizData.word, wordEntry.definition, answer);
        setResult({ isCorrect: grade.score >= 70, score: grade.score, feedback: grade.feedback });
        if (grade.score >= 70) addXp(50);
        setStep('result');
      } catch (error) {
        console.error("Failed to grade:", error);
        setStep('quiz');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="rpg-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/30 border border-amber-500/50">
        
        <div className="bg-zinc-900 p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-cinzel text-2xl text-amber-500 uppercase tracking-widest">Session Exit Challenge</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {step === 'select' && (
            <div className="space-y-6 flex flex-col items-center">
              <p className="text-center text-zinc-300 text-xl mb-8 font-serif italic">
                Leaving so soon?
              </p>
              
              <div className="flex flex-col gap-4 w-full max-w-md">
                <button 
                  onClick={() => startQuiz('crossword')}
                  className="rpg-button p-4 rounded-xl text-center flex items-center justify-center gap-3 text-lg"
                >
                  <Grid size={24} />
                  <span>Wait Hunter, Crossword Challenge</span>
                </button>
                
                <button 
                  onClick={onClose}
                  className="p-4 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all text-center text-lg"
                >
                  <span>It's ok, exit now</span>
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-amber-500 mb-6" size={48} />
              <p className="font-cinzel text-amber-500 text-xl tracking-widest uppercase">Preparing Trial...</p>
            </div>
          )}

          {step === 'quiz' && quizData && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="font-cinzel text-xl text-amber-500 uppercase tracking-widest mb-2">
                  {quizType === 'mcq' ? 'Multiple Choice' : quizType === 'crossword' ? 'Crossword Clue' : 'Feynman Challenge'}
                </h3>
              </div>

              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 mb-8">
                <p className="text-lg text-zinc-200 text-center font-serif">
                  {quizType === 'mcq' ? quizData.question : quizType === 'crossword' ? quizData.clue : `Explain the word: "${quizData.word}"`}
                </p>
              </div>

              {quizType === 'mcq' ? (
                <div className="space-y-3 mb-8">
                  {quizData.options.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setAnswer(opt)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        answer === opt 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-100' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/50'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : quizType === 'crossword' ? (
                <div className="mb-8">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-4 text-center text-xl tracking-widest uppercase text-amber-500 focus:border-amber-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="mb-8">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Explain it simply..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-4 text-zinc-200 focus:border-amber-500 focus:outline-none h-32 resize-none font-serif"
                    autoFocus
                  />
                </div>
              )}

              <button
                onClick={submitAnswer}
                disabled={!answer.trim()}
                className="w-full rpg-button py-4 rounded text-lg"
              >
                Submit Answer
              </button>
            </div>
          )}

          {step === 'result' && result && (
            <div className="max-w-xl mx-auto text-center">
              <div className={`p-8 rounded-xl border mb-8 ${
                result.isCorrect ? 'bg-green-950/30 border-green-900' : 'bg-red-950/30 border-red-900'
              }`}>
                <h4 className={`font-cinzel text-3xl mb-4 uppercase tracking-widest ${result.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                  {result.isCorrect ? 'Trial Passed' : 'Trial Failed'}
                </h4>
                
                {quizType === 'feynman' ? (
                  <div className="space-y-4">
                    <div className="text-2xl font-bold text-amber-500">{result.score}/100</div>
                    <p className="text-zinc-300 font-serif">{result.feedback}</p>
                  </div>
                ) : (
                  <p className="text-zinc-300 text-lg font-serif">
                    {result.isCorrect 
                      ? 'Your knowledge is absolute.' 
                      : `The correct answer was: ${result.correct}`}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full rpg-button py-4 rounded text-lg"
              >
                End Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

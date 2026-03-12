import React, { useState, useEffect } from 'react';
import { WordEntry } from '../types';
import { generateQuest } from '../services/ai';
import { Loader2, Sword, Shield, Heart, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface QuestProps {
  words: WordEntry[];
  onComplete: () => void;
  addXp: (amount: number) => void;
}

export default function Quest({ words, onComplete, addXp }: QuestProps) {
  const [loading, setLoading] = useState(true);
  const [scenes, setScenes] = useState<any[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    const startQuest = async () => {
      setLoading(true);
      try {
        // Select 10 random words for the quest to keep prompt size reasonable
        const shuffled = [...words].sort(() => 0.5 - Math.random());
        const selectedWords = shuffled.slice(0, 10);
        
        const generatedScenes = await generateQuest(selectedWords);
        if (generatedScenes && generatedScenes.length > 0) {
          setScenes(generatedScenes);
          setCurrentSceneId(generatedScenes[0].id);
        } else {
          alert("Failed to generate quest. Please try again.");
          onComplete();
        }
      } catch (error) {
        console.error("Error generating quest:", error);
        alert("Failed to generate quest. Please try again.");
        onComplete();
      } finally {
        setLoading(false);
      }
    };

    startQuest();
  }, [words, onComplete]);

  const currentScene = scenes.find(s => s.id === currentSceneId);

  const handleChoice = (choice: any) => {
    if (choice.isQuiz) {
      setActiveQuiz(choice);
      setQuizAnswer(null);
      setQuizResult(null);
    } else {
      progressToNextScene(choice.nextSceneId);
    }
  };

  const progressToNextScene = (nextId: string) => {
    if (!nextId || nextId === "end" || !scenes.find(s => s.id === nextId)) {
      onComplete(); // Quest finished
    } else {
      setCurrentSceneId(nextId);
    }
  };

  const submitQuiz = () => {
    if (!quizAnswer || !activeQuiz) return;
    
    if (quizAnswer === activeQuiz.quizCorrectAnswer) {
      setQuizResult('correct');
      addXp(20); // Bonus XP for correct quiz
    } else {
      setQuizResult('incorrect');
    }
  };

  const continueAfterQuiz = () => {
    progressToNextScene(activeQuiz.nextSceneId);
    setActiveQuiz(null);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-950 text-amber-500">
        <Loader2 className="animate-spin mb-6" size={48} />
        <h2 className="font-cinzel text-2xl tracking-widest uppercase mb-2">Forging Your Destiny</h2>
        <p className="text-zinc-400 font-serif italic">Weaving your vocabulary into the fabric of reality...</p>
      </div>
    );
  }

  if (!currentScene) return null;

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Background styling */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #d4af37 0%, transparent 60%)' }} />
      
      <div className="flex-1 overflow-auto p-4 md:p-8 z-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl">
          
          {/* Status Bar */}
          <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-4 text-amber-500">
              <Sword size={24} />
              <h2 className="font-cinzel text-xl tracking-widest uppercase">Active Quest</h2>
            </div>
            <div className="flex gap-4 text-zinc-500">
              <Heart size={20} className="text-red-900" fill="currentColor" />
              <Shield size={20} className="text-blue-900" fill="currentColor" />
              <Zap size={20} className="text-amber-900" fill="currentColor" />
            </div>
          </div>

          {/* Scene Content */}
          {!activeQuiz ? (
            <div className="rpg-panel p-6 md:p-10 rounded-xl shadow-2xl shadow-black/50 border border-amber-900/30 mb-8">
              <div className="prose prose-invert prose-amber max-w-none font-serif text-lg leading-relaxed mb-10">
                <ReactMarkdown>{currentScene.text}</ReactMarkdown>
              </div>

              <div className="space-y-4">
                <h3 className="font-cinzel text-amber-500 text-sm tracking-widest uppercase mb-4 text-center">Choose Your Path</h3>
                {currentScene.choices.map((choice: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleChoice(choice)}
                    className="w-full text-left p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-amber-500/50 transition-all group flex items-center justify-between"
                  >
                    <span className="text-zinc-300 group-hover:text-amber-100 font-serif">{choice.text}</span>
                    {choice.isQuiz && <Sword size={16} className="text-amber-700 group-hover:text-amber-500" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Quiz Modal Overlay */
            <div className="rpg-panel p-8 rounded-xl shadow-2xl shadow-amber-900/20 border border-amber-500/50 animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-8">
                <Sword size={32} className="text-amber-500 mx-auto mb-4" />
                <h3 className="font-cinzel text-2xl text-amber-500 uppercase tracking-widest mb-2">Knowledge Check</h3>
                <p className="text-zinc-400 font-serif italic">Your understanding of "{activeQuiz.quizWord}" is tested.</p>
              </div>

              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 mb-8">
                <p className="text-lg text-zinc-200 text-center">{activeQuiz.quizQuestion}</p>
              </div>

              {!quizResult ? (
                <div className="space-y-3 mb-8">
                  {activeQuiz.quizOptions.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setQuizAnswer(opt)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        quizAnswer === opt 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-100' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/50'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`p-6 rounded-lg border text-center mb-8 ${
                  quizResult === 'correct' ? 'bg-green-950/30 border-green-900' : 'bg-red-950/30 border-red-900'
                }`}>
                  <h4 className={`font-cinzel text-xl mb-2 ${quizResult === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                    {quizResult === 'correct' ? 'Victory!' : 'Defeat!'}
                  </h4>
                  <p className="text-zinc-300">
                    {quizResult === 'correct' 
                      ? 'Your knowledge strikes true. (+20 XP)' 
                      : `The correct answer was: ${activeQuiz.quizCorrectAnswer}`}
                  </p>
                </div>
              )}

              {!quizResult ? (
                <button
                  onClick={submitQuiz}
                  disabled={!quizAnswer}
                  className="w-full rpg-button py-4 rounded text-lg"
                >
                  Strike
                </button>
              ) : (
                <button
                  onClick={continueAfterQuiz}
                  className="w-full rpg-button py-4 rounded text-lg"
                >
                  Continue Journey
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

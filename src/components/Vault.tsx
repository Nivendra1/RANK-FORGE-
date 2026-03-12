import React from 'react';
import { WordEntry } from '../types';
import { Shield, Play, ChevronRight, Brain } from 'lucide-react';

interface VaultProps {
  words: WordEntry[];
  onStartQuest: () => void;
}

export default function Vault({ words, onStartQuest }: VaultProps) {
  const wordsNeeded = Math.max(0, 15 - words.length);
  const canQuest = words.length >= 15;

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between z-10">
        <div>
          <h2 className="font-cinzel text-2xl text-amber-500 flex items-center gap-3">
            <Shield className="text-amber-600" />
            Word Vault
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {words.length} words collected from your reading.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {!canQuest && (
            <div className="text-right">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Quest Unlock</div>
              <div className="w-32 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full" 
                  style={{ width: `${(words.length / 15) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-amber-500/70 mt-1">{wordsNeeded} more words needed</div>
            </div>
          )}
          
          <button 
            onClick={onStartQuest}
            disabled={!canQuest}
            className="rpg-button px-6 py-3 rounded flex items-center gap-2"
          >
            <Play size={18} fill="currentColor" />
            <span>Start Quest</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {words.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600">
            <Shield size={64} className="mb-4 opacity-20" />
            <p className="font-cinzel text-xl">Your vault is empty.</p>
            <p className="text-sm mt-2">Read documents and save words to fill it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
            {words.map((word) => (
              <div key={word.id} className="rpg-panel p-5 rounded-xl hover:border-amber-500/50 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-cinzel text-xl text-amber-500 uppercase tracking-wider">{word.word}</h3>
                    <span className="text-xs text-zinc-500 italic">{word.partOfSpeech}</span>
                  </div>
                  {word.feynmanScore !== undefined && (
                    <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800" title="Feynman Score">
                      <Brain size={12} className={word.feynmanScore >= 70 ? 'text-green-500' : 'text-amber-500'} />
                      <span className={`text-xs font-bold ${word.feynmanScore >= 70 ? 'text-green-500' : 'text-amber-500'}`}>
                        {word.feynmanScore}
                      </span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-zinc-300 mb-4 line-clamp-3">{word.definition}</p>
                
                <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/50 mb-4">
                  <p className="text-xs text-zinc-400 italic">"{word.originalSentence}"</p>
                  <p className="text-[10px] text-zinc-600 mt-2 text-right">- {word.sourceDocument}</p>
                </div>

                <button className="w-full text-xs text-amber-500/70 hover:text-amber-400 flex items-center justify-center gap-1 uppercase tracking-widest group-hover:bg-amber-500/10 py-2 rounded transition-colors">
                  <span>View Details</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

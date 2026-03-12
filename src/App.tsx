import React, { useState, useEffect } from 'react';
import { BookOpen, Shield, Sword, LogOut, User } from 'lucide-react';
import { WordEntry, UserStats, getRank, getNextRank } from './types';
import ReadingCanvas from './components/ReadingCanvas';
import Vault from './components/Vault';
import Quest from './components/Quest';
import ExitQuiz from './components/ExitQuiz';
import Profile from './components/Profile';

function App() {
  const [activeTab, setActiveTab] = useState<'read' | 'vault' | 'quest' | 'profile'>('read');
  const [showExitQuiz, setShowExitQuiz] = useState(false);
  
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('rankforge_stats');
    return saved ? JSON.parse(saved) : { xp: 0, rank: 'E-Rank', wordsLearned: 0, questsCompleted: 0 };
  });

  const [vault, setVault] = useState<WordEntry[]>(() => {
    const saved = localStorage.getItem('rankforge_vault');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('rankforge_stats', JSON.stringify(stats));
    localStorage.setItem('rankforge_vault', JSON.stringify(vault));
  }, [stats, vault]);

  const addXp = (amount: number) => {
    setStats(prev => {
      const newXp = prev.xp + amount;
      return {
        ...prev,
        xp: newXp,
        rank: getRank(newXp)
      };
    });
  };

  const handleSaveWord = (word: WordEntry) => {
    if (!vault.find(w => w.word.toLowerCase() === word.word.toLowerCase())) {
      setVault(prev => [...prev, word]);
      addXp(10);
      setStats(prev => ({ ...prev, wordsLearned: prev.wordsLearned + 1 }));
    }
  };

  const handleQuestComplete = () => {
    addXp(150);
    setStats(prev => ({ ...prev, questsCompleted: prev.questsCompleted + 1 }));
    setActiveTab('vault');
  };

  const handleExit = () => {
    if (vault.length > 0) {
      setShowExitQuiz(true);
    } else {
      alert("You haven't learned any words yet! Keep reading.");
    }
  };

  const currentRank = getRank(stats.xp);
  const nextRank = getNextRank(stats.xp);
  const progress = nextRank ? ((stats.xp - (nextRank.minXp - (nextRank.minXp === 200 ? 200 : nextRank.minXp === 500 ? 300 : nextRank.minXp === 1000 ? 500 : nextRank.minXp === 1800 ? 800 : nextRank.minXp === 2800 ? 1000 : 1200))) / (nextRank.minXp - (nextRank.minXp === 200 ? 0 : nextRank.minXp === 500 ? 200 : nextRank.minXp === 1000 ? 500 : nextRank.minXp === 1800 ? 1000 : nextRank.minXp === 2800 ? 1800 : 2800))) * 100 : 100;

  // Calculate progress correctly
  let progressPercent = 100;
  if (nextRank) {
    const currentRankMinXp = RANKS.find(r => r.name === currentRank)?.minXp || 0;
    const xpInCurrentRank = stats.xp - currentRankMinXp;
    const xpNeededForNextRank = nextRank.minXp - currentRankMinXp;
    progressPercent = Math.min(100, Math.max(0, (xpInCurrentRank / xpNeededForNextRank) * 100));
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col p-4 shrink-0">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-cinzel font-bold text-amber-500 tracking-wider mb-2">RANKFORGE</h1>
          <div className="rpg-panel p-3 rounded-lg text-left">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm text-zinc-400 font-cinzel">{currentRank}</span>
              <span className="text-xs text-amber-500">{stats.xp} XP</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {nextRank && (
              <div className="text-[10px] text-zinc-500 mt-1 text-right">
                Next: {nextRank.name} ({nextRank.minXp} XP)
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <NavItem 
            icon={<BookOpen size={20} />} 
            label="Reading Canvas" 
            active={activeTab === 'read'} 
            onClick={() => setActiveTab('read')} 
          />
          <NavItem 
            icon={<Shield size={20} />} 
            label="Word Vault" 
            active={activeTab === 'vault'} 
            onClick={() => setActiveTab('vault')} 
            badge={vault.length}
          />
          <NavItem 
            icon={<Sword size={20} />} 
            label="Quests" 
            active={activeTab === 'quest'} 
            onClick={() => setActiveTab('quest')} 
            disabled={vault.length < 15}
            lockedText="Requires 15 words"
          />
          <NavItem 
            icon={<User size={20} />} 
            label="Profile" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
        </div>

        <div className="mt-auto pt-4">
          <button 
            onClick={handleExit}
            className="w-full flex items-center justify-center gap-2 p-3 rounded text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={18} />
            <span>Exit Session</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className={activeTab === 'read' ? 'block h-full' : 'hidden'}>
          <ReadingCanvas onSaveWord={handleSaveWord} addXp={addXp} />
        </div>
        {activeTab === 'vault' && <Vault words={vault} onStartQuest={() => setActiveTab('quest')} />}
        {activeTab === 'quest' && <Quest words={vault} onComplete={handleQuestComplete} addXp={addXp} />}
        {activeTab === 'profile' && <Profile stats={stats} />}
      </main>

      {showExitQuiz && (
        <ExitQuiz 
          words={vault} 
          onClose={() => setShowExitQuiz(false)} 
          addXp={addXp} 
        />
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge, disabled, lockedText }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
        active 
          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' 
          : disabled
            ? 'opacity-50 cursor-not-allowed text-zinc-600'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-cinzel tracking-wide">{label}</span>
      </div>
      {badge !== undefined && (
        <span className="bg-zinc-800 text-xs px-2 py-1 rounded-full text-zinc-300">
          {badge}
        </span>
      )}
      {disabled && lockedText && (
        <span className="text-[10px] text-zinc-600">{lockedText}</span>
      )}
    </button>
  );
}

const RANKS = [
  { name: 'E-Rank', minXp: 0 },
  { name: 'D-Rank', minXp: 200 },
  { name: 'C-Rank', minXp: 500 },
  { name: 'B-Rank', minXp: 1000 },
  { name: 'A-Rank', minXp: 1800 },
  { name: 'S-Rank', minXp: 2800 },
  { name: 'MONARCH', minXp: 4000 },
];

export default App;

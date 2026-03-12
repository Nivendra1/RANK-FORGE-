import React from 'react';
import { UserStats, RANKS } from '../types';
import { User, Trophy, Book, Sword, Shield } from 'lucide-react';

interface ProfileProps {
  stats: UserStats;
}

export default function Profile({ stats }: ProfileProps) {
  const currentRankIndex = RANKS.findIndex(r => r.name === stats.rank);
  const nextRank = RANKS[currentRankIndex + 1];
  
  let progressPercent = 100;
  if (nextRank) {
    const currentRankMinXp = RANKS[currentRankIndex].minXp;
    const xpInCurrentRank = stats.xp - currentRankMinXp;
    const xpNeededForNextRank = nextRank.minXp - currentRankMinXp;
    progressPercent = Math.min(100, Math.max(0, (xpInCurrentRank / xpNeededForNextRank) * 100));
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-auto">
      <div className="bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between z-10">
        <h2 className="font-cinzel text-2xl text-amber-500 flex items-center gap-3">
          <User className="text-amber-600" />
          Hunter Profile
        </h2>
      </div>

      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
        
        {/* Rank Card */}
        <div className="rpg-panel p-8 rounded-2xl border border-amber-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Trophy size={120} className="text-amber-500" />
          </div>
          
          <div className="relative z-10">
            <div className="text-sm text-zinc-500 uppercase tracking-widest mb-2 font-cinzel">Current Rank</div>
            <h3 className="text-5xl font-cinzel text-amber-500 font-bold tracking-wider mb-6">
              {stats.rank}
            </h3>
            
            <div className="mb-2 flex justify-between items-end">
              <span className="text-2xl text-zinc-200 font-serif">{stats.xp} <span className="text-sm text-zinc-500">XP</span></span>
              {nextRank && (
                <span className="text-sm text-zinc-400 font-cinzel">
                  Next: {nextRank.name} ({nextRank.minXp} XP)
                </span>
              )}
            </div>
            
            <div className="w-full bg-zinc-900 h-4 rounded-full overflow-hidden border border-zinc-800">
              <div 
                className="bg-gradient-to-r from-amber-700 to-amber-400 h-full transition-all duration-1000 relative" 
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rpg-panel p-6 rounded-xl border border-zinc-800 flex items-center gap-6">
            <div className="bg-zinc-900 p-4 rounded-full border border-zinc-800">
              <Book size={32} className="text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-cinzel mb-1">Words Conquered</div>
              <div className="text-3xl text-zinc-200 font-serif">{stats.wordsLearned}</div>
            </div>
          </div>
          
          <div className="rpg-panel p-6 rounded-xl border border-zinc-800 flex items-center gap-6">
            <div className="bg-zinc-900 p-4 rounded-full border border-zinc-800">
              <Sword size={32} className="text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-cinzel mb-1">Quests Completed</div>
              <div className="text-3xl text-zinc-200 font-serif">{stats.questsCompleted}</div>
            </div>
          </div>
        </div>

        {/* Rank Progression Path */}
        <div className="rpg-panel p-8 rounded-xl border border-zinc-800">
          <h4 className="font-cinzel text-xl text-amber-500 mb-8 flex items-center gap-3">
            <Shield className="text-amber-600" size={20} />
            Path to Monarch
          </h4>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-amber-500 before:to-zinc-800">
            {RANKS.map((rank, idx) => {
              const isAchieved = stats.xp >= rank.minXp;
              const isCurrent = stats.rank === rank.name;
              
              return (
                <div key={rank.name} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${
                    isCurrent ? 'bg-amber-500 border-amber-900 shadow-amber-500/50' : 
                    isAchieved ? 'bg-amber-700 border-amber-900' : 'bg-zinc-900 border-zinc-800'
                  }`}>
                    {isAchieved && <Check size={16} className="text-zinc-900" />}
                  </div>
                  
                  <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border ${
                    isCurrent ? 'bg-amber-950/30 border-amber-500/50' : 
                    isAchieved ? 'bg-zinc-900/50 border-amber-900/30' : 'bg-zinc-900/20 border-zinc-800/50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <h5 className={`font-cinzel font-bold tracking-wider ${
                        isCurrent ? 'text-amber-400' : 
                        isAchieved ? 'text-amber-600' : 'text-zinc-600'
                      }`}>{rank.name}</h5>
                      <span className={`text-xs font-serif ${
                        isAchieved ? 'text-amber-500/50' : 'text-zinc-600'
                      }`}>{rank.minXp} XP</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper component for Check icon since it wasn't imported at the top
function Check(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

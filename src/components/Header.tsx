import React from 'react';
import { Sprout, Search } from 'lucide-react';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  return (
    <header className="fixed top-0 left-0 w-full h-14 z-30 bg-[#fbfcf9]/85 backdrop-blur-md border-b border-[#e9efe8]/60 px-6 sm:px-8 flex items-center justify-between pointer-events-auto">
      {/* Brand: Clean Zen Minimalist */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[#eaf5ee] flex items-center justify-center text-[#105b38]">
          <Sprout className="w-4 h-4 text-[#105b38]" />
        </div>
        <span className="font-semibold text-base sm:text-lg tracking-tight text-[#14231b]">
          Denkel
        </span>
      </div>

      {/* Right Actions: Subtle Zen Shortcut */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1 rounded-full text-[#526358] hover:text-[#14231b] hover:bg-[#edf4ee] transition-colors border border-transparent hover:border-[#dde7de] text-xs cursor-pointer"
          title="Search Tasks"
        >
          <Search className="w-3.5 h-3.5 opacity-70" />
          <span className="font-mono text-[11px] opacity-60">/</span>
        </button>
      </div>
    </header>
  );
};

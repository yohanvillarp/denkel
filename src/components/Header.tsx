import React, { useMemo } from 'react';
import { Sprout, Search } from 'lucide-react';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  // Detect OS for appropriate shortcut hint (⌘K on macOS/iOS, Ctrl K on Windows/Linux)
  const shortcutHint = useMemo(() => {
    if (typeof window === 'undefined') return 'Ctrl K';
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform);
    return isMac ? '⌘K' : 'Ctrl K';
  }, []);

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

      {/* Right Actions: Discoverable, Compact Botanical Search Pill */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#526358] hover:text-[#14231b] border border-[#e2ece4] hover:border-[#105b38]/30 shadow-2xs hover:shadow-xs transition-all cursor-pointer group text-xs select-none"
          title={`Search tasks (${shortcutHint} or /)`}
          aria-label="Search tasks"
        >
          <Search className="w-3.5 h-3.5 text-[#718579] group-hover:text-[#105b38] transition-colors shrink-0" />
          <span className="hidden sm:inline text-xs text-[#718579] group-hover:text-[#35483d] transition-colors font-normal">
            Search tasks...
          </span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#718579] bg-[#f4f7f4] border border-[#dce6dd] rounded-md group-hover:border-[#cde0d2] transition-colors">
            {shortcutHint}
          </kbd>
        </button>
      </div>
    </header>
  );
};

import type { AppSection } from '../types/lexicon';

interface TopNavProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  onNewDraft: () => void;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'dictionary', label: 'Dictionary' },
  { id: 'studio', label: 'Writing Studio' },
  { id: 'wordbook', label: 'Wordbook' },
  { id: 'guide', label: 'Style Guide' },
];

export function TopNav({ activeSection, onNavigate, onNewDraft }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#F3CBD7] bg-[#FFF6F8]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-3.5 lg:px-10">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('dictionary')}
          className="font-serif italic text-2xl font-semibold tracking-tight text-[#3B1D2A] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BE3E6D]"
        >
          Folio Lexicon
        </button>

        {/* Zone 2: 4 clean single-line text nav links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-6 overflow-x-auto md:gap-8"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BE3E6D] ${
                  isActive
                    ? 'text-[#BE3E6D]'
                    : 'text-[#6E4757] hover:text-[#3B1D2A]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-[#DB5B8A]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewDraft}
            className="min-h-[40px] rounded-full bg-[#DB5B8A] px-5 py-2 text-sm font-medium text-white shadow-xs transition-colors duration-150 hover:bg-[#BE3E6D] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BE3E6D]"
          >
            New Draft
          </button>
        </div>
      </div>
    </header>
  );
}

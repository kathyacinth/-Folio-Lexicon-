interface RibbonBowProps {
  className?: string;
}

export function RibbonBow({ className = 'h-5 w-8 text-[#DB5B8A]' }: RibbonBowProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 28"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 14C19.5 8 10.5 3.5 6 7.5C2.5 10.5 5 17 11.5 17C16.5 17 20.5 15.2 24 14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 14C28.5 8 37.5 3.5 42 7.5C45.5 10.5 43 17 36.5 17C31.5 17 27.5 15.2 24 14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 15.5L15 25.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M25.5 15.5L33 25.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="24" cy="14" r="2.4" fill="currentColor" />
    </svg>
  );
}

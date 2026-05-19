export function FlexStudioLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="Flex Studio logo"
      fill="none"
    >
      <rect x="1" y="3" width="22" height="16" rx="4" fill="hsl(var(--primary))" />
      <path
        d="M7 13.5L11 9.5L13.5 12L17 8.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="20.5" r="1.4" fill="hsl(var(--primary))" />
    </svg>
  );
}

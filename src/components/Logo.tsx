/**
 * Logo Component
 * Matches the favicon design (forge-icon.svg)
 */

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className = '' }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="forgeGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#6366f1' }} />
          <stop offset="100%" style={{ stopColor: '#8b5cf6' }} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#forgeGradLogo)" />
      <path
        d="M50 20 L70 35 L70 50 L50 65 L30 50 L30 35 Z"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M50 35 L60 42.5 L60 50 L50 57.5 L40 50 L40 42.5 Z"
        fill="white"
        opacity="0.9"
      />
      <circle cx="50" cy="75" r="5" fill="white" opacity="0.8" />
    </svg>
  );
}

/**
 * Logo icon only (without background) for use on colored backgrounds
 */
export function LogoIcon({ size = 24, className = '' }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
    >
      <path
        d="M50 10 L75 27.5 L75 47.5 L50 65 L25 47.5 L25 27.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M50 27.5 L62.5 36.25 L62.5 47.5 L50 56.25 L37.5 47.5 L37.5 36.25 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="50" cy="80" r="6" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

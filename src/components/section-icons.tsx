import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, className, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DailyAnalysisIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4.75 18.25h14.5" />
      <path d="M6.5 15.5 9.5 12l3 2.25 5-6" />
      <path d="M14.75 8.25h2.75V11" />
      <path d="M5.75 5.75h12.5" opacity="0.52" />
    </BaseIcon>
  );
}

export function BiasIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4.75v14.5" />
      <path d="m8.75 8 3.25-3.25L15.25 8" />
      <path d="M7.25 18.25h9.5" opacity="0.52" />
    </BaseIcon>
  );
}

export function KeyLevelsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 7.5h12" />
      <path d="M4.75 12h14.5" />
      <path d="M7.5 16.5h9" />
      <circle cx="15.5" cy="7.5" r="1.25" />
      <circle cx="8.5" cy="12" r="1.25" />
      <circle cx="13.5" cy="16.5" r="1.25" />
    </BaseIcon>
  );
}

export function IndicatorsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.75" y="5.25" width="14.5" height="13.5" rx="2.75" />
      <path d="M8 15V11.75" />
      <path d="M12 15v-5.5" />
      <path d="M16 15v-2.75" />
    </BaseIcon>
  );
}

export function TradeSetupIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12h9.5" />
      <path d="m11.5 7 5 5-5 5" />
      <path d="M5.5 7.25h4" opacity="0.52" />
      <path d="M5.5 16.75h4" opacity="0.52" />
    </BaseIcon>
  );
}

export function MacroEventIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="5.5" width="14" height="13.5" rx="2.5" />
      <path d="M8.25 4.75v2.5" />
      <path d="M15.75 4.75v2.5" />
      <path d="M5 9.25h14" />
      <path d="M8.25 12.25h3" />
      <path d="M8.25 15.25h5.5" />
    </BaseIcon>
  );
}

export function AssistantIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="6" y="5.25" width="12" height="13.5" rx="3" />
      <path d="M9.5 10h5" />
      <path d="M12 8v4" />
      <circle cx="9" cy="14.75" r="0.85" />
      <circle cx="15" cy="14.75" r="0.85" />
    </BaseIcon>
  );
}

export function CoursesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 6.25h8.75a2.25 2.25 0 0 1 2.25 2.25v9.25H8.25A2.25 2.25 0 0 0 6 20" />
      <path d="M6 6.25V20" />
      <path d="M8.75 10h5" />
      <path d="M8.75 13h4" />
    </BaseIcon>
  );
}

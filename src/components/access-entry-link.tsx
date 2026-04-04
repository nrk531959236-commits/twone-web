import Link from "next/link";

type AccessEntryLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  mode?: "login" | "assistant";
};

export function AccessEntryLink({ href, className, children, mode = "assistant" }: AccessEntryLinkProps) {
  const target = href === "/assistant" ? `/assistant?entry=${mode}` : href;

  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}

import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function SectionHeader({ title, icon, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
        {icon && <span className="text-athletix-primary">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

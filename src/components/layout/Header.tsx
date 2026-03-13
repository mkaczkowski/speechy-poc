import { config } from '@/lib/config';

export function Header() {
  return (
    <header className="border-border border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">{config.appName}</h1>
        <div className="flex items-center gap-2">{/* Add navigation items here */}</div>
      </div>
    </header>
  );
}

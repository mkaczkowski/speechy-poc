# React + TypeScript Component Guidelines

A focused blueprint for writing React components. For related patterns, see:

- [CLAUDE.md](../CLAUDE.md) - Project overview, commands, tech stack

---

## Component Anatomy

Every component follows this structure:

```tsx
// 1. Imports (grouped: external → internal → types)
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces
export interface MyComponentProps {
  title: string;
  count?: number;
  onAction?: () => void;
}

// 3. Component Implementation
export function MyComponent({ title, count = 0, onAction }: MyComponentProps) {
  // a. Hooks (all hooks must be called unconditionally)
  const [isOpen, setIsOpen] = useState(false);

  // b. Derived state / computations
  const displayCount = count > 99 ? '99+' : count;

  // c. Event handlers
  const handleClick = () => {
    setIsOpen(true);
    onAction?.();
  };

  // d. Early returns (only AFTER all hooks)
  if (!title) return null;

  // e. Render
  return (
    <div>
      <h2>{title}</h2>
      <span>{displayCount}</span>
      <Button onClick={handleClick}>Action</Button>
    </div>
  );
}
```

---

## Props Patterns

### Extending HTML Attributes

For components wrapping native elements. React 19 supports `ref` as a regular prop, so new components don't need `forwardRef` (existing Shadcn components may still use it — that's fine):

```tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export function Button({ variant = 'primary', isLoading, children, className, ref, ...props }: ButtonProps) {
  return (
    <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props}>
      {isLoading ? <Spinner /> : children}
    </button>
  );
}
```

### Generic Components

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
}

export function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
```

---

## Component Categories

| Category           | Location                     | Naming                     | Export | Barrel |
| ------------------ | ---------------------------- | -------------------------- | ------ | ------ |
| UI Primitives      | `components/ui/`             | `button.tsx` (lowercase)   | Named  | No\*   |
| Feature Components | `components/shared/Feature/` | `Feature.tsx` (PascalCase) | Named  | Yes    |
| Layout             | `components/layout/`         | `Header.tsx` (PascalCase)  | Named  | Yes    |

\*UI primitives use direct imports (`@/components/ui/button`) following shadcn/ui conventions.

### Feature Component Structure

```
src/components/shared/
├── ErrorBoundary/
│   ├── ErrorBoundary.tsx
│   └── index.ts           # export { ErrorBoundary } from './ErrorBoundary';
└── index.ts               # Re-exports all shared components
```

---

## File Organization

### Default: Single File

Keep types, helpers, and component together in one file. This is the pattern used throughout this codebase—even `dropdown-menu.tsx` at 228 lines remains a single file.

```tsx
// button.tsx - types and component together
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const buttonVariants = cva(/* ... */);

export function Button({ variant, className, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
```

### When to Split

Split only when you have a **concrete reason**, not preemptively:

| Situation                        | Action                            |
| -------------------------------- | --------------------------------- |
| Types reused by other components | Move to `@/types/`                |
| Helper reused elsewhere          | Move to `@/lib/`                  |
| File exceeds ~300 lines          | Consider splitting by concern     |
| Multiple sub-components          | Create folder with separate files |

### Splitting Example

For a complex component like a data table:

```
src/components/shared/DataTable/
├── DataTable.tsx          # Main component
├── DataTableHeader.tsx    # Sub-component
├── DataTableRow.tsx       # Sub-component
├── columns.tsx            # Column configuration
└── index.ts               # export { DataTable } from './DataTable';
```

**Avoid**: Separate `.types.ts` or `.helpers.ts` files for code used only by that component. Keep related code together.

---

## Styling with CVA

Use [Class Variance Authority](https://cva.style/docs) for variant-based styling:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Base styles
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-transparent',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ variant, size, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
```

### `cn()` Utility

```tsx
cn('px-4 py-2', 'px-6'); // → 'py-2 px-6' (later overrides)
cn('text-red-500', className); // → allows prop override
cn(isActive && 'bg-primary'); // → conditional classes
```

---

## Loading & Error States

Components fetching data should handle all states:

```tsx
export function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (error || !user) {
    return <div className="text-destructive">Failed to load profile</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <img src={user.avatar} alt={user.name} />
      <span>{user.name}</span>
    </div>
  );
}
```

---

## Accessibility

### Required Practices

```tsx
// Icons need labels
<button aria-label="Close">
  <XIcon />
</button>

// Use semantic roles
<header role="banner">...</header>
<nav role="navigation">...</nav>
<main role="main">...</main>

// Loading states
<Spinner role="status" aria-label="Loading" />

// Interactive elements need focus styles (handled by Tailwind's focus-visible)
<button className="focus-visible:ring-2 focus-visible:ring-ring">...</button>
```

---

## Checklist

Before submitting a component:

- [ ] Props use `interface` with `Props` suffix
- [ ] Named export (default only for lazy-loaded routes)
- [ ] Imports use `@/` path alias
- [ ] User-facing text is clear and concise
- [ ] Handles loading/error states for async data
- [ ] Uses `cn()` for className merging
- [ ] Accessible (roles, aria-labels, keyboard nav)
- [ ] Barrel export in `index.ts` (except UI primitives)
- [ ] Test file co-located (e.g., `Button.test.tsx`)

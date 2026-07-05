# Contributing to vacansee-au

Thank you for your interest in contributing to vacansee-au! This comprehensive guide covers both contribution guidelines and implementation details to help you work effectively with the codebase.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Common Tasks](#common-tasks)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

Be respectful, inclusive, and considerate of others. We're all here to build something useful together.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Supabase account (for authentication)
- Git

### Quick Start

Follow these steps to get the development environment running:

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/vacansee-au.git
   cd vacansee-au
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in your environment variables:
   - Database connection strings
   - Supabase credentials
   - Other required configuration

4. **Database Setup**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Push schema to database
   npx prisma db push

   # (Optional) Seed data
   npm run seed
   ```

5. **Run Development Server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

---

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 (Pages Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: Supabase Auth (OAuth)
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI
- **Animations**: Framer Motion
- **Date/Time**: date-fns + date-fns-tz
- **Deployment**: Vercel

### Core Principles

1. **Dubai Timezone First** - All time operations use Asia/Dubai
2. **Type Safety** - Zod schemas + TypeScript types
3. **Centralized Logic** - Services, hooks, constants
4. **Consistent Patterns** - All API routes follow same structure
5. **Error Handling** - Structured errors with request IDs
6. **Performance** - Caching, indexes, bundle optimization

---

## Project Structure

```
vacansee-au/
├── prisma/
│   └── schema.prisma              # Database schema with indexes
├── public/                        # Static assets
├── scripts/                       # Python data processing scripts
├── src/
│   ├── components/
│   │   ├── ui/                    # Shadcn UI components
│   │   │   ├── toast.tsx          # Toast notifications
│   │   │   ├── skeleton.tsx       # Loading skeletons
│   │   │   └── ...
│   │   ├── ErrorBoundary.tsx      # Error handling
│   │   ├── LoadingSpinner.tsx     # Standardized spinner
│   │   ├── Onboarding.tsx         # New user tour
│   │   ├── ScrollToTop.tsx        # Scroll button
│   │   ├── SiteHeader.tsx         # Navigation
│   │   └── SiteFooter.tsx         # Footer
│   ├── constants/
│   │   └── index.ts               # All constants (DUBAI_TIMEZONE, etc.)
│   ├── contexts/
│   │   └── TimeFormatContext.tsx  # 12h/24h preference
│   ├── hooks/
│   │   ├── useDebounce.ts         # Debounce values
│   │   ├── useLocalStorage.ts     # localStorage wrapper
│   │   └─└── tsconfig.json                  # TypeScript configuration
```

---

## Key Concepts

### 1. Dubai Timezone Handling ⚠️

**CRITICAL**: All time operations MUST use Dubai timezone.

```typescript
// ✅ CORRECT - Use timeService
import {
  getCurrentDubaiTime,
  getCurrentTimeString,
} from "@/services/timeService";

const now = getCurrentDubaiTime(); // Date in Dubai TZ
const timeStr = getCurrentTimeString(); // "14:30" in Dubai

// ❌ WRONG - Never use raw Date
const now = new Date(); // Server timezone, not Dubai!
```

**Why?**

- Room schedules are in Dubai time
- Server time varies (UTC, local, etc.)
- Must be consistent across API and UI

### 2. API Route Pattern

All API routes follow this structure:

```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { addSecurityHeaders, getClientIP } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { handleApiError, ValidationError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";

// Define Zod schema
const RequestSchema = z.object({
  // ... fields
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const requestId = generateRequestId();
  const ip = getClientIP(req);

  try {
    // 1. Security headers
    addSecurityHeaders(res);

    // 2. Rate limiting
    await rateLimit(ip);

    // 3. Method check
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // 4. Authentication
    const supabase = createSupabaseRouteHandlerClient(req, res);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // 5. Validation
    const validationResult = RequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError("Invalid request", {
        errors: validationResult.error.errors,
      });
    }

    // 6. Business logic
    logger.info("Processing request", { requestId, userId: session.user.id });
    const result = await someOperation();

    // 7. Response
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in API", error, { requestId, ip });
    const { statusCode, body } = handleApiError(error);
    return res.status(statusCode).json(body);
  } finally {
    await prisma.$disconnect();
  }
}
```

### 3. Service Layer

Business logic is extracted to services:

```typescript
// src/services/roomService.ts
export function processRoomsList(rooms: Room[]): Room[] {
  // Filter out excluded patterns
  // Group combined rooms
  // Return processed list
}
```

Use services in both API routes and UI components.

### 4. Custom Hooks

Reusable logic as hooks:

```typescript
// Search rooms
import { useRoomSearch } from "@/hooks/useRoomSearch";
const { results, search } = useRoomSearch(rooms);

// Debounce
import { useDebounce } from "@/hooks/useDebounce";
const debouncedValue = useDebounce(value, 300);

// localStorage
import { useLocalStorage } from "@/hooks/useLocalStorage";
const [settings, setSettings] = useLocalStorage("key", defaultValue);
```

### 5. Toast Notifications

Show user feedback:

```typescript
import { useToast } from "@/components/ui/toast";

function MyComponent() {
  const { success, error, warning, info } = useToast();

  const handleSubmit = async () => {
    try {
      await submitData();
      success("Data saved successfully!");
    } catch (err) {
      error("Failed to save data");
    }
  };
}
```

### 6. Loading States

Use skeletons for better UX:

```typescript
import { RoomListSkeleton } from "@/components/ui/skeleton";

{isLoading ? (
  <RoomListSkeleton count={5} />
) : (
  <RoomList rooms={rooms} />
)}
```

---

## Development Workflow

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

Example:

```
feat(rooms): add capacity filter to room search

Added a new filter option to allow users to search for rooms
by minimum capacity requirement.

Closes #123
```

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary
- Use the shared types from `src/types/`

### React Components

- Use functional components with hooks
- Follow the single responsibility principle
- Extract reusable logic into custom hooks
- Use proper prop types

```tsx
// Good
interface RoomCardProps {
  room: Room;
  onSelect: (room: Room) => void;
}

export function RoomCard({ room, onSelect }: RoomCardProps) {
  // Component implementation
}
```

### Code Organization

- Keep files focused and single-purpose
- Extract complex logic into services (`src/services/`)
- Use custom hooks for reusable stateful logic (`src/hooks/`)
- Keep components in `src/components/`
- Store constants in `src/constants/`

### Styling

- Use Tailwind CSS for styling
- Follow the existing design patterns
- Use the cn() utility for conditional classes
- Maintain consistent spacing and sizing

```tsx
// Good
<div
  className={cn(
    "flex items-center gap-2",
    isActive && "bg-purple-600",
    className,
  )}
>
  {children}
</div>
```

### API Routes

- Use proper HTTP methods (GET, POST, etc.)
- Validate input using Zod schemas
- Handle errors consistently
- Add proper TypeScript types
- Include rate limiting for sensitive endpoints
- Add security headers

```ts
import { z } from "zod";
import { ValidationError } from "@/lib/errors";

const RequestSchema = z.object({
  roomName: z.string().min(1),
});

export default async function handler(req, res) {
  // Validate input
  const result = RequestSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError("Invalid request", result.error);
  }

  // Handle request
}
```

---

## Common Tasks

### Adding a New API Route

1. Create file in `src/pages/api/`
2. Follow standard API pattern (see Key Concepts section)
3. Test the endpoint locally

Example:

```typescript
// src/types/api.ts
export const NewFeatureRequestSchema = z.object({
  field: z.string().min(1),
});

export type NewFeatureRequest = z.infer<typeof NewFeatureRequestSchema>;
```

### Adding a New Component

1. Create in appropriate location:
   - `src/components/` for app components
   - `src/components/ui/` for reusable UI
2. Export from component file
3. Use TypeScript interfaces for props

### Working with Time/Dates

```typescript
import {
  getCurrentDubaiTime,
  getCurrentTimeString,
  getCurrentDayName,
  formatDubaiDateToISO,
  addMinutesToTime,
} from "@/services/timeService";

// Current time in Dubai
const now = getCurrentDubaiTime(); // Date object

// Formatted strings
const timeStr = getCurrentTimeString(); // "14:30"
const day = getCurrentDayName(); // "Monday"

// ISO formatting
const iso = formatDubaiDateToISO(now); // "2024-01-15T14:30:00+04:00"

// Time arithmetic
const future = addMinutesToTime("14:30", 30); // "15:00"
```

### Database Queries

```typescript
import prisma from "@/lib/prisma";

// Use indexes for performance
const bookedRooms = await prisma.timings.findMany({
  where: {
    Day: currentDay, // Indexed
    StartTime: { lte: endTime },
    EndTime: { gt: startTime },
  },
  select: { Room: true }, // Select only needed fields
  distinct: ["Room"], // Avoid duplicates
});
```

### Caching

```typescript
import { cacheGetOrSet } from "@/lib/cache";
import { CACHE_TTL } from "@/constants";

const data = await cacheGetOrSet(
  "cache-key",
  async () => {
    // Expensive operation
    return await fetchData();
  },
  {
    ttl: CACHE_TTL.SCHEDULE * 1000,
    staleTime: CACHE_TTL.SCHEDULE * 0.8 * 1000,
  },
);
```

---

## Best Practices

### ✅ DO

1. **Use constants** from `@/constants`
2. **Log with context** using `logger`
3. **Handle errors** with try/catch
4. **Use TypeScript** strictly
5. **Add comments** for complex logic
6. **Test manually** before committing
7. **Use timeService** for all time operations

### ❌ DON'T

1. **Don't use `console.log`** (use `logger`)
2. **Don't hardcode values** (use constants)
3. **Don't skip error handling**
4. **Don't commit without testing**
5. **Don't break existing APIs**

### Code Style Examples

```typescript
// ✅ GOOD
import { logger } from "@/lib/logger";
import { DUBAI_TIMEZONE } from "@/constants";

logger.info("Processing request", {
  requestId,
  userId: session.user.id,
  timestamp: new Date().toISOString(),
});

// ❌ BAD
console.log("Processing request");
const TIMEZONE = "Asia/Dubai"; // Use constant instead
```

---

## Testing

Currently, the project does not have automated tests (this is a known gap). When adding tests in the future:

- Write unit tests for utility functions
- Write integration tests for API routes
- Write component tests for complex UI components
- Ensure tests are clear and maintainable

---

## Troubleshooting

### Issue: Wrong timezone showing

**Solution**: Verify you're using `timeService` functions, not raw `Date()`.

```typescript
// Check current timezone
import { getTimezoneDebugInfo } from "@/services/timeService";
console.log(getTimezoneDebugInfo());
```

### Issue: Rate limit errors

**Solution**: Check `src/lib/rateLimit.ts` configuration.

```typescript
// Current: 100 requests per minute per IP
// Adjust if needed for your use case
```

### Issue: Caching stale data

**Solution**: Clear cache or adjust TTL.

```typescript
// Cache keys are in format: "cache-key"
// localStorage or in-memory depending on implementation
// Adjust CACHE_TTL in src/constants/index.ts
```

### Issue: Linter errors

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### Issue: Bundle too large

```bash
# Analyze bundle
npm run analyze

# Check for:
# - Duplicate dependencies
# - Large imports (use dynamic imports)
# - Unused code
```

---

## Submitting Changes

### Pull Request Process

1. **Update your fork**

   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow the coding standards
   - Test your changes locally

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template (if available)
   - Describe your changes clearly
   - Link any related issues

### PR Guidelines

- Keep PRs focused on a single feature or fix
- Include a clear description of changes
- Reference related issues
- Ensure all checks pass
- Respond to review feedback promptly
- Be open to suggestions and improvements

### Review Process

- Maintainers will review your PR
- Address any requested changes
- Once approved, your PR will be merged
- Your contribution will be acknowledged in the release notes

---

## Resources

### External Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [date-fns Docs](https://date-fns.org/)

---

## Questions?

If you have questions or need help:

1. Check existing documentation
2. Search for similar issues
3. Open a new issue with the "question" label
4. Contact the maintainer via [website](https://tahayparker.vercel.app/contact)

## License

By contributing to vacansee-au, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to vacansee-au! Your efforts help make finding available rooms easier for everyone. 🎓

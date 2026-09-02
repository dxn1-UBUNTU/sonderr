---
name: accessibility
description: Accessibility (a11y) patterns and WCAG compliance. Covers semantic HTML, ARIA attributes, keyboard navigation, screen reader support, and testing. Use for building inclusive interfaces.
---

# Accessibility Mastery

## WCAG Principles (POUR)

```
Perceivable   — Information must be presentable to users in ways they can perceive
Operable      — UI components must be operable by all users
Understandable — Information and UI operation must be understandable
Robust        — Content must be robust enough for various assistive technologies
```

## Semantic HTML

```typescript
// Good: Semantic elements
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
<main>
  <article>
    <header><h1>Article Title</h1></header>
    <section aria-labelledby="section-heading">
      <h2 id="section-heading">Section</h2>
      <p>Content...</p>
    </section>
  </article>
  <aside aria-label="Related content">...</aside>
</main>
<footer>...</footer>

// Bad: Div soup
<div className="nav">
  <div className="link" onClick={goHome}>Home</div>
</div>
```

## ARIA Attributes

```typescript
// When HTML semantics aren't enough
<div role="alert" aria-live="assertive">
  {error && <p>{error}</p>}
</div>

// Custom button
<div
  role="button"
  tabIndex={0}
  aria-pressed={isPressed}
  aria-label="Toggle dark mode"
  onClick={toggle}
  onKeyDown={(e) => e.key === "Enter" && toggle()}
>
  {isPressed ? "On" : "Off"}
</div>

// Dialog/Modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-desc">Are you sure you want to delete this item?</p>
</div>

// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {`${results.length} results found`}
</div>
```

## Keyboard Navigation

```typescript
// Focus management
function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement
      modalRef.current?.focus()
      document.body.style.overflow = "hidden"
    }
    return () => {
      previousFocus.current?.focus()
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Trap focus inside modal
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose()
    if (e.key === "Tab") {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}

// Skip navigation link
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
  Skip to main content
</a>
```

## Screen Reader Support

```typescript
// Visually hidden text for screen readers
<span className="sr-only">
  {count} items in cart
</span>

// Accessible icon buttons
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

// Accessible form labels
<label htmlFor="email">Email address</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && <span id="email-error" role="alert">{errors.email}</span>}

// Accessible data tables
<table aria-label="User list">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Email</th>
      <th scope="col">Role</th>
    </tr>
  </thead>
  <tbody>
    {users.map((user) => (
      <tr key={user.id}>
        <td>{user.name}</td>
        <td>{user.email}</td>
        <td>{user.role}</td>
      </tr>
    ))}
  </tbody>
</table>
```

## Color & Contrast

```
WCAG AA Requirements:
  — Normal text: 4.5:1 contrast ratio
  — Large text (18px+): 3:1 contrast ratio
  — UI components: 3:1 contrast ratio

WCAG AAA Requirements:
  — Normal text: 7:1 contrast ratio
  — Large text: 4.5:1 contrast ratio

Tools:
  — WebAIM Contrast Checker
  — axe DevTools
  — Lighthouse Accessibility Audit
```

## Focus Indicators

```css
/* Never remove focus indicators without replacing them */
:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Or use a visible ring */
:focus-visible {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

/* Don't do this */
/* outline: none; ← removes focus indicator with no replacement */
```

## Testing

```typescript
// Testing Library queries (prefer accessible queries)
import { render, screen } from "@testing-library/react"

// Best: Query by role
const button = screen.getByRole("button", { name: /submit/i })

// Good: Query by label
const input = screen.getByLabelText(/email address/i)

// Avoid: Query by test ID (last resort)
const element = screen.getByTestId("my-component")

// axe-core automated testing
import { toHaveNoViolations } from "jest-axe"

const { container } = render(<MyComponent />)
const results = await axe(container)
expect(results).toHaveNoViolations()

// Manual testing checklist:
// 1. Navigate entire page using only Tab/Shift+Tab
// 2. Activate all interactive elements with Enter/Space
// 3. Test with screen reader (VoiceOver, NVDA, TalkBack)
// 4. Verify color contrast ratios
// 5. Test at 200% zoom
// 6. Test with reduced motion enabled
```

## Reduced Motion

```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
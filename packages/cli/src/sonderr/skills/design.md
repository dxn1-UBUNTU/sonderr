---
name: design
description: Comprehensive UI/UX design guide for building polished, accessible, production-quality interfaces. Use when building frontend components, pages, forms, or any user-facing feature. Covers layout, spacing, typography, color, interaction states, accessibility, responsive design, and quality checklists.
---

# Design Skill — Production-Quality UI/UX

This skill transforms you from a code generator into a design-conscious engineer. Every user-facing element you build must be polished, accessible, and production-ready — not a skeleton, not a prototype, but something you'd ship to real users.

## The Design-First Mindset

Before writing any UI code, answer these questions:

1. **What is the user trying to accomplish?** Design for the goal, not the feature.
2. **What are the states?** Loading, empty, error, success, disabled, hover, focus, active — every state needs design.
3. **What can go wrong?** Network failure, invalid input, permissions, edge cases — design for failure gracefully.
4. **Who is using this?** Keyboard users, screen readers, mobile users, users with slow connections — design for everyone.
5. **What already exists?** Match the project's design system before inventing a new one.

## Visual Hierarchy

Strong hierarchy guides the user's eye to what matters most:

- **Size**: Important elements are larger. Headlines > body > captions. Use a type scale (e.g., 12, 14, 16, 20, 24, 32, 40, 48).
- **Weight**: Use font weight strategically. Bold for emphasis, regular for body, light for secondary.
- **Color**: High contrast for primary actions, muted for secondary, lowest for disabled/tertiary.
- **Spacing**: More space around important elements. Group related items (proximity). Use consistent spacing units (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).
- **Depth**: Use shadows, borders, or background color to create layers. Modals above content, cards above backgrounds.

## Spacing and Layout

Consistent spacing is the difference between polished and amateur:

- Use a **4px or 8px grid** for all spacing decisions. Every margin, padding, and gap should be a multiple of your base unit.
- **Vertical rhythm**: Maintain consistent vertical spacing between sections. Don't mix 16px and 20px gaps arbitrarily.
- **Content width**: Body text max ~70ch (readable line length). Forms max ~640px. Full-width layouts need clear content zones.
- **Whitespace is a feature**: Empty space gives content room to breathe. Cramped UI feels overwhelming.
- **Alignment**: Pick an axis (usually left or center) and stick to it. Avoid mixing alignment within a section.

## Typography

Typography carries 90% of your UI's personality:

- **Type scale**: Use a consistent scale. Don't invent arbitrary sizes. Common: 12, 14, 16, 20, 24, 32, 40, 48.
- **Line height**: Body text ~1.5, headings ~1.2, UI labels ~1.0.
- **Font weight**: 400 (regular) for body, 500-600 (medium/semibold) for UI, 700 (bold) for emphasis only.
- **Letter spacing**: Tighten headlines slightly (-0.02em), keep body normal, widen small caps/labels (+0.05em).
- **Contrast ratio**: Minimum 4.5:1 for body text, 3:1 for large text (WCAG AA). Use a contrast checker.
- **Font stack**: Use system fonts or the project's existing font. Don't add new fonts without asking.

## Color

Color should communicate, not decorate:

- **Semantic colors**: Primary (brand/action), Success, Warning, Error, Info, Neutral (text/borders/backgrounds).
- **Don't rely on color alone**: Always pair color with an icon, label, or pattern for colorblind users.
- **Dark mode**: If the project supports dark mode, test your colors in both themes. Colors that work in light mode often fail in dark mode.
- **Opacity**: Use opacity for disabled states, overlays, and depth — not as a substitute for a proper color palette.
- **Consistency**: Use the project's CSS variables/tokens. Never hardcode colors that already exist as tokens.

## Interaction States

Every interactive element needs these states:

| State | What it communicates | How to show it |
|---|---|---|
| Default | "I'm available" | Normal appearance |
| Hover | "You can interact" | Slight elevation, color change, underline |
| Focus | "You're here" | Visible focus ring (2px outline, offset) |
| Active/Pressed | "I'm being clicked" | Slight scale down, darker shade |
| Disabled | "Not available right now" | Reduced opacity (~0.5), no pointer events |
| Loading | "Working on it" | Spinner/skeleton, disabled input |
| Error | "Something went wrong" | Red border, error message, icon |
| Success | "It worked" | Green checkmark, success message |

**Critical**: Focus states are not optional. Keyboard users navigate via focus. Always provide a visible focus indicator.

## Accessibility (a11y)

Accessibility is not a feature — it's a requirement:

- **Semantic HTML**: Use the right element for the job. `<button>` for actions, `<a>` for navigation, `<input>` for input, `<nav>` for navigation, `<main>` for main content.
- **Labels**: Every form control needs a `<label>`. Every icon button needs `aria-label`. Every image needs `alt` text (or `alt=""` if decorative).
- **Keyboard navigation**: All interactive elements must be reachable via Tab and activatable via Enter/Space. Tab order must be logical.
- **Focus management**: After modal opens, trap focus inside. After modal closes, return focus to the trigger.
- **ARIA**: Use ARIA roles and properties when HTML semantics aren't enough. But prefer native HTML — it's more reliable.
- **Screen reader text**: Use `.sr-only` or `visually-hidden` for text that should be read but not seen.
- **Reduced motion**: Respect `prefers-reduced-motion`. Disable animations for users who opt out.
- **Touch targets**: Minimum 44x44px for touch interfaces. Don't make tiny click targets.

## Responsive Design

Design for the device, not just the desktop:

- **Mobile first**: Design for small screens first, then enhance for larger ones. It's easier to add complexity than to remove it.
- **Breakpoints**: Use the project's existing breakpoints. Common: 640px (sm), 768px (md), 1024px (lg), 1280px (xl).
- **Fluid sizing**: Use `clamp()`, `%`, `vw`, `fr`, and `auto` for fluid layouts. Reserve fixed pixels for borders and shadows.
- **Content reflow**: Content should reflow naturally. Don't design layouts that break at certain widths.
- **Images**: Use `max-width: 100%` and `height: auto`. Provide `srcset` for responsive images.
- **Tables**: On small screens, either scroll horizontally, stack into cards, or hide non-essential columns.

## Forms

Forms are where users spend the most time — get them right:

- **Label placement**: Top-aligned labels are fastest to scan. Left-aligned work for short forms. Placeholder text is NOT a label.
- **Input sizing**: Size inputs to expected content. A zip code field shouldn't be full-width.
- **Helper text**: Below the input, explain format requirements ("MM/DD/YYYY") or why you need the data.
- **Error placement**: Show errors next to the field that has the error, not in a generic banner.
- **Error specificity**: "Invalid email" → "Please enter a valid email address (e.g., name@example.com)".
- **Required vs optional**: Mark required fields with `*` or "(required)". Don't mark all fields required when most are optional.
- **Submit button**: Primary, full-width on mobile, with loading state. Disable while submitting to prevent double-submit.
- **Autocomplete**: Use `autocomplete` attributes for common fields (email, name, address). Helps password managers and accessibility.

## Loading States

Never leave the user wondering what's happening:

- **Skeleton screens**: Show the shape of content while loading (better perceived performance than spinners).
- **Spinners**: Use for short, indeterminate operations (< 2 seconds).
- **Progress bars**: Use for operations with known duration (uploads, installations).
- **Staged loading**: Show text first, then images. Don't block the whole page for one slow element.
- **Optimistic UI**: Update the UI immediately, roll back on failure. Makes the app feel instant.

## Empty States

Empty states are opportunities, not dead ends:

- **Explain why it's empty**: "No messages yet" is better than just showing nothing.
- **Provide a next step**: "Send your first message" with a button.
- **Use illustration or icon**: A visual element makes the empty state feel intentional, not broken.
- **Avoid dead ends**: Every empty state should have a clear path forward.

## Error States

How you handle errors defines the user experience:

- **Be specific**: "Network error" → "Couldn't connect to the server. Check your connection and try again."
- **Be helpful**: Tell the user what to do next. "Try again", "Go back", "Contact support".
- **Be human**: Don't blame the user. "Something went wrong" not "You did something wrong".
- **Preserve input**: When a form fails, keep the user's input. Don't make them re-type everything.
- **Log details**: Show a user-friendly message, but log the technical details for debugging.

## Animation and Motion

Motion communicates relationship and hierarchy:

- **Purpose**: Every animation should serve a purpose — guide attention, show causality, provide feedback.
- **Duration**: Micro-interactions 150-300ms, transitions 200-500ms, complex animations 300-500ms.
- **Easing**: Use `ease-out` for entering, `ease-in` for exiting, `ease-in-out` for moving between states.
- **Performance**: Animate `transform` and `opacity` only. Never animate `width`, `height`, `top`, `left` (triggers layout).
- **Reduced motion**: Wrap animations in `@media (prefers-reduced-motion: reduce)` and disable them.

## Quality Checklist

Before declaring any UI work complete, verify:

### Visual
- [ ] Consistent spacing (4px/8px grid)
- [ ] Consistent type scale (no arbitrary sizes)
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Visible focus states on all interactive elements
- [ ] Proper visual hierarchy (what's most important stands out)
- [ ] No orphaned or misaligned elements
- [ ] Works in both light and dark mode (if applicable)

### Interaction
- [ ] All states designed (default, hover, focus, active, disabled, loading, error, success)
- [ ] Keyboard navigable (Tab order makes sense)
- [ ] Focus management correct (modals, dialogs)
- [ ] No dead-end empty states
- [ ] Error messages are specific and helpful
- [ ] Loading states for async operations
- [ ] Touch targets are large enough (44x44px minimum)

### Accessibility
- [ ] Semantic HTML used correctly
- [ ] All form inputs have labels
- [ ] All icon buttons have aria-label
- [ ] All images have alt text
- [ ] Color is not the only indicator
- [ ] Reduced motion respected
- [ ] Screen reader tested (or mentally walked through)

### Responsive
- [ ] Works at 320px (small phone)
- [ ] Works at 768px (tablet)
- [ ] Works at 1024px+ (desktop)
- [ ] No horizontal scroll on mobile
- [ ] Images scale properly
- [ ] Tables handle small screens

### Code Quality
- [ ] Uses existing design tokens/components (no duplication)
- [ ] No hardcoded colors/spacing (use tokens)
- [ ] Component is reusable (accepts props, not hardcoded values)
- [ ] Props have sensible defaults
- [ ] No unnecessary re-renders
- [ ] Clean, readable code with meaningful names

## Design Patterns

### Cards
- Use for grouping related content
- Consistent padding (16px or 24px)
- Subtle border or shadow
- Clear header/body/footer separation

### Modals/Dialogs
- Center on screen with overlay
- Close on Escape and overlay click
- Trap focus inside
- Return focus to trigger on close
- Max-width for readability (600-700px)

### Navigation
- Clear active state
- Logical hierarchy (primary vs secondary)
- Breadcrumbs for deep hierarchies
- Search for large collections

### Lists
- Clear row separation
- Hover state for clickable rows
- Empty state when no items
- Loading skeleton while fetching

### Buttons
- Primary: One per view (main action)
- Secondary: Alternative actions
- Tertiary/Link: Low-emphasis actions
- Destructive: Red, requires confirmation
- Size appropriately (sm for tables, md for forms, lg for CTAs)

## Common Mistakes to Avoid

1. **Inconsistent spacing**: Mixing 8px, 12px, 16px, 20px gaps randomly. Pick a scale and stick to it.
2. **Missing focus states**: Keyboard users are an afterthought. They shouldn't be.
3. **Placeholder-only labels**: Placeholders disappear when typing. Always use visible labels.
4. **Generic error messages**: "An error occurred" helps no one. Be specific.
5. **Dead-end empty states**: "No items" with no action. Always provide a next step.
6. **Ignoring loading states**: User clicks nothing happens. They click again. Now you have two requests.
7. **Color without contrast**: Light gray text on white background. If you can't read it easily, neither can your users.
8. **Tiny click targets**: Links and buttons too small to tap on mobile.
9. **Animation overload**: Everything bounces, fades, slides. Motion should be purposeful.
10. **Ignoring the design system**: Reinventing buttons, inputs, colors that already exist in the project.

## When Building UI

Follow this process:

1. **Understand**: What is the user trying to accomplish? What are the constraints?
2. **Research**: What does the project already have? Components, tokens, patterns?
3. **Structure**: HTML first. Semantic, accessible markup. No styling yet.
4. **Layout**: Spacing, grid, flexbox. Get the structure right before adding color.
5. **Visual**: Color, typography, imagery. Apply the design system.
6. **States**: Add hover, focus, active, disabled, loading, error, success.
7. **Responsive**: Test at every breakpoint. Fix issues.
8. **Accessibility**: Keyboard test, screen reader mental walkthrough, contrast check.
9. **Polish**: Animations, transitions, micro-interactions. The final 10% that makes it feel premium.
10. **Verify**: Run the quality checklist above. Fix anything missing.

Remember: The user is trusting you with their UI. Every pixel, every interaction, every state matters. Ship work you're proud of.
# ForgeTrack Codebase Issues

## Critical
- **API Key Exposed** - `.env.local` contains `VITE_GEMINI_API_KEY` which is visible in browser network tab

## High
- **AuthContext Cache Bug** (`src/contexts/AuthContext.jsx:27`) - `userProfile` check uses stale state value, caching never activates
- **Timezone Bug** (`src/pages/Dashboard.jsx:25`) - `new Date().toISOString()` returns UTC date, not local

## Medium
- **No Transaction Safety** (`src/pages/UploadCSV.jsx:226-233`) - Batch inserts can leave partial data on failure
- **Missing Input Validation** - No date bounds check on CSV import, no URL validation on materials
- **Raw Error Messages** - Supabase/Gemini errors leak to users

## Low
- **Case-Sensitive Attendance** (`src/pages/UploadCSV.jsx:201`) - Doesn't handle uppercase 'P'
- **Hardcoded Date Threshold** (`schema.sql:122`) - Program start date hardcoded as '2025-08-04'

---

## UI Issues - Upload Feature (vs Design System)

### Buttons
- **Wrong accent color** - Uses `bg-[#E8C547]` (gold) instead of design system primary button (white on dark). Design spec §8.3 says primary button should have `background: var(--text-primary)` with `color: var(--text-inverse)`
- **No hover state defined** - Button hover should lighten to `#E5E5E7` per spec §8.3

### Colors
- **Hardcoded gold accent** - `#E8C547` is not in the design system color tokens. The spec uses indigo (`#6366F1`) as accent-glow
- **Inconsistent surface colors** - Mix of `#111118`, `#0A0A0F`, `#161622` instead of CSS variables (`var(--bg-surface)`, `var(--bg-surface-inset)`, `var(--bg-surface-raised)`)

### Typography
- **Hero text** - Uses `text-2xl font-bold text-white` instead of design system `text-display-hero` or `text-h1`
- **Body text** - Uses plain `text-white`, `text-gray-400` instead of `text-primary`, `text-secondary`, `text-tertiary`

### Cards
- **Missing card-gradient** - Cards don't have the `background-image: var(--card-gradient)` overlay specified in spec §8
- **Missing shadow-card** - No `box-shadow: var(--shadow-card)` for the glass effect with subtle border

### Inputs
- **Hardcoded colors** - Uses direct hex values instead of design system input tokens
- **Missing focus ring** - Focus state doesn't use `box-shadow: var(--shadow-focus)` with accent-glow

### Status Pills
- **Custom badge styles** - Green/red pills (lines 478-480, 505-506) don't use design system `.pill-success`, `.pill-danger` classes

### Step Indicator
- **Missing step indicator** - Spec §11.5 requires "4 numbered circles with connecting lines" showing current step. UploadCSV only shows a title, not the step indicator

### Tables
- **Missing design system table styles** - Table doesn't use spec §8.6 table styling with proper padding, borders, hover states

### General
- **No cosmic glow** - The upload area doesn't have the radial glow effect that should appear once per page
- **Inconsistent border colors** - Uses `border-gray-700`, `border-gray-600` instead of `var(--border-subtle)` or `var(--border-default)`
- **No mobile-responsive checks** - Fixed widths like `max-w-6xl` without checking 375px mobile view
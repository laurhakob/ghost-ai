# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In Progress

## Current Goal

- Feature spec 03 - Auth

## Completed

- Boilerplate cleanup (globals.css, page.tsx, removed SVGs)
- lucide-react installed
- lib/utils.ts with cn() helper created
- shadcn/ui configured (components.json, radix-nova style)
- All shadcn components added: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea
- Feature spec 01 (design system) complete
- Feature spec 02 (editor): components/editor/editor-navbar.tsx and
  components/editor/project-sidebar.tsx created; dialog pattern ready for
  future use
- Feature spec 03 (auth): Clerk provider, sign-in/sign-up pages, proxy.ts
  route protection, `/` redirect logic, UserButton in editor navbar
- Feature spec 04 (project dialogs): editor home screen (EditorHome), Create/
  Rename/Delete dialogs (ProjectDialogs), useProjectDialogs hook, sidebar
  project items with owner-only rename/delete actions, mobile backdrop scrim,
  live slug preview. Mock data (lib/projects.ts) only, no persistence.

## In Progress

- None

## Next Up

- Feature specs 05+

## Open Questions

- None

## Architecture Decisions

- Using shadcn/ui with radix-nova style and neutral base color
- CSS variables approach for theming (dark/light via .dark class)

## Session Notes

- shadcn is installed as a direct dependency (not devDependency)
- components.json uses radix-nova style with Tailwind v4 + CSS variables
- Do not modify generated components/ui/* files after installation

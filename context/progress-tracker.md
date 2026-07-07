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
- Feature spec 05 (prisma): Project + ProjectCollaborator models in
  prisma/models/project.prisma (multi-file schema; prisma.config schema now
  points at the prisma/ folder), ProjectStatus enum (DRAFT/ARCHIVED),
  lib/prisma.ts cached singleton branching on DATABASE_URL (prisma+postgres://
  -> Accelerate, else @prisma/adapter-pg), first migration
  20260706085933_init applied, client generated. `npm run build` passes.
- Feature spec 06 (project APIs): backend REST route handlers —
  app/api/projects/route.ts (GET list current user's projects ordered by
  createdAt desc; POST create, name defaults to "Untitled Project", cuid id)
  and app/api/projects/[projectId]/route.ts (PATCH rename, DELETE). Clerk
  userId as ownerId; 401 when unauthenticated, 404 when missing, 403 for
  non-owner mutations. Backend-only, UI not wired. `npm run build` passes.

- Feature spec 07 (wire editor home): app/editor/page.tsx is now an async
  server component fetching owned + shared projects via lib/projects-data.ts
  (getOwnedProjects/getSharedProjects) and passing both to EditorShell (client)
  → sidebar; no client fetch on initial load. hooks/use-project-actions.ts
  manages dialog state + mutations: create builds a room ID (slug + short
  suffix via buildRoomId/generateRoomSuffix) sent as the project id so id and
  room ID stay aligned, then navigates to /editor/[id]; rename PATCHes +
  router.refresh(); delete redirects to /editor if deleting the active
  workspace else router.refresh(). Create dialog previews the room ID. POST
  /api/projects now accepts an optional explicit id. Old use-project-dialogs
  hook and mock project arrays removed. `npm run build` passes.

- Feature spec 08 (editor workspace shell): app/editor/[roomId]/page.tsx server
  component with access checks (redirect /sign-in when unauth; AccessDenied for
  missing/unauthorized). lib/project-access.ts (getCurrentIdentity +
  getAccessibleProject by owner/collaborator), components/editor/access-denied
  .tsx (lock icon, message, link to /editor), workspace-navbar (project name,
  Share + AI-sidebar toggle), workspace-shell composing the existing
  ProjectSidebar (current room highlighted via currentProjectId) + dark canvas
  placeholder + collapsible right AI sidebar placeholder. No canvas/Liveblocks/
  AI/share logic yet. `npm run build` passes; /editor/[roomId] registered.

- Feature spec 09 (share dialog): components/editor/share-dialog.tsx opened from
  the workspace navbar Share button (WorkspaceNavbar gained an onShare prop;
  WorkspaceShell owns the isShareOpen state and passes canManage={project.owned}).
  Owners can invite by email, see the collaborator list, remove collaborators,
  and copy the project link (/editor/[id]) with temporary "Copied!" feedback;
  collaborators get a read-only list (no invite/remove/copy). Backend:
  app/api/projects/[projectId]/collaborators/route.ts — GET (owner or
  collaborator may view; reports isOwner), POST (owner-only invite, idempotent
  upsert on the projectId_email unique, email validated + lowercased), DELETE
  (owner-only remove by email). lib/collaborators.ts enrichCollaborators() uses
  clerkClient().users.getUserList({ emailAddress }) to add name + avatar,
  falling back to email-only when no Clerk user matches or the lookup throws. No
  local user table added. `npm run build` passes; collaborators route
  registered.

## In Progress

- None

## Next Up

- Feature specs 10+

## Open Questions

- None

## Architecture Decisions

- Using shadcn/ui with radix-nova style and neutral base color
- CSS variables approach for theming (dark/light via .dark class)

## Session Notes

- shadcn is installed as a direct dependency (not devDependency)
- components.json uses radix-nova style with Tailwind v4 + CSS variables
- Do not modify generated components/ui/* files after installation

"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react/suspense"

/** Maximum number of collaborator avatars shown before overflowing to +N. */
const MAX_VISIBLE = 5

/** Fallback color used if a participant somehow has no presence color. */
const FALLBACK_COLOR = "#64B5F6"

/**
 * The participant group shown in the top-right of the editor canvas. Renders
 * the other collaborators as a compact avatar stack and the current user via
 * the existing Clerk `UserButton`. Only mounted inside the canvas room view —
 * the shared navbar is left untouched.
 */
export function PresenceAvatars() {
  const { user } = useUser()
  const others = useOthers()

  // Exclude the current user (e.g. duplicate tabs / sessions) by Clerk ID so
  // they are only ever represented by their own UserButton.
  const collaborators = others.filter(
    (other) => other.id && other.id !== user?.id,
  )

  const visible = collaborators.slice(0, MAX_VISIBLE)
  const overflow = collaborators.length - visible.length
  const hasCollaborators = collaborators.length > 0

  return (
    // Wrapper is non-interactive so it never blocks the canvas beneath it;
    // only the UserButton opts back into pointer events.
    <div className="pointer-events-none absolute right-4 top-4 z-30 flex items-center gap-2">
      {hasCollaborators && (
        <div className="flex items-center -space-x-2">
          {visible.map((other) => (
            <CollaboratorAvatar
              key={other.connectionId}
              name={other.info?.name}
              avatar={other.info?.avatar}
              color={other.info?.color}
            />
          ))}
          {overflow > 0 && <OverflowChip count={overflow} />}
        </div>
      )}

      {/* Divider only when at least one collaborator is present. */}
      {hasCollaborators && <div className="h-6 w-px bg-white/20" />}

      <div className="pointer-events-auto">
        <UserButton
          appearance={{
            elements: { userButtonAvatarBox: "h-8 w-8" },
          }}
        />
      </div>
    </div>
  )
}

interface CollaboratorAvatarProps {
  name?: string
  avatar?: string
  color?: string
}

/**
 * A display-only collaborator avatar: profile photo when available, initials
 * otherwise, sized to match the Clerk UserButton and ringed so it stays
 * readable on the dark canvas.
 */
function CollaboratorAvatar({ name, avatar, color }: CollaboratorAvatarProps) {
  const label = name?.trim() || "Anonymous"

  return (
    <div
      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-medium text-white ring-2 ring-neutral-900"
      style={{ backgroundColor: color ?? FALLBACK_COLOR }}
      title={label}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={label}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span>{getInitials(label)}</span>
      )}
    </div>
  )
}

/** The +N chip shown when there are more collaborators than fit in the stack. */
function OverflowChip({ count }: { count: number }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-xs font-medium text-white ring-2 ring-neutral-900">
      +{count}
    </div>
  )
}

/** Up to two initials derived from a display name. */
function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

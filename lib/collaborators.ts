import { clerkClient } from "@clerk/nextjs/server"

/**
 * A project collaborator, stored by email in the database and optionally
 * enriched with Clerk profile data. When no Clerk user matches the email,
 * `name` and `imageUrl` fall back to `null` and the email is shown alone.
 */
export interface Collaborator {
  email: string
  name: string | null
  imageUrl: string | null
}

/**
 * Enrich a list of collaborator emails with Clerk display data (name +
 * avatar) via the Clerk Backend API. Emails without a matching Clerk user
 * are returned as email-only entries. The result preserves input order.
 */
export async function enrichCollaborators(
  emails: string[]
): Promise<Collaborator[]> {
  if (emails.length === 0) return []

  const byEmail = new Map<
    string,
    { name: string | null; imageUrl: string | null }
  >()

  try {
    const client = await clerkClient()
    // Clerk accepts up to 100 email addresses per lookup.
    const { data: users } = await client.users.getUserList({
      emailAddress: emails.slice(0, 100),
      limit: 100,
    })

    for (const user of users) {
      const name = user.fullName?.trim() || null
      for (const address of user.emailAddresses) {
        byEmail.set(address.emailAddress.toLowerCase(), {
          name,
          imageUrl: user.imageUrl ?? null,
        })
      }
    }
  } catch {
    // If the Clerk lookup fails, degrade gracefully to email-only entries.
  }

  return emails.map((email) => {
    const match = byEmail.get(email.toLowerCase())
    return {
      email,
      name: match?.name ?? null,
      imageUrl: match?.imageUrl ?? null,
    }
  })
}

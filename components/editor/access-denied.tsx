import Link from "next/link"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"

export function AccessDenied() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-lg font-medium text-foreground">
          Access denied
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don&apos;t have access to this project, or it doesn&apos;t exist.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/editor">Back to projects</Link>
      </Button>
    </div>
  )
}

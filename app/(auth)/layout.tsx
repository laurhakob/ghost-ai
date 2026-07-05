import { Workflow, Share2, FileText } from "lucide-react";

const features = [
  {
    icon: Workflow,
    title: "AI Architecture Generation",
    description: "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
  },
];

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full">
      <div
        className="relative hidden w-1/2 flex-col overflow-hidden border-r border-border px-16 py-12 lg:flex"
        style={{
          background:
            "radial-gradient(130% 110% at 0% 0%, color-mix(in oklch, var(--primary) 16%, var(--background)) 0%, var(--background) 55%)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            G
          </span>
          <span className="text-lg font-semibold text-foreground">Ghost AI</span>
        </div>

        <div className="my-auto max-w-md">
          <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight text-foreground">
            Design systems at the speed of thought.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Describe your architecture in plain English. Ghost AI maps it to a
            shared canvas your whole team can refine in real time.
          </p>

          <ul className="mt-12 space-y-7">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--primary)_14%,transparent)] text-primary">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center px-6 lg:w-1/2">
        {children}
      </div>
    </div>
  );
}

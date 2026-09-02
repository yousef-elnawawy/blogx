/**
 * Layout override for the individual conversation page.
 *
 * The global (main) layout wraps every page in:
 *   div.min-h-screen.pb-16 → PageTransition(motion.div) → {children}
 *
 * That outer wrapper prevents the conversation page from being a true
 * full-viewport flex column (its h-screen / max-h-[100dvh] competes with
 * the unconstrained parent height). This nested layout renders children
 * directly so the conversation page can size itself correctly.
 */
export default function ConversationDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render children directly — the page manages its own full-screen layout.
  return <>{children}</>;
}

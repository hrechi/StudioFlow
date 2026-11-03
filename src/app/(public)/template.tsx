/** Re-mounted on every public navigation: soft fade-in between pages. */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex flex-1 flex-col">{children}</div>;
}

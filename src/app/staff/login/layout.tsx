// Override the parent /staff layout so the login page has no sidebar
export default function StaffLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

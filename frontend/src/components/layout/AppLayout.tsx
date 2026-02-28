import type { ReactNode } from "react";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Контент под навбаром */}
      <main className="pt-14">{children}</main>
    </div>
  );
}

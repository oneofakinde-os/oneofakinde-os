"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function MobileNavToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close nav on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        className="mobile-nav-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "close navigation" : "open navigation"}
        aria-expanded={open}
      >
        <span className={`hamburger-bar ${open ? "hamburger-open" : ""}`} />
        <span className={`hamburger-bar ${open ? "hamburger-open" : ""}`} />
        <span className={`hamburger-bar ${open ? "hamburger-open" : ""}`} />
      </button>
      {open && (
        <div className="mobile-nav-backdrop" onClick={() => setOpen(false)} />
      )}
      <div className={`mobile-nav-drawer ${open ? "mobile-nav-drawer-open" : ""}`}>
        {children}
      </div>
    </>
  );
}

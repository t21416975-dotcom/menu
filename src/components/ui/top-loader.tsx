"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopLoader({
  color = "var(--primary, #ea580c)",
  height = 3,
}: {
  color?: string;
  height?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function start() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsVisible(true);
    setProgress(20);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) clearInterval(timerRef.current);
          return prev;
        }
        return prev + (prev < 50 ? 12 : 4);
      });
    }, 150);
  }

  function done() {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setProgress(0), 200);
    }, 250);
  }

  // When pathname or search params change, complete the bar
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      done();
    });
    return () => cancelAnimationFrame(handle);
  }, [pathname, searchParams]);

  // Intercept internal link clicks
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, downloads, new tabs, anchor jumps, mailto, tel
      if (
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("https://wa.me") ||
        href.startsWith("http://") ||
        href.startsWith("https://")
      ) {
        return;
      }

      // If clicking same path with same search params, ignore
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (href === currentUrl || href === window.location.pathname) {
        return;
      }

      start();
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[99999]"
      style={{ height: `${height}px` }}
    >
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
          opacity: isVisible || progress > 0 ? 1 : 0,
          boxShadow: `0 0 10px ${color}, 0 0 5px ${color}`,
        }}
      />
    </div>
  );
}

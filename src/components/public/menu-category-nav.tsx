"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function MenuCategoryNav({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(`category-${category.id}`))
      .filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) {
          const nextId = visible[0].target.id.replace("category-", "");
          setActiveId((prev) => (prev !== nextId ? nextId : prev));
        }
      },
      { rootMargin: "-140px 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  function scrollTo(id: string) {
    const element = document.getElementById(`category-${id}`);
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div
      className="sticky top-0 z-20 border-b backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in srgb, var(--menu-background) 88%, transparent)",
        borderColor: "color-mix(in srgb, var(--menu-foreground) 8%, transparent)",
      }}
    >
      <nav className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const isActive = activeId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => scrollTo(category.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              )}
              style={
                isActive
                  ? {
                      backgroundColor: "var(--menu-primary)",
                      color: "var(--menu-on-primary)",
                    }
                  : {
                      backgroundColor: "var(--menu-muted)",
                      color: "var(--menu-foreground)",
                    }
              }
            >
              {category.name}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical, type LucideIcon } from "lucide-react";
import { cn } from "@/utils";

export type RowAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone?: "default" | "danger" | "success";
  onSelect: () => void;
};

const MENU_WIDTH = 224;

const TONE = {
  default: "text-tertiary hover:bg-tertiary/5",
  success: "text-green-700 hover:bg-green-500/8",
  danger: "text-primary hover:bg-primary/6",
};

type RowActionsMenuProps = { label: string; actions: RowAction[] };

// Rendered in a portal so the table's horizontal scroll can't clip it.
const RowActionsMenu = ({ label, actions }: RowActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const height = actions.length * 40 + 12;
    const above = rect.bottom + height + 8 > window.innerHeight && rect.top > height;
    setPosition({ top: above ? rect.top - height - 6 : rect.bottom + 6, left: Math.max(8, rect.right - MENU_WIDTH), above });
  }, [isOpen, actions.length]);

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const close = (event: Event) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const dismiss = () => setIsOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [isOpen]);

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape" || event.key === "Tab") {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(at + step + items.length) % items.length]?.focus();
    }
  };

  if (actions.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex size-9 items-center justify-center rounded-full text-tertiary/60 transition-all hover:bg-secondary hover:text-tertiary hover:shadow-md",
          isOpen && "bg-secondary text-tertiary shadow-md",
        )}
      >
        <EllipsisVertical aria-hidden="true" className="size-4" />
      </button>
      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className={cn(
              "fixed z-50 rounded-xl border border-tertiary/8 bg-secondary p-1.5 shadow-2xl shadow-tertiary/20 animate-[fade-up_0.15s_ease-out_both] motion-reduce:animate-none",
              position.above ? "origin-bottom-right" : "origin-top-right",
            )}
          >
            {actions.map((action, index) => {
              const Icon = action.icon;
              const tone = action.tone ?? "default";
              return (
                <div key={action.key}>
                  {tone === "danger" && index > 0 && <div className="mx-2 my-1 h-px bg-tertiary/8" />}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOpen(false);
                      action.onSelect();
                    }}
                    className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:bg-tertiary/6", TONE[tone])}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0 opacity-75" />
                    {action.label}
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

export default RowActionsMenu;

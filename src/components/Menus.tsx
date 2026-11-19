import React from "react";
import "../styles/menu.css";

export interface MenuItemSpec {
  kind?: "item";
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  checked?: boolean;
  disabled?: boolean;
}

export interface MenuDivider {
  kind: "divider";
}

export type MenuEntry = MenuItemSpec | MenuDivider;

export interface MenuSpec {
  id: string;
  label: string;
  /** Regular items. If `content` is provided instead, it replaces items. */
  items?: MenuEntry[];
  /** Custom popover content (e.g. the View menu's segmented control). */
  content?: React.ReactNode;
}

const supportsAnchor = () =>
  typeof CSS !== "undefined" && CSS.supports("position-area: block-end");
const supportsInvoker = () =>
  typeof HTMLButtonElement !== "undefined" &&
  "commandForElement" in HTMLButtonElement.prototype;
const supportsFocusgroup = () =>
  typeof HTMLElement !== "undefined" && "focusGroup" in HTMLElement.prototype;

/** Position a popover below its trigger via JS when anchor positioning is
 * unavailable (viewport-aware-dropdowns fallback). */
function positionFromTrigger(popover: HTMLElement, trigger: HTMLElement) {
  const style = popover.style;
  style.position = "fixed";
  style.inset = "auto";
  style.margin = "0";
  const rect = trigger.getBoundingClientRect();
  const popWidth = popover.offsetWidth;
  let left = rect.left;
  if (left + popWidth > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - popWidth - 8);
  }
  // Open downward; flip upward when it would overflow the viewport.
  const popHeight = popover.offsetHeight;
  if (rect.bottom + popHeight + 6 <= window.innerHeight) {
    style.top = `${rect.bottom + 6}px`;
  } else {
    style.top = `${Math.max(8, rect.top - popHeight - 6)}px`;
  }
  style.left = `${left}px`;
}

/**
 * Application menu bar (File / View / Tools…) built on the native Popover API
 * following the `app-menus` guide:
 * - one Tab stop with a roving tabindex across triggers,
 * - preview-on-focus, ArrowLeft/Right menu switching, ArrowDown entry,
 * - hover switches menus while one is open,
 * - focusgroup arrow-key navigation with a JS fallback,
 * - invoker `commandfor` toggling with a JS fallback.
 */
export const Menubar: React.FC<{ menus: MenuSpec[]; label: string }> = ({ menus, label }) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const triggers = React.useMemo(
    () =>
      menus.map(menu => ({
        id: menu.id,
        el: () => rootRef.current?.querySelector<HTMLButtonElement>(`#${menu.id}-trigger`),
        pop: () => rootRef.current?.querySelector<HTMLElement>(`#${menu.id}-menu`),
      })),
    [menus]
  );

  const findTrigger = React.useCallback(
    (el: HTMLElement | null) => {
      let node = el;
      while (node && node !== rootRef.current) {
        if (node.matches("[data-menubar-trigger]")) return node as HTMLElement;
        node = node.parentElement;
      }
      return null;
    },
    []
  );

  const showMenu = React.useCallback((id: string, trigger: HTMLElement) => {
    const popover = rootRef.current?.querySelector<HTMLElement>(`#${id}-menu`);
    if (!popover) return;
    (popover as any).showPopover?.({ source: trigger });
  }, []);

  /** Close every open top-level menu, optionally focusing another trigger. */
  const closeAll = React.useCallback((focusEl?: HTMLElement) => {
    rootRef.current
      ?.querySelectorAll<HTMLElement>("[popover]:popover-open")
      .forEach(p => p.hidePopover());
    setOpenId(null);
    focusEl?.focus({ preventScroll: true });
  }, []);

  /** Move the roving tabindex and preview the target trigger's menu. */
  const moveToTrigger = React.useCallback(
    (from: HTMLElement, dir: 1 | -1) => {
      const list = triggers
        .map(t => t.el())
        .filter((el): el is HTMLButtonElement => !!el);
      const idx = list.indexOf(from as HTMLButtonElement);
      const next = list[(idx + dir + list.length) % list.length];
      if (!next) return;
      list.forEach(el => (el.tabIndex = el === next ? 0 : -1));
      rootRef.current
        ?.querySelectorAll<HTMLElement>("[popover]:popover-open")
        .forEach(p => p.hidePopover());
      next.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    },
    [triggers]
  );

  const itemsOf = (id: string) =>
    Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>(`#${id}-menu button:not([aria-disabled="true"])`) ?? []
    ).filter(el => (el.closest("[popover]") as HTMLElement)?.id === `${id}-menu`);

  // --- popover open/close bookkeeping + JS positioning fallback -----------
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onToggle = (e: Event) => {
      const popover = e.target as HTMLElement;
      if (!popover.matches("[popover]")) return;
      const id = popover.id.replace(/-menu$/, "");
      const trigger = root.querySelector<HTMLElement>(`#${id}-trigger`);
      if ((e as ToggleEvent).newState === "open") {
        setOpenId(id);
        trigger?.setAttribute("aria-expanded", "true");
        if (!supportsAnchor() && trigger) positionFromTrigger(popover, trigger);
      } else {
        if (popover.id === `${openId}-menu`) setOpenId(null);
        trigger?.setAttribute("aria-expanded", "false");
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const inBar = !!findTrigger(target);
      const inMenu = !!(target.closest("[popover]") && root.contains(target.closest("[popover]")));
      if (!inBar && !inMenu) closeAll();
    };

    root.addEventListener("toggle", onToggle, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      root.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [closeAll, findTrigger, openId]);

  // --- keyboard model -----------------------------------------------------
  const onBarKeyDown = (e: React.KeyboardEvent) => {
    const trigger = findTrigger(e.target as HTMLElement);
    const openMenu = openId
      ? rootRef.current?.querySelector<HTMLElement>(`#${openId}-menu`)
      : null;
    const inOpenMenu = !!(openMenu && openMenu.contains(e.target as Node));

    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const base = trigger ?? findTrigger(document.activeElement as HTMLElement);
      if (base) moveToTrigger(base, e.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeAll(trigger ?? undefined);
      return;
    }
    if (!trigger) return;
    const id = trigger.id.replace(/-trigger$/, "");

    if (e.key === "ArrowDown" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      if (trigger.getAttribute("aria-expanded") !== "true") showMenu(id, trigger);
      const items = itemsOf(id);
      const item =
        e.key === "End" ? items[items.length - 1] : items[0];
      requestAnimationFrame(() => item?.focus({ preventScroll: true }));
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && !supportsInvoker()) {
      e.preventDefault();
      showMenu(id, trigger);
    }
  };

  // --- pointer behaviors ----------------------------------------------------
  const onBarPointerOver = (e: React.PointerEvent) => {
    const trigger = findTrigger(e.target as HTMLElement);
    if (!trigger || !openId) return;
    const id = trigger.id.replace(/-trigger$/, "");
    if (id === openId) return;
    const list = triggers.map(t => t.el()).filter((el): el is HTMLButtonElement => !!el);
    list.forEach(el => (el.tabIndex = el === trigger ? 0 : -1));
    rootRef.current
      ?.querySelectorAll<HTMLElement>("[popover]:popover-open")
      .forEach(p => p.hidePopover());
    trigger.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  };

  const onTriggerClick = (id: string) => (e: React.MouseEvent) => {
    if (!supportsInvoker()) {
      e.preventDefault();
      const popover = rootRef.current?.querySelector<HTMLElement>(`#${id}-menu`);
      const trigger = e.currentTarget as HTMLElement;
      if (popover?.matches(":popover-open")) popover.hidePopover();
      else showMenu(id, trigger);
    }
  };

  // --- focusgroup fallback: arrow keys inside menus -------------------------
  React.useEffect(() => {
    if (supportsFocusgroup()) return;
    const root = rootRef.current;
    if (!root) return;

    const onMenuKeyDown = (e: KeyboardEvent) => {
      const popover = (e.target as HTMLElement).closest("[popover]") as HTMLElement | null;
      if (!popover || !root.contains(popover)) return;
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;

      const items = Array.from(
        popover.querySelectorAll<HTMLElement>(
          "button:not([aria-disabled='true']), [role='menuitem']:not([aria-disabled='true']), input"
        )
      ).filter(el => el.closest("[popover]") === popover);
      const current = items.indexOf(document.activeElement as HTMLElement);
      if (current < 0 && e.key !== "Home" && e.key !== "End") return;

      e.preventDefault();
      e.stopImmediatePropagation();
      const next =
        e.key === "Home"
          ? items[0]
          : e.key === "End"
            ? items[items.length - 1]
            : items[(current + (e.key === "ArrowUp" ? -1 : 1) + items.length) % items.length];
      next?.focus({ preventScroll: true });
    };

    root.addEventListener("keydown", onMenuKeyDown, true);
    return () => root.removeEventListener("keydown", onMenuKeyDown, true);
  }, []);

  return (
    <div
      ref={rootRef}
      className="menubar"
      role="menubar"
      aria-label={label}
      onKeyDown={onBarKeyDown}
      onPointerOver={onBarPointerOver}
    >
      {menus.map((menu, i) => (
        <React.Fragment key={menu.id}>
          <button
            id={`${menu.id}-trigger`}
            data-menubar-trigger
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded="false"
            tabIndex={i === 0 ? 0 : -1}
            {...(supportsInvoker()
              ? { commandfor: `${menu.id}-menu`, command: "toggle-popover" }
              : {})}
            className="menu-trigger"
            onClick={onTriggerClick(menu.id)}
            onFocus={e => {
              // Preview on focus only when the bar is already "active" (another
              // menu open), matching native menubar expectations on the web.
              if (openId && openId !== menu.id) {
                const list = triggers.map(t => t.el()).filter((el): el is HTMLButtonElement => !!el);
                list.forEach(el => (el.tabIndex = el === e.currentTarget ? 0 : -1));
                rootRef.current
                  ?.querySelectorAll<HTMLElement>("[popover]:popover-open")
                  .forEach(p => p.hidePopover());
                showMenu(menu.id, e.currentTarget);
              }
            }}
          >
            {menu.label}
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6.34317 7.75732L4.92896 9.17154L12 16.2426L19.0711 9.17157L17.6569 7.75735L12 13.4142L6.34317 7.75732Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <div
            id={`${menu.id}-menu`}
            className={`menu-popover${supportsAnchor() ? " anchored" : ""}`}
            popover="auto"
            style={
              supportsAnchor()
                ? ({
                    positionAnchor: `--${menu.id}-trigger`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <div {...{ focusgroup: "menu nomemory" }} aria-labelledby={`${menu.id}-trigger`}>
              {menu.content ??
                menu.items?.map((entry, idx) =>
                  entry.kind === "divider" ? (
                    <hr key={`hr-${idx}`} />
                  ) : (
                    <button
                      key={entry.label}
                      type="button"
                      className="menu-item"
                      aria-checked={entry.checked || undefined}
                      aria-disabled={entry.disabled || undefined}
                      onClick={() => {
                        entry.onClick?.();
                        rootRef.current
                          ?.querySelectorAll<HTMLElement>("[popover]:popover-open")
                          .forEach(p => p.hidePopover());
                      }}
                    >
                      {entry.icon && <span className="item-icon">{entry.icon}</span>}
                      {entry.label}
                    </button>
                  )
                )}
            </div>
          </div>
        </React.Fragment>
      ))}
      {/* anchor-name for each trigger (CSS anchor positioning) */}
      <style>{menus.map(m => `#${m.id}-trigger{anchor-name:--${m.id}-trigger}`).join("")}</style>
    </div>
  );
};

/**
 * Standalone dropdown menu button (no menubar behaviors) — used by the format
 * selector and the graph preferences button.
 */
export const MenuButton: React.FC<{
  id: string;
  label?: React.ReactNode;
  tip?: string;
  className?: string;
  children: React.ReactNode;
  align?: "start" | "end";
}> = ({ id, label, tip, className = "toolbar-btn", children, align = "start" }) => {
  const popRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState !== "open") return;
      if (supportsAnchor()) return;
      const trigger = triggerRef.current;
      if (trigger) positionFromTrigger(pop, trigger);
    };
    pop.addEventListener("toggle", onToggle);
    return () => pop.removeEventListener("toggle", onToggle);
  }, []);

  const onClick = (e: React.MouseEvent) => {
    if (!supportsInvoker()) {
      e.preventDefault();
      const pop = popRef.current;
      if (pop?.matches(":popover-open")) pop.hidePopover();
      else (pop as any).showPopover?.({ source: e.currentTarget as HTMLElement });
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="menu"
        className={className}
        data-tip={tip}
        onClick={onClick}
        {...(supportsInvoker()
          ? { commandfor: `${id}-menu`, command: "toggle-popover" }
          : {})}
      >
        {label}
      </button>
      <div
        ref={popRef}
        id={`${id}-menu`}
        className={`menu-popover${supportsAnchor() ? " anchored" : ""}`}
        popover="auto"
        style={
          {
            positionAnchor: `--${id}-trigger`,
            ...(align === "end" && supportsAnchor()
              ? { positionArea: "block-end span-inline-end" }
              : {}),
          } as React.CSSProperties
        }
      >
        <div
          {...{ focusgroup: "menu nomemory" }}
          aria-labelledby={`${id}-trigger`}
          onClick={e => {
            // Close after picking an item, as native menus do.
            if ((e.target as HTMLElement).closest("button.menu-item")) {
              popRef.current?.hidePopover();
            }
          }}
        >
          {children}
        </div>
      </div>
      <style>{`#${id}-trigger{anchor-name:--${id}-trigger}`}</style>
    </>
  );
};

"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/rbac";
import { endTutorialAction } from "../tutorial.actions";
import {
  tourForNotification,
  tourForRole,
  type Tour,
  type TourNotification,
  type TourStep,
  type TourTarget,
} from "../tutorial.tours";

/**
 * Guided tour engine (one per signed-in area, in its layout). A pointing hand glides to each
 * target and taps it; the rest of the page is dimmed and only the target can be clicked.
 *
 * - Main tour: while the account's setting is on (first login, or re-enabled in the profile).
 *   It switches itself off when finished or skipped (and on sign-out).
 * - Notification tours: an unread notification that needs an action starts a short tour to it,
 *   whatever the setting; each notification is guided once.
 */

/** Started from the profile switch: `window.dispatchEvent(new CustomEvent(TOUR_EVENT, …))`. */
export const TOUR_EVENT = "reframe:tour";
export type TourEventDetail = { action: "start" | "stop" };

type Running = { tour: Tour; index: number };
type Rect = { top: number; left: number; width: number; height: number };

const key = {
  running: (u: string) => `reframe:tour:running:${u}`, // sessionStorage: survives reloads
  done: (u: string) => `reframe:tour:done:${u}`, // sessionStorage: main tour seen this session
  guided: (u: string) => `reframe:tour:guided:${u}`, // localStorage: notifications already guided
};

function read<T>(storage: "session" | "local", k: string): T | null {
  try {
    const raw = (storage === "session" ? sessionStorage : localStorage).getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(storage: "session" | "local", k: string, value: unknown) {
  try {
    const s = storage === "session" ? sessionStorage : localStorage;
    if (value === null) s.removeItem(k);
    else s.setItem(k, JSON.stringify(value));
  } catch {
    // Private mode: the tour still works, it just doesn't remember.
  }
}

function pathMatches(path: string | undefined, pathname: string): boolean {
  if (!path) return true;
  const clean = (p: string) => p.split("?")[0].replace(/\/$/, "") || "/";
  if (path.endsWith("/*")) {
    const base = clean(path.slice(0, -2));
    return pathname.startsWith(`${base}/`);
  }
  return clean(path) === clean(pathname);
}

function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const s = getComputedStyle(el);
  return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
}

function findTarget(target: TourTarget | undefined): HTMLElement | null {
  if (!target) return null;
  for (const selector of target.selectors ?? []) {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (isVisible(el)) return el;
    }
  }
  if (target.text) {
    const needle = target.text.toLowerCase();
    for (const el of document.querySelectorAll<HTMLElement>("main button, main a, button, a")) {
      if (el.closest("[data-tour-ui]")) continue; // never our own buttons
      if (isVisible(el) && el.textContent?.toLowerCase().includes(needle)) return el;
    }
  }
  return null;
}

/** Comfortably visible: not under the header, not cut at the bottom. */
function onScreen(r: DOMRect): boolean {
  return (
    r.top >= 72 &&
    r.bottom <= window.innerHeight - 24 &&
    r.left >= 0 &&
    r.right <= window.innerWidth
  );
}

const PAD = 6; // space between the target and the highlight ring
const CARD_W = 352;

export function TutorialProvider({
  userId,
  role,
  enabled,
  notifications,
}: {
  userId: string;
  role: Role;
  /** The account's setting (true on the first login, or once re-enabled in the profile). */
  enabled: boolean;
  /** Unread notifications: those that need an action start a short tour. */
  notifications: TourNotification[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState<Running | null>(null);
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  /** The page the highlight belongs to; null = hidden (between pages, or no target). */
  const [shownOn, setShownOn] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [tapping, setTapping] = useState(false);
  const navigatedFor = useRef<string | null>(null);

  const mainTour = useMemo(() => tourForRole(role), [role]);
  const notificationTours = useMemo(
    () => notifications.map(tourForNotification).filter((t): t is Tour => t !== null),
    [notifications],
  );

  const step: TourStep | null = running ? running.tour.steps[running.index] : null;

  // ── Start / resume ─────────────────────────────────────────────────────────

  const nextNotificationTour = useCallback((): Tour | null => {
    const guided = new Set(read<string[]>("local", key.guided(userId)) ?? []);
    return notificationTours.find((t) => !guided.has(t.id)) ?? null;
  }, [notificationTours, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once, after hydration
    setMounted(true);
    const saved = read<{ tourId: string; index: number }>("session", key.running(userId));
    const done = read<boolean>("session", key.done(userId));
    if (saved?.tourId === "main" && enabled) {
      setRunning({ tour: mainTour, index: Math.min(saved.index, mainTour.steps.length - 1) });
      return;
    }
    const savedNotif = saved && notificationTours.find((t) => t.id === saved.tourId);
    if (savedNotif) {
      setRunning({ tour: savedNotif, index: Math.min(saved.index, savedNotif.steps.length - 1) });
      return;
    }
    if (enabled && !done) {
      setRunning({ tour: mainTour, index: 0 });
      return;
    }
    const notif = nextNotificationTour();
    if (notif) setRunning({ tour: notif, index: 0 });
    // Only on mount: later changes are handled by the profile switch and the end of a tour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remember where we are, so a reload or a full navigation resumes the same step.
  useEffect(() => {
    if (!mounted) return;
    write(
      "session",
      key.running(userId),
      running ? { tourId: running.tour.id, index: running.index } : null,
    );
  }, [mounted, running, userId]);

  // Profile switch: start again from the beginning, or stop.
  useEffect(() => {
    const onEvent = (event: Event) => {
      const { action } = (event as CustomEvent<TourEventDetail>).detail ?? {};
      if (action === "start") {
        write("session", key.done(userId), null);
        navigatedFor.current = null;
        setRunning({ tour: mainTour, index: 0 });
      } else if (action === "stop") {
        setRunning((r) => (r?.tour.id === "main" ? null : r));
      }
    };
    window.addEventListener(TOUR_EVENT, onEvent);
    return () => window.removeEventListener(TOUR_EVENT, onEvent);
  }, [mainTour, userId]);

  // ── Find the target of the current step (navigating to its page first) ────

  useEffect(() => {
    if (!step) return;
    // The previous highlight stays where it is while the next target is searched for, then
    // everything glides there (no flash back to a fully dimmed page between steps).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tracks an outside system (the DOM)
    setTargetEl(null);
    const stepKey = `${running?.tour.id}:${running?.index}`;
    if (!pathMatches(step.path, pathname)) {
      // Another page: the highlight fades out while it loads (it would sit on the wrong thing).
      setShownOn(null);
      if (step.path && !step.path.endsWith("/*") && navigatedFor.current !== stepKey) {
        navigatedFor.current = stepKey;
        router.push(step.path);
      }
      setSearching(true);
      return;
    }
    if (!step.target) {
      setSearching(false);
      setShownOn(null);
      return;
    }
    setSearching(true);
    let tries = 0;
    let previous = "";
    let scrolled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    // One straight glide per step: the highlight only moves once its target has reached its
    // final place. So: wait until the target stops moving (page loading), scroll it into view
    // only if it is off screen, wait for that scroll to end, THEN move there.
    const look = () => {
      const el = findTarget(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        const where = [r.top, r.left, r.width, r.height].map(Math.round).join("|");
        if (where !== previous && ++tries <= 45) {
          previous = where;
          return false;
        }
        if (!scrolled && !onScreen(r) && tries <= 45) {
          scrolled = true;
          previous = "";
          el.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "center",
            inline: "nearest",
          });
          return false;
        }
      } else if (++tries <= 30) return false;
      clearInterval(timer);
      setSearching(false);
      if (el) {
        setTargetEl(el);
        setShownOn(pathname);
      } else {
        setShownOn(null); // not on this page: the card explains it in the middle
      }
      return true;
    };
    if (!look()) timer = setInterval(look, 110);
    return () => clearInterval(timer);
  }, [step, pathname, router, running?.tour.id, running?.index, reduceMotion]);

  // Follow the target while it moves (scroll, resize, layout changes).
  useLayoutEffect(() => {
    if (!targetEl) return;
    let frame = 0;
    let last = "";
    const tick = () => {
      if (!targetEl.isConnected) return; // removed (page change): keep the last position
      const r = targetEl.getBoundingClientRect();
      const next = `${r.top}|${r.left}|${r.width}|${r.height}`;
      if (next !== last) {
        last = next;
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [targetEl]);

  // ── Moving through the tour ───────────────────────────────────────────────

  const finish = useCallback(() => {
    if (!running) return;
    if (running.tour.id === "main") {
      write("session", key.done(userId), true);
      void endTutorialAction(); // the setting switches itself off
    } else {
      const guided = new Set(read<string[]>("local", key.guided(userId)) ?? []);
      guided.add(running.tour.id);
      write("local", key.guided(userId), [...guided]);
    }
    setRunning(null);
    setTargetEl(null);
    setShownOn(null);
    // Another notification needs an action: guide it next, after a short pause.
    setTimeout(() => {
      const next = nextNotificationTour();
      if (next) setRunning({ tour: next, index: 0 });
    }, 900);
  }, [running, userId, nextNotificationTour]);

  const goTo = useCallback(
    (index: number) => {
      if (!running) return;
      navigatedFor.current = null;
      if (index >= running.tour.steps.length) finish();
      else setRunning({ tour: running.tour, index: Math.max(0, index) });
    },
    [running, finish],
  );

  const next = useCallback(() => {
    if (!running || !step) return;
    if (step.click && targetEl) {
      // The hand taps, then clicks for the user.
      setTapping(true);
      setTimeout(
        () => {
          setTapping(false);
          targetEl.click();
          goTo(running.index + 1);
        },
        reduceMotion ? 0 : 420,
      );
      return;
    }
    goTo(running.index + 1);
  }, [running, step, targetEl, goTo, reduceMotion]);

  const back = useCallback(() => {
    if (!running || running.index === 0) return;
    const previous = running.tour.steps[running.index - 1];
    // A step reached by a click: go back to the page it was on.
    const from = running.tour.steps
      .slice(0, running.index)
      .reverse()
      .find((s) => s.path && !s.path.endsWith("/*"));
    if (previous.click && from?.path) router.push(from.path);
    goTo(running.index - 1);
  }, [running, goTo, router]);

  // Clicking the highlighted element yourself also moves on.
  useEffect(() => {
    if (!targetEl || !running) return;
    const index = running.index;
    const onClick = () => goTo(index + 1);
    targetEl.addEventListener("click", onClick);
    return () => targetEl.removeEventListener("click", onClick);
  }, [targetEl, running, goTo]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, next, back, finish]);

  if (!mounted || !running || !step) return null;

  const total = running.tour.steps.length;
  const last = running.index === total - 1;
  const open = rect !== null && shownOn === pathname;
  const geometry = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;
  const hole = open ? geometry : null;

  return createPortal(
    <div
      data-tour-ui
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <Spotlight geometry={geometry} open={open} reduceMotion={!!reduceMotion} />
      {/* While moving on, the old highlight is not clickable. */}
      {searching && <div className="absolute inset-0" />}
      <AnimatePresence>
        {hole && <Ring key="ring" hole={hole} reduceMotion={!!reduceMotion} />}
        {hole && (
          <Hand
            key="hand"
            hole={hole}
            tapping={tapping}
            moving={searching}
            reduceMotion={!!reduceMotion}
          />
        )}
      </AnimatePresence>
      <TourCard
        hole={hole}
        tourLabel={running.tour.label}
        stepNumber={running.index + 1}
        total={total}
        step={step}
        searching={searching}
        last={last}
        onBack={running.index > 0 ? back : undefined}
        onNext={next}
        onSkip={finish}
      />
    </div>,
    document.body,
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

/** Same motion for the dimmed panels, the ring and the card, so they move as one. */
const GLIDE = { type: "spring", stiffness: 210, damping: 30, mass: 0.9 } as const;

/**
 * Dims everything but the hole: one masked layer, so there are no seams. The hole glides from
 * target to target on the same page; between pages it fades out (full dim while the page loads)
 * and fades back in on the new target, without travelling across the screen.
 * Invisible panels around the hole block clicks outside the target.
 */
function Spotlight({
  geometry,
  open,
  reduceMotion,
}: {
  geometry: Rect | null;
  open: boolean;
  reduceMotion: boolean;
}) {
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const h = geometry ?? { top: vh / 2, left: vw / 2, width: 0, height: 0 };
  // Glide only from one open hole to the next; otherwise jump there while it is invisible.
  const [wasOpen, setWasOpen] = useState(open);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remembers the last render
    setWasOpen(open);
  }, [open]);
  const glide = !reduceMotion && wasOpen && open;
  const fade = { duration: reduceMotion ? 0 : 0.35, ease: "easeInOut" } as const;
  const blockers = open
    ? [
        { top: 0, left: 0, width: vw, height: Math.max(0, h.top) },
        { top: h.top + h.height, left: 0, width: vw, height: Math.max(0, vh - h.top - h.height) },
        { top: h.top, left: 0, width: Math.max(0, h.left), height: h.height },
        {
          top: h.top,
          left: h.left + h.width,
          width: Math.max(0, vw - h.left - h.width),
          height: h.height,
        },
      ]
    : [{ top: 0, left: 0, width: vw, height: vh }];
  return (
    <>
      <motion.svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
        aria-hidden
      >
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            <motion.rect
              rx={12}
              fill="black"
              initial={false}
              animate={{
                x: h.left,
                y: h.top,
                width: h.width,
                height: h.height,
                opacity: open ? 1 : 0,
              }}
              transition={{ ...(glide ? GLIDE : { duration: 0 }), opacity: fade }}
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.58)" mask="url(#tour-spotlight)" />
      </motion.svg>
      {blockers.map((b, i) => (
        <div key={i} className="absolute" style={b} />
      ))}
    </>
  );
}

function Ring({ hole, reduceMotion }: { hole: Rect; reduceMotion: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-xl shadow-[0_0_0_4px_rgba(255,255,255,0.12),0_0_32px_rgba(255,255,255,0.18)] ring-2 ring-primary"
      initial={{
        opacity: 0,
        top: hole.top,
        left: hole.left,
        width: hole.width,
        height: hole.height,
      }}
      animate={{
        opacity: 1,
        top: hole.top,
        left: hole.left,
        width: hole.width,
        height: hole.height,
      }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={reduceMotion ? { duration: 0 } : { ...GLIDE, opacity: { duration: 0.25 } }}
    />
  );
}

/** A pointing hand that glides to the target, then taps it with a ripple. */
function Hand({
  hole,
  tapping,
  moving,
  reduceMotion,
}: {
  hole: Rect;
  tapping: boolean;
  /** Waiting for the next target: the hand dims a little, then glides there. */
  moving: boolean;
  reduceMotion: boolean;
}) {
  const SIZE = 46;
  // Fingertip of the hand drawing: (10.25/24, 2.25/24) of its box.
  const tipX = hole.left + Math.min(hole.width * 0.62, hole.width - 14);
  const tipY = hole.top + hole.height * 0.62;
  return (
    <motion.div
      className="pointer-events-none absolute z-[2]"
      initial={{ opacity: 0, x: tipX - SIZE * (10.25 / 24), y: tipY - SIZE * (2.25 / 24) }}
      animate={{
        opacity: moving ? 0.55 : 1,
        x: tipX - SIZE * (10.25 / 24),
        y: tipY - SIZE * (2.25 / 24),
      }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 120, damping: 19, mass: 0.9, opacity: { duration: 0.25 } }
      }
      style={{ top: 0, left: 0 }}
    >
      {!reduceMotion && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          className="absolute rounded-full border-2 border-white/80"
          style={{
            left: SIZE * (10.25 / 24) - 14,
            top: SIZE * (2.25 / 24) - 14,
            width: 28,
            height: 28,
          }}
          animate={{ scale: [0.4, 1.9], opacity: [0.85, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", repeatDelay: 0.3 }}
        />
      )}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : tapping
              ? { scale: 0.82, y: 4 }
              : { scale: [1, 0.9, 1], y: [0, 3, 0], rotate: [-8, -6, -8] }
        }
        transition={
          tapping ? { duration: 0.18 } : { duration: 1.7, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ transformOrigin: "40% 10%" }}
      >
        <HandShape size={SIZE} />
      </motion.div>
    </motion.div>
  );
}

/** A pointing hand: index finger up, three folded fingers, thumb on the side. */
function HandShape({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]"
      stroke="#1c1917"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        fill="#fff7ec"
        d="M8.5 14V4a1.75 1.75 0 0 1 3.5 0v6.2a1.6 1.6 0 0 1 3.2 0v.8a1.6 1.6 0 0 1 3.2 0v.8a1.5 1.5 0 0 1 3 0V16c0 3.6-2.7 6.5-6.3 6.5h-1.5c-2 0-3.4-.8-4.6-2.3L4.7 15a1.55 1.55 0 0 1 2.3-2.1l1.5 1.7Z"
      />
      <path fill="none" d="M12 10.2V13M15.2 11v2.4M18.4 11.8v2" />
    </svg>
  );
}

function TourCard({
  hole,
  tourLabel,
  stepNumber,
  total,
  step,
  searching,
  last,
  onBack,
  onNext,
  onSkip,
}: {
  hole: Rect | null;
  tourLabel: string;
  stepNumber: number;
  total: number;
  step: TourStep;
  searching: boolean;
  last: boolean;
  onBack?: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  // The card element currently on screen (a callback ref: each step mounts a new one).
  const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(220);
  useLayoutEffect(() => {
    if (!cardEl) return;
    const measure = () => {
      // A card being removed reports 0: keep the last real height.
      if (cardEl.isConnected && cardEl.offsetHeight > 0) setHeight(cardEl.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(cardEl);
    return () => observer.disconnect();
  }, [cardEl]);
  const placeHeight = height;

  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const width = Math.min(CARD_W, vw - 24);
  let style: { top: number; left: number };
  if (!hole) {
    style = { top: Math.max(12, vh / 2 - placeHeight / 2), left: vw / 2 - width / 2 };
  } else if (hole.left + hole.width < 320 && vw > 700) {
    // A sidebar item: beside it, so the hand never hides the text.
    style = {
      top: Math.min(Math.max(12, hole.top - 24), vh - placeHeight - 12),
      left: hole.left + hole.width + 72,
    };
  } else {
    const below = hole.top + hole.height + 76; // room for the hand
    const fitsBelow = below + placeHeight < vh - 12;
    style = {
      top: fitsBelow ? below : Math.max(12, hole.top - placeHeight - 18),
      left: Math.min(Math.max(12, hole.left + hole.width / 2 - width / 2), vw - width - 12),
    };
  }
  // Whatever the placement, the whole card (and its buttons) stays on screen.
  style = {
    top: Math.min(Math.max(12, style.top), Math.max(12, vh - placeHeight - 12)),
    left: Math.min(Math.max(12, style.left), Math.max(12, vw - width - 12)),
  };
  // While the next target is being found (same page, or the next page loading), the card stays
  // exactly where it is; then it makes ONE straight move to its new place, instead of going via
  // the middle of the screen or shifting when its new text changes its height.
  const lastStyle = useRef(style);
  useEffect(() => {
    if (!searching) lastStyle.current = style;
  });
  const [frozenStyle, setFrozenStyle] = useState<typeof style | null>(null);
  useLayoutEffect(() => {
    setFrozenStyle(searching ? lastStyle.current : null);
  }, [searching]);
  const place = frozenStyle ?? style;

  const nextLabel = last ? "Finish" : step.click ? "Show me" : "Next";

  // "Getting there..." only when the next place takes a while (not on every step).
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!searching) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a delayed hint
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 700);
    return () => clearTimeout(timer);
  }, [searching]);

  return (
    <motion.div
      ref={setCardEl}
      initial={{ opacity: 0, y: 12, scale: 0.97, top: style.top, left: style.left }}
      animate={{ opacity: 1, y: 0, scale: 1, top: place.top, left: place.left }}
      transition={{ ...GLIDE, opacity: { duration: 0.25 } }}
      className="absolute z-[3] overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl ring-1 ring-border"
      style={{ width }}
    >
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${(stepNumber / total) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <motion.div
        key={`${step.id}-${stepNumber}`}
        className="space-y-3 p-5"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide text-primary-text uppercase">
            <Sparkles className="size-3" aria-hidden />
            {tourLabel}
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            {/* In the header row, so it never changes the card's size (no shift). */}
            <AnimatePresence>
              {slow && (
                <motion.span
                  className="italic"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Getting there…
                </motion.span>
              )}
            </AnimatePresence>
            {stepNumber} / {total}
          </span>
        </div>
        <div className="space-y-1.5">
          <h2 id="tour-title" className="text-base font-semibold text-foreground">
            {step.title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
            {last ? "Close" : "Skip tour"}
          </button>
          <div className="flex gap-2">
            {onBack && (
              <Button size="sm" variant="outline" onClick={onBack} aria-label="Previous step">
                <ArrowLeft aria-hidden />
              </Button>
            )}
            <Button size="sm" onClick={onNext} autoFocus>
              {nextLabel}
              {!last && <ArrowRight aria-hidden />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

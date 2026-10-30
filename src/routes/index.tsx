import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import froggyHappy from "@/assets/froggy-happy.svg";
import froggySad from "@/assets/froggy-sad.svg";
import froggyLogo from "@/assets/froggy-logo.svg";
import timeMarker from "@/assets/time-marker.svg";
import buttonAdd from "@/assets/button-add.svg";
import smallAdd from "@/assets/small-add.svg";
import smallAddGreen from "@/assets/small-add-green.svg";
import smallAddPink from "@/assets/small-add-pink.svg";
import exitSvg from "@/assets/exit.svg";
import exit2Svg from "@/assets/exit-2.svg";
import buttonAccept from "@/assets/button-accept.svg";
import checkChecked from "@/assets/checkbox-checked.svg";
import checkDefault from "@/assets/checkbox-default.svg";
import checkStressed from "@/assets/checkbox-stressed.svg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grodlistan – planera dagen i tid" },
      { name: "description", content: "En att-göra-lista där varje uppgift tar plats efter hur lång tid den tar." },
      { property: "og:title", content: "Grodlistan – planera dagen i tid" },
      { property: "og:description", content: "Se hur lång tid dina uppgifter tar och hinn med dagen." },
    ],
  }),
  component: App,
});

type Sub = { id: string; name: string; done: boolean };
export type Task = { id: string; name: string; minutes: number; start: number; subs: Sub[] };

const PX_PER_MIN = 2.9;
const DAY_START = 8 * 60;
const GAP = 4;
const uid = () => Math.random().toString(36).slice(2, 10);
const dayKey = (d: Date) => "frog-" + d.toISOString().slice(0, 10);
const snap = (m: number) => Math.max(5, Math.round(m / 5) * 5);
const snapStart = (m: number) => Math.min(24 * 60 - 5, Math.max(DAY_START, Math.round(m / 5) * 5));
// estimated time on the card: "45 min" or "1 h 30 min"
const fmtTime = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);
// new task goes at the given time; if that slot is taken, it moves below the task already there
export const placeNew = (ts: Pick<Task, "start" | "minutes">[], at: number, len: number) => {
  let st = Math.max(DAY_START, Math.floor(at / 5) * 5);
  for (let moved = true; moved; ) {
    moved = false;
    for (const t of ts) if (st < t.start + t.minutes && t.start < st + len) { st = t.start + t.minutes; moved = true; }
  }
  return st;
};
// cards never overlap: a card dropped onto another slides below it, and cards after it shift down too
export const resolveOverlaps = (ts: Task[]) => {
  const sorted = [...ts].sort((a, b) => a.start - b.start);
  let cursor = -Infinity;
  return sorted.map((t) => {
    const start = Math.max(t.start, cursor);
    cursor = start + t.minutes;
    return start === t.start ? t : { ...t, start };
  });
};
// older saved lists had no start time: place them back to back
const migrate = (ts: Task[]) => { let c = DAY_START; return ts.map((t) => { const st = typeof t.start === "number" ? t.start : c; c = st + t.minutes; return { ...t, start: st }; }); };

function Circle({ done, late, size = 16 }: { done: boolean; late?: boolean; size?: number }) {
  return <img src={done ? checkChecked : late ? checkStressed : checkDefault} alt="" width={size} height={size} className="shrink-0" draggable={false} />;
}

function App() {
  const [date, setDate] = useState(() => new Date());
  // tasks are kept together with the day they belong to, so a day switch
  // can never save one day's list over another day's
  const [day, setDay] = useState<{ key: string; tasks: Task[] }>(() => ({ key: dayKey(new Date()), tasks: [] }));
  const tasks = day.tasks;
  const loaded = day.key === dayKey(date);
  const setTasks = (f: Task[] | ((ts: Task[]) => Task[])) =>
    setDay((d) => ({ ...d, tasks: typeof f === "function" ? f(d.tasks) : f }));
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const k = dayKey(date);
    const raw = localStorage.getItem(k);
    setDay({ key: k, tasks: raw ? migrate(JSON.parse(raw)) : [] });
  }, [date]);
  useEffect(() => {
    if (day.key === dayKey(date)) localStorage.setItem(day.key, JSON.stringify(day.tasks));
  }, [day, date]);
  // keep the now-marker on the actual clock: tick every second and resync
  // whenever the app becomes visible again (timers pause in background)
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const iv = setInterval(tick, 1000);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  const isToday = dayKey(date) === dayKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // which way the day switch should glide: 1 = in from the right, -1 = from the left
  const [slideDir, setSlideDir] = useState<0 | 1 | -1>(0);
  const shift = (n: number) => {
    setSlideDir(n > 0 ? 1 : -1);
    setDate((d) => new Date(d.getTime() + n * 864e5));
  };
  const label = isToday ? "Idag" : date.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });

  const layout = tasks.map((t) => ({ t, top: (t.start - DAY_START) * PX_PER_MIN, h: t.minutes * PX_PER_MIN }));
  const lastEnd = tasks.reduce((m, t) => Math.max(m, t.start + t.minutes), DAY_START);
  const hours = Math.max(16, Math.ceil((lastEnd - DAY_START) / 60) + 1);
  const late = (i: number) => {
    if (!isToday) return false;
    const t = tasks[i]!;
    return nowMin > t.start + t.minutes && !(t.subs.length && t.subs.every((s) => s.done));
  };
  const anyLate = tasks.some((_, i) => late(i));

  const update = (id: string, f: (t: Task) => Task) => setTasks((ts) => ts.map((t) => (t.id === id ? f(t) : t)));

  // drag state
  const drag = useRef<{ id: string; mode: "move" | "resize"; x0: number; y0: number; v0: number; moved: boolean } | null>(null);
  const [dragDx, setDragDx] = useState(0);
  // timer for "hold the pointer at the screen edge to switch day"
  const edgeTimer = useRef<{ dir: number; t: ReturnType<typeof setTimeout> } | null>(null);
  const clearEdge = () => {
    if (edgeTimer.current) clearTimeout(edgeTimer.current.t);
    edgeTimer.current = null;
  };
  useEffect(() => clearEdge, []);

  // drag a card sideways to move it to the next or previous day
  const moveToDay = (id: string, dir: number) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const target = new Date(date.getTime() + dir * 864e5);
    const raw = localStorage.getItem(dayKey(target));
    const other: Task[] = raw ? migrate(JSON.parse(raw)) : [];
    localStorage.setItem(dayKey(target), JSON.stringify(resolveOverlaps([...other, t])));
    // save the removal on the current day right away: the day switch below
    // means the normal save would otherwise never write it
    localStorage.setItem(dayKey(date), JSON.stringify(tasks.filter((x) => x.id !== id)));
    setTasks((ts) => ts.filter((x) => x.id !== id));
    setSlideDir(dir > 0 ? 1 : -1);
    setDate(target);
  };

  const onDown = (e: React.PointerEvent, id: string, mode: "move" | "resize") => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const t = tasks.find((x) => x.id === id)!;
    drag.current = { id, mode, x0: e.clientX, y0: e.clientY, v0: mode === "move" ? t.start : t.minutes, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) d.moved = true;
    if (!d.moved) return;
    if (d.mode === "resize") update(d.id, (t) => ({ ...t, minutes: snap(d.v0 + dy / PX_PER_MIN) }));
    else {
      update(d.id, (t) => ({ ...t, start: snapStart(d.v0 + dy / PX_PER_MIN) }));
      setDragDx(dx);
      // hold the pointer at the screen edge for 500 ms to move the card to the next/previous day
      const dir = e.clientX > window.innerWidth - 40 ? 1 : e.clientX < 40 ? -1 : 0;
      if (dir && edgeTimer.current?.dir !== dir) {
        clearEdge();
        const id = d.id;
        edgeTimer.current = {
          dir,
          t: setTimeout(() => {
            edgeTimer.current = null;
            drag.current = null;
            setDragDx(0);
            moveToDay(id, dir);
          }, 500),
        };
      } else if (!dir) clearEdge();
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    clearEdge();
    setDragDx(0);
    if (d?.moved) setTasks((ts) => resolveOverlaps(ts));
    if (d && !d.moved && d.mode === "move") setOpenId(d.id);
  };

  const addTask = () => {
    const t: Task = { id: uid(), name: "Ny uppgift", minutes: 30, start: placeNew(tasks, isToday ? nowMin : DAY_START, 30), subs: [] };
    setTasks((ts) => [...ts, t]);
    setOpenId(t.id);
  };

  const open = tasks.find((t) => t.id === openId);
  const nowY = (nowMin - DAY_START) * PX_PER_MIN;
  // jump to current time when the app opens
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loaded || !isToday) return;
    const el = scrollRef.current;
    if (!el) return;
    const nm = new Date().getHours() * 60 + new Date().getMinutes();
    if (nm < DAY_START) { el.scrollTop = 0; return; }
    el.scrollTop = Math.max(0, (nm - DAY_START) * PX_PER_MIN - 90);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, isToday]);
  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col items-center px-3 pt-4 pb-6 select-none">
      <div className="relative z-10 -mb-3 flex w-full items-end justify-between pl-6 pr-14">
        <img src={froggyLogo} alt="Froggy" className="h-10 w-auto" draggable={false} />
        <img src={anyLate ? froggySad : froggyHappy} alt={anyLate ? "Ledsen groda" : "Glad groda"} className="h-20 w-auto" draggable={false} />
      </div>
      <div className="relative flex w-full flex-1 flex-col overflow-hidden rounded-[2.5rem] bg-panel">
        <div
          key={dayKey(date)}
          className={`flex flex-1 flex-col overflow-hidden ${slideDir === 1 ? "animate-slide-in-right" : slideDir === -1 ? "animate-slide-in-left" : ""}`}
        >
        <div className="flex items-center justify-center gap-6 py-4 text-xl font-bold">
          <button aria-label="Föregående dag" onClick={() => shift(-1)} className="px-2">‹</button>
          <span className="min-w-20 text-center capitalize">{label}</span>
          <button aria-label="Nästa dag" onClick={() => shift(1)} className="px-2">›</button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-28" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="relative" style={{ height: hours * 60 * PX_PER_MIN }}>
            <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-card" />
            {loaded && isToday && nowMin >= DAY_START && (
              <div className="absolute left-10 top-0 w-0.5 bg-frog" style={{ height: nowY }} />
            )}
            {Array.from({ length: hours }, (_, h) => {
              const y = h * 60 * PX_PER_MIN;
              return (
                <div key={h} className="absolute left-3 text-[16px]" style={{ top: y - 2 }}>
                  {String(8 + h).padStart(2, "0")}
                </div>
              );
            })}
            {loaded && isToday && nowMin >= DAY_START && (
              <img src={timeMarker} alt="Nu" className="absolute z-10 h-10 w-10" style={{ left: 5, top: nowY - 18.75 }} draggable={false} />
            )}
            {layout.map(({ t, top, h }, i) => {
              const done = t.subs.filter((s) => s.done).length;
              const complete = t.subs.length > 0 && done === t.subs.length;
              const isLate = late(i);
              const sorted = [...t.subs.filter((s) => !s.done), ...t.subs.filter((s) => s.done)];
              const dy = drag.current?.id === t.id && drag.current.moved;
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => onDown(e, t.id, "move")}
                  className={`absolute left-14 right-3 touch-none overflow-hidden rounded-2xl px-3 pt-2 shadow-sm ${dy ? "z-20 shadow-lg" : "transition-[top]"} ${complete ? "bg-frog-light" : isLate ? "border-2 border-late bg-late-bg" : "bg-card"}`}
                  style={{ top: top + GAP / 2, height: h - GAP, transform: dy && dragDx ? `translateX(${dragDx}px)` : undefined }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[20px] font-semibold">{t.name}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{fmtTime(t.minutes)}</span>
                      <span className={`rounded-full px-2 py-1 text-[12px] leading-none text-primary-foreground ${complete ? "bg-frog-mid" : isLate ? "bg-late" : "bg-primary"}`}>
                        {done}/{t.subs.length}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 space-y-1.5 overflow-hidden" style={{ maxHeight: h - GAP - 56, maskImage: "linear-gradient(to bottom, black calc(100% - 14px), transparent)", WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 14px), transparent)" }}>
                    {sorted.map((s) => (
                      <div key={s.id} className={`flex items-center gap-2 text-sm ${s.done ? "text-frog" : "text-muted-foreground"}`}>
                        <Circle done={s.done} late={isLate} />
                        <span className="truncate">{s.name}</span>
                      </div>
                    ))}
                  </div>
                  {complete && (
                    <img src={buttonAccept} alt="Klar" className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2" draggable={false} />
                  )}
                  <div
                    onPointerDown={(e) => onDown(e, t.id, "resize")}
                    className="absolute inset-x-0 bottom-0 flex h-4 cursor-ns-resize touch-none items-center justify-center"
                    aria-label="Ändra tid"
                  >
                    <span className={`h-1 w-8 rounded-full ${complete ? "bg-frog/60" : isLate ? "bg-late/60" : "bg-primary/40"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
        <button aria-label="Ny uppgift" onClick={addTask} className="absolute bottom-5 right-5"><img src={buttonAdd} alt="" className="h-16 w-16" draggable={false} /></button>
        {open && <Detail task={open} late={late(tasks.indexOf(open))} onChange={(f) => update(open.id, f)} onClose={() => setOpenId(null)} onDelete={() => { setTasks((ts) => ts.filter((t) => t.id !== open.id)); setOpenId(null); }} />}
      </div>
    </div>
  );
}

function Detail({ task, late, onChange, onClose, onDelete }: { task: Task; late: boolean; onChange: (f: (t: Task) => Task) => void; onClose: () => void; onDelete: () => void }) {
  const [editName, setEditName] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const done = task.subs.filter((s) => s.done).length;
  const toggle = (id: string) =>
    onChange((t) => {
      const s = t.subs.find((x) => x.id === id)!;
      const rest = t.subs.filter((x) => x.id !== id);
      const ns = { ...s, done: !s.done };
      // checked -> bottom; unchecked -> end of open items
      if (ns.done) return { ...t, subs: [...rest, ns] };
      const open = rest.filter((x) => !x.done);
      return { ...t, subs: [...open, ns, ...rest.filter((x) => x.done)] };
    });
  const addNew = () => {
    const id = uid();
    onChange((t) => ({ ...t, subs: [...t.subs.filter((s) => !s.done), { id, name: "", done: false }, ...t.subs.filter((s) => s.done)] }));
    setEditId(id);
  };
  const commit = () => {
    if (editId === null) return;
    const name = task.subs.find((s) => s.id === editId)?.name.trim() ?? "";
    if (!name) onChange((t) => ({ ...t, subs: t.subs.filter((s) => s.id !== editId) }));
    setEditId(null);
  };
  const complete = task.subs.length > 0 && done === task.subs.length;
  return (
    <div className={`absolute inset-0 z-30 flex flex-col overflow-y-auto rounded-t-[2.5rem] px-4 pt-6 pb-24 animate-in slide-in-from-bottom-4 fade-in ${complete ? "bg-frog-light" : late ? "bg-late-bg" : "bg-card"}`}>
      <div className="relative mb-5 flex items-center justify-center">
        {editName ? (
          <input autoFocus value={task.name} onChange={(e) => onChange((t) => ({ ...t, name: e.target.value }))} onBlur={() => setEditName(false)} onKeyDown={(e) => e.key === "Enter" && setEditName(false)}
            className={`w-3/4 rounded-lg border-2 bg-transparent px-2 text-center text-[24px] font-bold outline-none ${complete ? "border-frog" : late ? "border-late" : "border-primary"}`} />
        ) : (
          <button onClick={() => setEditName(true)} className="text-[24px] font-bold">{task.name}</button>
        )}
        <button aria-label="Stäng" onClick={onClose} className="absolute right-1"><img src={exitSvg} alt="" className="h-6 w-6" draggable={false} /></button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 text-primary-foreground">
        <div className={`rounded-2xl py-2 text-center ${complete ? "bg-frog" : late ? "bg-late" : "bg-primary"}`}>
          <div className="text-xs">Uppskattad tid:</div>
          <div className="flex items-center justify-center gap-3 font-bold">
            <button aria-label="Minska tid" onClick={() => onChange((t) => ({ ...t, minutes: snap(t.minutes - 5) }))}>−</button>
            <span>{task.minutes} min</span>
            <button aria-label="Öka tid" onClick={() => onChange((t) => ({ ...t, minutes: snap(t.minutes + 5) }))}>+</button>
          </div>
        </div>
        <div className={`rounded-2xl py-2 text-center ${complete ? "bg-frog" : late ? "bg-late" : "bg-primary"}`}>
          <div className="text-xs">Utförda:</div>
          <div className="font-bold">{done}/{task.subs.length}</div>
        </div>
      </div>
      <div className={`rounded-2xl border-2 p-3 ${complete ? "border-frog" : late ? "border-late" : "border-primary"}`}>
        <div className="mb-2 text-center text-[24px]">Att göra</div>
        <div className="space-y-2">
          {task.subs.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 text-[20px] leading-none ${s.done ? "text-frog" : ""}`}>
              <button aria-label="Bocka av" onClick={() => toggle(s.id)}><Circle done={s.done} late={late} size={24} /></button>
              {s.id === editId ? (
                <input autoFocus value={s.name} placeholder="Sub-task"
                  onChange={(e) => onChange((t) => ({ ...t, subs: t.subs.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)) }))}
                  onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
                  onBlur={commit}
                  className={`flex-1 rounded-md border-2 bg-transparent px-1 outline-none ${complete ? "border-frog" : late ? "border-late" : "border-primary"}`} />
              ) : (
                <span className="flex-1 truncate">{s.name}</span>
              )}
              <button aria-label="Ta bort" onClick={() => onChange((t) => ({ ...t, subs: t.subs.filter((x) => x.id !== s.id) }))} className="shrink-0"><img src={exit2Svg} alt="" className="h-5 w-5" draggable={false} /></button>
            </div>
          ))}
        </div>
        <button onClick={addNew} className={`mx-auto mt-3 flex items-center gap-2 text-[24px] ${complete ? "text-frog" : late ? "text-late" : "text-primary"}`}>
          <img src={complete ? smallAddGreen : late ? smallAddPink : smallAdd} alt="" className="h-7 w-7" draggable={false} /> Lägg till
        </button>
      </div>
      <button onClick={onDelete} className="mt-6 self-center text-[16px] text-late">Ta bort uppgift</button>
      <button aria-label="Klar" onClick={onClose} className="absolute bottom-5 right-5"><img src={buttonAccept} alt="" className="h-14 w-14" draggable={false} /></button>
    </div>
  );
}

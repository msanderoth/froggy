import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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
type Task = { id: string; name: string; minutes: number; subs: Sub[] };

const PX_PER_MIN = 2.9;
const DAY_START = 8 * 60;
const GAP = 12;
const uid = () => Math.random().toString(36).slice(2, 10);
const dayKey = (d: Date) => "frog-" + d.toISOString().slice(0, 10);
const snap = (m: number) => Math.max(5, Math.round(m / 5) * 5);

function Frog({ sleepy }: { sleepy?: boolean }) {
  const rows = [
    "..DDD....DDD..",
    ".DLLLD..DLLLD.",
    ".DLWDLDDLDWLD.",
    "DLLLLLLLLLLLLD",
    "DLLLLLLLLLLLLD",
    ".DLLDLLLLDLLD.",
    "..DLLDDDDLLD..",
    ".DLDLLLLLLDLD.",
    "DLLDLLLLLLDLLD",
    "DLLLDLLLLDLLLD",
    ".DDDDD..DDDDD.",
  ];
  const s = 6;
  return (
    <svg width={14 * s} height={11 * s} viewBox={`0 0 ${14 * s} ${11 * s}`} shapeRendering="crispEdges">
      {rows.flatMap((r, y) =>
        [...r].map((c, x) => {
          if (c === ".") return null;
          let fill = c === "D" ? "var(--frog)" : c === "W" ? (sleepy ? "var(--frog)" : "var(--card)") : "var(--frog-light)";
          return <rect key={`${x}-${y}`} x={x * s} y={y * s} width={s} height={s} fill={fill} />;
        }),
      )}
      {sleepy && <><rect x={2 * s} y={5 * s} width={s} height={s} fill="var(--late-bg)" /><rect x={11 * s} y={5 * s} width={s} height={s} fill="var(--late-bg)" /></>}
    </svg>
  );
}

function Circle({ done, late }: { done: boolean; late?: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 ${done ? "border-frog bg-frog" : late ? "border-late" : "border-primary"}`}
    />
  );
}

function App() {
  const [date, setDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setLoaded(false);
    const raw = localStorage.getItem(dayKey(date));
    setTasks(raw ? JSON.parse(raw) : []);
    setLoaded(true);
  }, [date]);
  useEffect(() => {
    if (loaded) localStorage.setItem(dayKey(date), JSON.stringify(tasks));
  }, [tasks, loaded, date]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const isToday = dayKey(date) === dayKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const shift = (n: number) => setDate((d) => new Date(d.getTime() + n * 864e5));
  const label = isToday ? "Idag" : date.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });

  // layout
  let cursor = 0;
  const layout = tasks.map((t) => {
    const top = cursor;
    const h = t.minutes * PX_PER_MIN;
    cursor += h + GAP;
    return { t, top, h, start: DAY_START + top / PX_PER_MIN };
  });
  // convert y to minutes: use cumulative minutes, gaps count as tiny time
  const totalH = Math.max(cursor + 200, 4 * 60 * PX_PER_MIN);
  const hours = Math.ceil(totalH / PX_PER_MIN / 60) + 1;
  const late = (i: number) => {
    if (!isToday) return false;
    const end = DAY_START + tasks.slice(0, i + 1).reduce((a, t) => a + t.minutes, 0);
    const t = tasks[i];
    return nowMin > end && !(t.subs.length && t.subs.every((s) => s.done));
  };
  const anyLate = tasks.some((_, i) => late(i));

  const update = (id: string, f: (t: Task) => Task) => setTasks((ts) => ts.map((t) => (t.id === id ? f(t) : t)));

  // drag state
  const drag = useRef<{ id: string; mode: "move" | "resize"; y0: number; v0: number; moved: boolean } | null>(null);
  const [dragY, setDragY] = useState<{ id: string; dy: number } | null>(null);

  const onDown = (e: React.PointerEvent, id: string, mode: "move" | "resize") => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const t = tasks.find((x) => x.id === id)!;
    drag.current = { id, mode, y0: e.clientY, v0: t.minutes, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y0;
    if (Math.abs(dy) > 6) d.moved = true;
    if (!d.moved) return;
    if (d.mode === "resize") {
      update(d.id, (t) => ({ ...t, minutes: snap(d.v0 + dy / PX_PER_MIN) }));
    } else {
      setDragY({ id: d.id, dy });
      const idx = tasks.findIndex((t) => t.id === d.id);
      const me = layout[idx];
      const center = me.top + dy + me.h / 2;
      const nb = idx > 0 ? layout[idx - 1] : null;
      const na = idx < tasks.length - 1 ? layout[idx + 1] : null;
      if (nb && center < nb.top + nb.h / 2) {
        setTasks((ts) => { const c = [...ts]; c.splice(idx - 1, 2, c[idx]!, c[idx - 1]!); return c; });
        d.y0 -= nb.h + GAP;
        setDragY({ id: d.id, dy: e.clientY - d.y0 });
      } else if (na && center > na.top + na.h / 2) {
        setTasks((ts) => { const c = [...ts]; c.splice(idx, 2, c[idx + 1]!, c[idx]!); return c; });
        d.y0 += na.h + GAP;
        setDragY({ id: d.id, dy: e.clientY - d.y0 });
      }
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragY(null);
    if (d && !d.moved && d.mode === "move") setOpenId(d.id);
  };

  const addTask = () => {
    const t: Task = { id: uid(), name: "Ny uppgift", minutes: 30, subs: [] };
    setTasks((ts) => [...ts, t]);
    setOpenId(t.id);
  };

  const open = tasks.find((t) => t.id === openId);
  const nowY = (nowMin - DAY_START) * PX_PER_MIN;
  // approximate: account for gaps before now
  let gapAdj = 0;
  { let acc = 0; for (const t of tasks) { acc += t.minutes; if (DAY_START + acc < nowMin) gapAdj += GAP; } }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col items-center px-3 pt-4 select-none">
      <div className="relative z-10 -mb-3 self-end mr-14"><Frog sleepy={anyLate} /></div>
      <div className="relative flex w-full flex-1 flex-col overflow-hidden rounded-t-[2.5rem] bg-panel">
        <div className="flex items-center justify-center gap-6 py-4 text-xl font-bold">
          <button aria-label="Föregående dag" onClick={() => shift(-1)} className="px-2">‹</button>
          <span className="min-w-20 text-center capitalize">{label}</span>
          <button aria-label="Nästa dag" onClick={() => shift(1)} className="px-2">›</button>
        </div>
        <div className="flex-1 overflow-y-auto pb-28" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="relative" style={{ height: hours * 60 * PX_PER_MIN }}>
            <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-card" />
            {isToday && nowMin >= DAY_START && (
              <div className="absolute left-10 top-0 w-0.5 bg-frog" style={{ height: nowY + gapAdj }} />
            )}
            {Array.from({ length: hours }, (_, h) => {
              let y = h * 60 * PX_PER_MIN;
              let acc = 0;
              for (const t of tasks) { acc += t.minutes; if (acc <= h * 60) y += GAP; }
              return (
                <div key={h} className="absolute left-3 text-xs" style={{ top: y - 2 }}>
                  {String(8 + h).padStart(2, "0")}
                </div>
              );
            })}
            {isToday && nowMin >= DAY_START && (
              <div className="absolute left-6 h-3 w-4 bg-frog" style={{ top: nowY + gapAdj - 6, clipPath: "polygon(0 0,100% 50%,0 100%,30% 50%)" }} />
            )}
            {layout.map(({ t, top, h }, i) => {
              const done = t.subs.filter((s) => s.done).length;
              const complete = t.subs.length > 0 && done === t.subs.length;
              const isLate = late(i);
              const sorted = [...t.subs.filter((s) => !s.done), ...t.subs.filter((s) => s.done)];
              const dy = dragY?.id === t.id ? dragY.dy : 0;
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => onDown(e, t.id, "move")}
                  className={`absolute left-14 right-3 touch-none overflow-hidden rounded-2xl px-3 pt-2 shadow-sm ${dy ? "z-20 shadow-lg" : "transition-[top]"} ${complete ? "bg-frog-light" : isLate ? "border-2 border-late bg-late-bg" : "bg-card"}`}
                  style={{ top: top + dy, height: h }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-lg font-semibold">{t.name}</span>
                    {!complete && (
                      <span className={`rounded-full px-2 text-xs text-primary-foreground ${isLate ? "bg-late" : "bg-primary"}`}>
                        {done}/{t.subs.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1.5" style={{ maskImage: "linear-gradient(to bottom, black 70%, transparent)" }}>
                    {sorted.map((s) => (
                      <div key={s.id} className={`flex items-center gap-2 text-sm ${s.done ? "text-frog" : "text-muted-foreground"}`}>
                        <Circle done={s.done} late={isLate} />
                        <span className="truncate">{s.name}</span>
                      </div>
                    ))}
                  </div>
                  {complete && (
                    <div className="absolute right-6 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border-4 border-frog text-2xl text-frog">✓</div>
                  )}
                  <div
                    onPointerDown={(e) => onDown(e, t.id, "resize")}
                    className="absolute inset-x-0 bottom-0 flex h-4 cursor-ns-resize touch-none items-center justify-center"
                    aria-label="Ändra tid"
                  >
                    <span className="h-1 w-8 rounded-full bg-primary/40" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <button aria-label="Ny uppgift" onClick={addTask} className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-frog bg-frog-light text-3xl font-bold text-frog">+</button>
        {open && <Detail task={open} onChange={(f) => update(open.id, f)} onClose={() => setOpenId(null)} onDelete={() => { setTasks((ts) => ts.filter((t) => t.id !== open.id)); setOpenId(null); }} />}
      </div>
    </div>
  );
}

function Detail({ task, onChange, onClose, onDelete }: { task: Task; onChange: (f: (t: Task) => Task) => void; onClose: () => void; onDelete: () => void }) {
  const [editName, setEditName] = useState(false);
  const [adding, setAdding] = useState("");
  const [isAdding, setIsAdding] = useState(false);
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
  const add = () => {
    if (adding.trim()) onChange((t) => ({ ...t, subs: [...t.subs.filter((s) => !s.done), { id: uid(), name: adding.trim(), done: false }, ...t.subs.filter((s) => s.done)] }));
    setAdding("");
  };
  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-y-auto rounded-t-[2.5rem] bg-card px-4 pt-6 pb-24 animate-in slide-in-from-bottom-4 fade-in">
      <div className="relative mb-5 flex items-center justify-center">
        {editName ? (
          <input autoFocus value={task.name} onChange={(e) => onChange((t) => ({ ...t, name: e.target.value }))} onBlur={() => setEditName(false)} onKeyDown={(e) => e.key === "Enter" && setEditName(false)}
            className="w-3/4 rounded-lg border-2 border-primary bg-transparent px-2 text-center text-xl font-bold outline-none" />
        ) : (
          <button onClick={() => setEditName(true)} className="text-xl font-bold">{task.name}</button>
        )}
        <button aria-label="Stäng" onClick={onClose} className="absolute right-1 text-2xl">✕</button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 text-primary-foreground">
        <div className="rounded-2xl bg-primary py-2 text-center">
          <div className="text-xs">Uppskattad tid:</div>
          <div className="flex items-center justify-center gap-3 font-bold">
            <button aria-label="Minska tid" onClick={() => onChange((t) => ({ ...t, minutes: snap(t.minutes - 5) }))}>−</button>
            <span>{task.minutes} min</span>
            <button aria-label="Öka tid" onClick={() => onChange((t) => ({ ...t, minutes: snap(t.minutes + 5) }))}>+</button>
          </div>
        </div>
        <div className="rounded-2xl bg-primary py-2 text-center">
          <div className="text-xs">Utförda:</div>
          <div className="font-bold">{done}/{task.subs.length}</div>
        </div>
      </div>
      <div className="rounded-2xl border-2 border-primary p-3">
        <div className="mb-2 text-center text-lg">Att göra</div>
        <div className="space-y-2">
          {task.subs.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 text-lg ${s.done ? "text-frog" : ""}`}>
              <button aria-label="Bocka av" onClick={() => toggle(s.id)}><span className={`block h-5 w-5 rounded-full border-2 ${s.done ? "border-frog bg-frog" : "border-primary"}`} /></button>
              <span className="flex-1 truncate">{s.name}</span>
              <button aria-label="Ta bort" onClick={() => onChange((t) => ({ ...t, subs: t.subs.filter((x) => x.id !== s.id) }))} className="text-sm text-muted-foreground">✕</button>
            </div>
          ))}
        </div>
        {isAdding ? (
          <input autoFocus value={adding} placeholder="Sub-task" onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }} onBlur={() => { add(); setIsAdding(false); }}
            className="mt-3 w-full rounded-lg border-2 border-primary bg-transparent px-2 py-1 text-lg outline-none" />
        ) : (
          <button onClick={() => setIsAdding(true)} className="mx-auto mt-3 flex items-center gap-2 text-xl">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary text-primary">+</span> Lägg till
          </button>
        )}
      </div>
      <button onClick={onDelete} className="mt-6 self-center text-sm text-late">Ta bort uppgift</button>
      <button aria-label="Klar" onClick={onClose} className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-frog bg-frog-light text-2xl font-bold text-frog">✓</button>
    </div>
  );
}

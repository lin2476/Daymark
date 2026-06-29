import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  FileText,
  Flag,
  History,
  ListChecks,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import {
  daysBetweenInclusive,
  dayOfWeekIndex,
  isDateInRange,
  lastDays,
  monthGrid,
  todayKey,
} from "./dateUtils";
import { useLedgerStore } from "./store";
import type { CheckIn, CheckInStatus, ExportData, Goal, GoalKind, GoalPriority, Mood } from "./types";

type View = "today" | "goals" | "records" | "stats" | "settings";

const colors = ["#2f7d6e", "#b84f39", "#5b6fbd", "#c08b2d", "#7b5aa6", "#4e7d36"];
const priorityText: Record<GoalPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};
const kindText: Record<GoalKind, string> = {
  daily: "每日",
  longTerm: "长期",
};
const moodText: Record<Mood, string> = {
  steady: "稳定",
  good: "顺利",
  hard: "吃力",
  spark: "突破",
};
const statusText: Record<CheckInStatus, string> = {
  completed: "已完成",
  skipped: "跳过",
  moved: "顺延",
};
const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];

const defaultGoalDraft = () => ({
  title: "",
  kind: "daily" as GoalKind,
  color: colors[0],
  priority: "medium" as GoalPriority,
  startDate: todayKey(),
  endDate: "",
  targetValue: "",
  unit: "",
  note: "",
  cadenceDays: [0, 1, 2, 3, 4, 5, 6],
});

const isGoalDueOn = (goal: Goal, date: string) => {
  if (goal.archivedAt || !isDateInRange(date, goal.startDate, goal.endDate)) return false;
  if (goal.kind === "daily") {
    return (goal.cadenceDays?.length ? goal.cadenceDays : [0, 1, 2, 3, 4, 5, 6]).includes(dayOfWeekIndex(date));
  }
  return true;
};

const getCheckIn = (checkIns: CheckIn[], goalId: string, date: string) =>
  checkIns.find((checkIn) => checkIn.goalId === goalId && checkIn.date === date);

const completedCount = (items: Array<CheckIn | undefined>) =>
  items.filter((item) => item?.status === "completed").length;

export function App() {
  const { goals, checkIns, journals, isReady, load } = useLedgerStore();
  const [view, setView] = useState<View>("today");
  const [selectedDate, setSelectedDate] = useState(todayKey());

  useEffect(() => {
    void load();
  }, [load]);

  const activeGoals = useMemo(() => goals.filter((goal) => !goal.archivedAt), [goals]);
  const dueToday = useMemo(() => activeGoals.filter((goal) => isGoalDueOn(goal, selectedDate)), [activeGoals, selectedDate]);
  const todayCheckIns = dueToday.map((goal) => getCheckIn(checkIns, goal.id, selectedDate));
  const doneToday = completedCount(todayCheckIns);
  const completionRate = dueToday.length ? Math.round((doneToday / dueToday.length) * 100) : 0;

  if (!isReady) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">
          <Target size={30} />
        </div>
        <p>正在整理你的目标记录</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar current={view} onChange={setView} />
      <main className="workspace">
        {view === "today" && (
          <TodayView
            goals={dueToday}
            allGoals={activeGoals}
            checkIns={checkIns}
            journals={journals}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            doneToday={doneToday}
            completionRate={completionRate}
          />
        )}
        {view === "goals" && <GoalsView goals={goals} checkIns={checkIns} />}
        {view === "records" && <RecordsView goals={goals} checkIns={checkIns} journals={journals} />}
        {view === "stats" && <StatsView goals={activeGoals} checkIns={checkIns} />}
        {view === "settings" && <SettingsView />}
      </main>
    </div>
  );
}

function Sidebar({ current, onChange }: { current: View; onChange: (view: View) => void }) {
  const items: Array<{ id: View; label: string; icon: typeof Target }> = [
    { id: "today", label: "今日", icon: ListChecks },
    { id: "goals", label: "目标", icon: Target },
    { id: "records", label: "记录", icon: History },
    { id: "stats", label: "统计", icon: BarChart3 },
    { id: "settings", label: "设置", icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">
          <Flag size={20} />
        </span>
        <div>
          <strong>Daymark</strong>
          <small>日迹目标</small>
        </div>
      </div>
      <nav className="nav-list">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={current === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function TodayView({
  goals,
  allGoals,
  checkIns,
  journals,
  selectedDate,
  onDateChange,
  doneToday,
  completionRate,
}: {
  goals: Goal[];
  allGoals: Goal[];
  checkIns: CheckIn[];
  journals: ReturnType<typeof useLedgerStore.getState>["journals"];
  selectedDate: string;
  onDateChange: (date: string) => void;
  doneToday: number;
  completionRate: number;
}) {
  const saveJournal = useLedgerStore((state) => state.saveJournal);
  const journal = journals.find((item) => item.date === selectedDate)?.text ?? "";
  const [draft, setDraft] = useState(journal);

  useEffect(() => {
    setDraft(journal);
  }, [journal, selectedDate]);

  const heatDays = lastDays(14);

  return (
    <section className="view-grid today-grid">
      <div className="hero-panel">
        <div>
          <div className="hero-kicker">
            <p className="eyebrow">今日推进</p>
            <label className="date-picker compact">
              <CalendarDays size={17} />
              <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
            </label>
          </div>
          <h2>{goals.length ? `完成 ${doneToday}/${goals.length} 个目标` : "今天没有待推进目标"}</h2>
          <p>{goals.length ? "给今天留一份真实的记录，完成、跳过、调整都算数。" : "可以去目标页创建一个每日任务或长期目标。"}</p>
        </div>
        <div className="progress-ring" style={{ "--progress": `${completionRate}%` } as React.CSSProperties}>
          <span>{completionRate}</span>
          <small>%</small>
        </div>
      </div>

      <div className="task-list">
        {goals.map((goal) => (
          <GoalCheckCard key={goal.id} goal={goal} date={selectedDate} checkIn={getCheckIn(checkIns, goal.id, selectedDate)} />
        ))}
        {!goals.length && <EmptyState icon={Target} title="还没有今日任务" text="创建目标后，这里会成为每天打开就能执行的工作台。" />}
      </div>

      <aside className="side-stack">
        <section className="panel">
          <div className="panel-title">
            <h3>近 14 天</h3>
            <Sparkles size={18} />
          </div>
          <div className="heat-row">
            {heatDays.map((date) => {
              const due = allGoals.filter((goal) => isGoalDueOn(goal, date));
              const rate = due.length
                ? Math.round((completedCount(due.map((goal) => getCheckIn(checkIns, goal.id, date))) / due.length) * 100)
                : 0;
              return <span key={date} className="heat-cell" data-level={rate >= 80 ? 3 : rate >= 40 ? 2 : rate > 0 ? 1 : 0} title={`${date} ${rate}%`} />;
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h3>日记</h3>
            <FileText size={18} />
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void saveJournal(selectedDate, draft)}
            placeholder="今天的感受、过程、阻力或下一步..."
          />
          <button className="primary wide" onClick={() => void saveJournal(selectedDate, draft)}>
            <Check size={17} />
            保存
          </button>
        </section>
      </aside>
    </section>
  );
}

function GoalCheckCard({ goal, date, checkIn }: { goal: Goal; date: string; checkIn?: CheckIn }) {
  const upsertCheckIn = useLedgerStore((state) => state.upsertCheckIn);
  const [note, setNote] = useState(checkIn?.note ?? "");
  const [progress, setProgress] = useState(checkIn?.progressValue?.toString() ?? "");
  const [mood, setMood] = useState<Mood>(checkIn?.mood ?? "steady");

  useEffect(() => {
    setNote(checkIn?.note ?? "");
    setProgress(checkIn?.progressValue?.toString() ?? "");
    setMood(checkIn?.mood ?? "steady");
  }, [checkIn?.id, checkIn?.note, checkIn?.progressValue, checkIn?.mood]);

  const save = (status: CheckInStatus) => {
    void upsertCheckIn(goal.id, date, {
      status,
      note: note.trim() || undefined,
      progressValue: progress ? Number(progress) : undefined,
      mood,
    });
  };

  return (
    <article className="goal-card" style={{ "--goal": goal.color } as React.CSSProperties}>
      <div className="goal-card-main">
        <span className="goal-dot" />
        <div>
          <div className="goal-title-line">
            <h3>{goal.title}</h3>
            <span className="pill">{kindText[goal.kind]}</span>
            <span className={`status-pill ${checkIn?.status ?? ""}`}>{checkIn ? statusText[checkIn.status] : "未记录"}</span>
          </div>
          <p>{goal.note || (goal.kind === "daily" ? "保持节奏，不需要完美。" : "长期目标看进度，也看今天是否推进。")}</p>
        </div>
      </div>

      <div className="check-controls mood-strip">
        {goal.kind === "longTerm" && (
          <label className="compact-input">
            <span>进度</span>
            <input
              type="number"
              min="0"
              max={goal.targetValue}
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
              placeholder={goal.unit || "数值"}
            />
          </label>
        )}
        <div className="mood-options" role="group" aria-label="选择感受">
          {Object.entries(moodText).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={mood === value ? "selected" : ""}
              onClick={() => setMood(value as Mood)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <textarea className="reflection-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="写下这一刻的过程、感受或下一步..." />

      <div className="button-row task-actions">
        <button className="primary" onClick={() => save("completed")}>
          <Check size={17} />
          完成
        </button>
        <button onClick={() => save("moved")}>
          <ChevronRight size={17} />
          顺延
        </button>
        <button onClick={() => save("skipped")}>
          <Archive size={17} />
          跳过
        </button>
      </div>
    </article>
  );
}

function GoalsView({ goals, checkIns }: { goals: Goal[]; checkIns: CheckIn[] }) {
  const [draft, setDraft] = useState(defaultGoalDraft);
  const [showArchived, setShowArchived] = useState(false);
  const addGoal = useLedgerStore((state) => state.addGoal);
  const archiveGoal = useLedgerStore((state) => state.archiveGoal);
  const restoreGoal = useLedgerStore((state) => state.restoreGoal);
  const removeGoal = useLedgerStore((state) => state.removeGoal);

  const visibleGoals = goals.filter((goal) => (showArchived ? goal.archivedAt : !goal.archivedAt));

  const submit = () => {
    if (!draft.title.trim()) return;
    void addGoal({
      title: draft.title,
      kind: draft.kind,
      color: draft.color,
      priority: draft.priority,
      startDate: draft.startDate,
      endDate: draft.endDate || undefined,
      targetValue: draft.targetValue ? Number(draft.targetValue) : undefined,
      unit: draft.unit,
      note: draft.note,
      cadenceDays: draft.kind === "daily" ? draft.cadenceDays : undefined,
    });
    setDraft(defaultGoalDraft());
  };

  return (
    <section className="view-grid goals-grid">
      <form className="panel goal-form" onSubmit={(event) => event.preventDefault()}>
        <div className="panel-title">
          <h3>新目标</h3>
          <Plus size={18} />
        </div>
        <label>
          <span>目标名称</span>
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：每天阅读 30 分钟" />
        </label>
        <div className="two-cols">
          <label>
            <span>类型</span>
            <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as GoalKind })}>
              <option value="daily">每日任务</option>
              <option value="longTerm">长期任务</option>
            </select>
          </label>
          <label>
            <span>优先级</span>
            <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as GoalPriority })}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>
        </div>
        <div className="two-cols">
          <label>
            <span>开始日期</span>
            <input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
          </label>
          <label>
            <span>结束日期</span>
            <input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
          </label>
        </div>
        {draft.kind === "daily" ? (
          <div className="week-picker">
            {weekLabels.map((label, index) => (
              <button
                type="button"
                key={label}
                className={draft.cadenceDays.includes(index) ? "selected" : ""}
                onClick={() => {
                  const next = draft.cadenceDays.includes(index)
                    ? draft.cadenceDays.filter((item) => item !== index)
                    : [...draft.cadenceDays, index].sort();
                  setDraft({ ...draft, cadenceDays: next.length ? next : [index] });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="two-cols">
            <label>
              <span>目标数值</span>
              <input
                type="number"
                min="0"
                value={draft.targetValue}
                onChange={(event) => setDraft({ ...draft, targetValue: event.target.value })}
                placeholder="例如 100"
              />
            </label>
            <label>
              <span>单位</span>
              <input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="章 / 公里 / 小时" />
            </label>
          </div>
        )}
        <label>
          <span>颜色</span>
          <div className="color-row">
            {colors.map((color) => (
              <button
                type="button"
                key={color}
                className={draft.color === color ? "selected" : ""}
                style={{ "--swatch": color } as React.CSSProperties}
                onClick={() => setDraft({ ...draft, color })}
                aria-label={`选择颜色 ${color}`}
              />
            ))}
          </div>
        </label>
        <label>
          <span>备注</span>
          <textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="为什么开始，怎样算推进..." />
        </label>
        <button className="primary wide" onClick={submit}>
          <Plus size={17} />
          创建目标
        </button>
      </form>

      <div className="goal-board">
        <div className="section-header">
          <div>
            <p className="eyebrow">目标列表</p>
            <h2>{showArchived ? "已归档目标" : "进行中目标"}</h2>
          </div>
          <button onClick={() => setShowArchived(!showArchived)}>
            <Archive size={17} />
            {showArchived ? "看进行中" : "看归档"}
          </button>
        </div>
        <div className="goal-list">
          {visibleGoals.map((goal) => {
            const related = checkIns.filter((checkIn) => checkIn.goalId === goal.id);
            const completed = related.filter((checkIn) => checkIn.status === "completed").length;
            const latestProgress = related.find((checkIn) => typeof checkIn.progressValue === "number")?.progressValue;
            const longTermRate =
              goal.kind === "longTerm" && goal.targetValue && latestProgress
                ? Math.min(100, Math.round((latestProgress / goal.targetValue) * 100))
                : undefined;
            return (
              <article className="goal-summary" key={goal.id} style={{ "--goal": goal.color } as React.CSSProperties}>
                <div className="goal-card-main">
                  <span className="goal-dot" />
                  <div>
                    <div className="goal-title-line">
                      <h3>{goal.title}</h3>
                      <span className="pill">{kindText[goal.kind]}</span>
                      <span className="pill">优先级 {priorityText[goal.priority]}</span>
                    </div>
                    <p>{goal.note || "暂无备注"}</p>
                  </div>
                </div>
                <div className="summary-metrics">
                  <span>{completed} 次完成</span>
                  <span>{goal.startDate} 开始</span>
                  {longTermRate !== undefined && <span>{longTermRate}% 进度</span>}
                </div>
                <div className="button-row">
                  {goal.archivedAt ? (
                    <button onClick={() => void restoreGoal(goal.id)}>
                      <RotateCcw size={17} />
                      恢复
                    </button>
                  ) : (
                    <button onClick={() => void archiveGoal(goal.id)}>
                      <Archive size={17} />
                      归档
                    </button>
                  )}
                  <button className="danger" onClick={() => void removeGoal(goal.id)}>
                    <Trash2 size={17} />
                    删除
                  </button>
                </div>
              </article>
            );
          })}
          {!visibleGoals.length && <EmptyState icon={Target} title="这里还空着" text="左侧创建第一个目标，它会立刻出现在今日视图里。" />}
        </div>
      </div>
    </section>
  );
}

function RecordsView({
  goals,
  checkIns,
  journals,
}: {
  goals: Goal[];
  checkIns: CheckIn[];
  journals: ReturnType<typeof useLedgerStore.getState>["journals"];
}) {
  const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
  const removeCheckIn = useLedgerStore((state) => state.removeCheckIn);
  const records = [...checkIns].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const days = monthGrid();

  return (
    <section className="view-grid records-grid">
      <div className="record-list">
        <div className="section-header">
          <div>
            <p className="eyebrow">过程记录</p>
            <h2>打卡历史</h2>
          </div>
        </div>
        {records.map((record) => {
          const goal = goalMap.get(record.goalId);
          if (!goal) return null;
          return (
            <article className="record-row" key={record.id} style={{ "--goal": goal.color } as React.CSSProperties}>
              <span className="goal-dot" />
              <div>
                <strong>{goal.title}</strong>
                <p>
                  {record.date} · {statusText[record.status]}
                  {record.mood ? ` · ${moodText[record.mood]}` : ""}
                  {typeof record.progressValue === "number" ? ` · ${record.progressValue}${goal.unit || ""}` : ""}
                </p>
                {record.note && <blockquote>{record.note}</blockquote>}
              </div>
              <button className="icon-button" onClick={() => void removeCheckIn(record.id)} aria-label="删除记录">
                <Trash2 size={17} />
              </button>
            </article>
          );
        })}
        {!records.length && <EmptyState icon={History} title="暂无打卡记录" text="从今日视图完成一次打卡后，过程会沉淀到这里。" />}
      </div>

      <aside className="side-stack">
        <section className="panel">
          <div className="panel-title">
            <h3>本月日历</h3>
            <CalendarDays size={18} />
          </div>
          <div className="calendar-grid">
            {days.map((date) => {
              const dayRecords = checkIns.filter((item) => item.date === date);
              const hasJournal = journals.some((journal) => journal.date === date);
              return (
                <div key={date} className={dayRecords.some((item) => item.status === "completed") ? "calendar-day done" : "calendar-day"}>
                  <span>{Number(date.slice(-2))}</span>
                  <small>{dayRecords.length || ""}</small>
                  {hasJournal && <i />}
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h3>日记摘录</h3>
            <FileText size={18} />
          </div>
          <div className="journal-list">
            {journals.slice(0, 6).map((journal) => (
              <article key={journal.id}>
                <strong>{journal.date}</strong>
                <p>{journal.text}</p>
              </article>
            ))}
            {!journals.length && <p className="muted">还没有写过日记。</p>}
          </div>
        </section>
      </aside>
    </section>
  );
}

function StatsView({ goals, checkIns }: { goals: Goal[]; checkIns: CheckIn[] }) {
  const days = lastDays(30);
  const totalDue = days.reduce((sum, date) => sum + goals.filter((goal) => isGoalDueOn(goal, date)).length, 0);
  const totalDone = days.reduce((sum, date) => {
    const due = goals.filter((goal) => isGoalDueOn(goal, date));
    return sum + completedCount(due.map((goal) => getCheckIn(checkIns, goal.id, date)));
  }, 0);
  const rate = totalDue ? Math.round((totalDone / totalDue) * 100) : 0;
  const highPriority = goals.filter((goal) => goal.priority === "high").length;
  const longTermGoals = goals.filter((goal) => goal.kind === "longTerm");

  return (
    <section className="stats-view">
      <div className="metric-grid">
        <Metric title="30 天完成率" value={`${rate}%`} detail={`${totalDone}/${totalDue} 次推进`} />
        <Metric title="进行中目标" value={goals.length.toString()} detail={`${highPriority} 个高优先级`} />
        <Metric title="长期目标" value={longTermGoals.length.toString()} detail="按进度和记录双线观察" />
      </div>

      <section className="panel">
        <div className="panel-title">
          <h3>30 天趋势</h3>
          <BarChart3 size={18} />
        </div>
        <div className="bar-chart">
          {days.map((date) => {
            const due = goals.filter((goal) => isGoalDueOn(goal, date));
            const done = completedCount(due.map((goal) => getCheckIn(checkIns, goal.id, date)));
            const dayRate = due.length ? Math.round((done / due.length) * 100) : 0;
            return (
              <span key={date} style={{ "--bar": `${Math.max(6, dayRate)}%` } as React.CSSProperties} title={`${date} ${dayRate}%`}>
                <i />
              </span>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>长期目标进度</h3>
          <Target size={18} />
        </div>
        <div className="progress-list">
          {longTermGoals.map((goal) => {
            const latest = checkIns.filter((item) => item.goalId === goal.id && typeof item.progressValue === "number")[0];
            const progress = goal.targetValue && latest?.progressValue ? Math.min(100, Math.round((latest.progressValue / goal.targetValue) * 100)) : 0;
            const plannedDays = goal.endDate ? daysBetweenInclusive(goal.startDate, goal.endDate) : undefined;
            return (
              <article key={goal.id} style={{ "--goal": goal.color } as React.CSSProperties}>
                <div>
                  <strong>{goal.title}</strong>
                  <small>{plannedDays ? `${plannedDays} 天周期` : "开放周期"}</small>
                </div>
                <div className="linear-progress">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <b>{progress}%</b>
              </article>
            );
          })}
          {!longTermGoals.length && <p className="muted">还没有长期目标。</p>}
        </div>
      </section>
    </section>
  );
}

function SettingsView() {
  const exportData = useLedgerStore((state) => state.exportData);
  const importData = useLedgerStore((state) => state.importData);
  const [message, setMessage] = useState("");

  const download = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daymark-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("已生成备份文件");
  };

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      await importData(JSON.parse(text) as ExportData);
      setMessage("导入完成，当前浏览器数据已更新");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败");
    }
  };

  return (
    <section className="settings-view">
      <section className="panel">
        <div className="panel-title">
          <h3>数据备份</h3>
          <Settings size={18} />
        </div>
        <p className="muted">所有数据默认保存在当前浏览器的 IndexedDB。部署到 Cloudflare Pages 后仍是纯静态应用，换设备前请导出备份。</p>
        <div className="settings-actions">
          <button className="primary" onClick={download}>
            <Download size={17} />
            导出 JSON
          </button>
          <label className="upload-button">
            <Upload size={17} />
            导入 JSON
            <input type="file" accept="application/json" onChange={(event) => void upload(event.target.files?.[0])} />
          </label>
        </div>
        {message && <p className="notice">{message}</p>}
      </section>
    </section>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Target; title: string; text: string }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

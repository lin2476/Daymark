import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";

export const todayKey = () => format(new Date(), "yyyy-MM-dd");

export const formatDisplayDate = (dateKey: string) => format(parseISO(dateKey), "M月d日");

export const formatWeekday = (dateKey: string) => {
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  return `周${labels[parseISO(dateKey).getDay()]}`;
};

export const isDateInRange = (dateKey: string, startDate: string, endDate?: string) => {
  const date = parseISO(dateKey);
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : undefined;
  return !isBefore(date, start) && (!end || !isAfter(date, end));
};

export const dayOfWeekIndex = (dateKey: string) => {
  const day = parseISO(dateKey).getDay();
  return day === 0 ? 6 : day - 1;
};

export const monthGrid = (date = new Date()) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });
  return days.map((day) => format(day, "yyyy-MM-dd"));
};

export const lastDays = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => format(subDays(now, count - index - 1), "yyyy-MM-dd"));
};

export const daysBetweenInclusive = (startDate: string, endDate: string) =>
  Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1);

export const clampDateKey = (dateKey: string) => format(parseISO(dateKey), "yyyy-MM-dd");

export const nextDateKey = (dateKey: string) => format(addDays(parseISO(dateKey), 1), "yyyy-MM-dd");

export const isToday = (dateKey: string) => isSameDay(parseISO(dateKey), new Date());

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
}

export function getDefaultDateInputValue(yearsAhead = 1, baseDate = new Date()): string {
  const date = new Date(baseDate.getTime());
  date.setFullYear(date.getFullYear() + yearsAhead);
  return formatDateInputValue(date.getTime());
}

export function parseDateInputValue(value: string): number | null {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  // Date 会自动进位，回读一次可以拦住 2026-02-31 这类无效输入。
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

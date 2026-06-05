const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toLocalDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeDateInput(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return toLocalDate(dateInput);
  }

  const [year, month, day] = dateInput.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getWeekStart(dateInput: string | Date): string {
  const localDate = normalizeDateInput(dateInput);
  const day = localDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  localDate.setDate(localDate.getDate() + diff);

  return toIsoDate(localDate);
}

export function isIsoDateString(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

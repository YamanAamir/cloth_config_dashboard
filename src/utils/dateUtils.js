/**
 * Formats a Date object as DD/MM/YYYY.
 * @param {Date|string|number} date - Date instance, ISO string, or timestamp.
 * @returns {string} Formatted date string.
 */
export function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d)) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

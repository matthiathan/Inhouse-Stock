/** 
 * Utility functions for consistent data formatting across the app
 */

export const parseSafeDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  // Replace the space between date and time with a 'T' for Safari compatibility
  const normalizedString = dateString.replace(' ', 'T');
  const parsedDate = new Date(normalizedString);

  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatZAR = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'R 0.00';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateString: string | null | undefined): string => {
  const date = parseSafeDate(dateString);
  if (!date) return '—';
  
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export const formatDateTime = (dateString: string | null | undefined): string => {
  const date = parseSafeDate(dateString);
  if (!date) return '—';
  
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

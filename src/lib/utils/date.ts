import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatDate = (iso: string): string => {
  try { return format(parseISO(iso), 'yyyy-MM-dd', { locale: zhCN }); } catch { return iso; }
};

export const formatDateTime = (iso: string): string => {
  try { return format(parseISO(iso), 'MM-dd HH:mm', { locale: zhCN }); } catch { return iso; }
};

export const formatTime = (iso: string): string => {
  try { return format(parseISO(iso), 'HH:mm'); } catch { return iso?.slice(11, 16) || ''; }
};

export const fenToYuan = (minor: number): string => (minor / 100).toFixed(0);
export const yuanToFen = (yuan: number): number => Math.round(yuan * 100);
export const formatMoney = (minor: number): string => `¥${Number(fenToYuan(minor)).toLocaleString()}`;

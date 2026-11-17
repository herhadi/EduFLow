export function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatReadableDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

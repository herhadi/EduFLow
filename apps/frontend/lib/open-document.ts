export function openOfficeDocument(url: string) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  window.open(
    `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export function openTeachingPlanAttachment(url: string, mimeType?: string | null) {
  if (mimeType?.startsWith('image/')) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  openOfficeDocument(url);
}

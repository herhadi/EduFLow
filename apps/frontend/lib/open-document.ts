export function openOfficeDocument(url: string) {
  window.open(
    `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export function openTeachingPlanAttachment(url: string, mimeType?: string | null) {
  if (mimeType?.startsWith('image/') || mimeType === 'application/pdf') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  openOfficeDocument(url);
}

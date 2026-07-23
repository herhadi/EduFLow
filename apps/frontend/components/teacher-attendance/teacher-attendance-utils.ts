import { type AttendanceStatus } from '../../lib/api';

export const attendanceStatuses: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Hadir' },
  { value: 'SICK', label: 'Sakit' },
  { value: 'EXCUSED', label: 'Izin' },
  { value: 'ABSENT', label: 'Alpha' },
];

export const teacherAttendancePageSize = 10;
export const classPhotoMaxUploadBytes = 950 * 1024;

export type AttendanceMode = 'list' | 'quick';

export type ChecklistKey = 'teacherPresent' | 'studentAttendanceDone' | 'classPhotoDone';
export type ClassPhotoMetadata = {
  accuracy?: number;
  latitude?: number;
  longitude?: number;
  takenAt: string;
};

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function getChecklistLabel(key: ChecklistKey) {
  const labels = {
    teacherPresent: 'Guru hadir',
    studentAttendanceDone: 'Presensi siswa selesai',
    classPhotoDone: 'Foto kelas tersedia',
  };
  return labels[key];
}

export function formatClassPhotoSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function getClassPhotoMetadata(): Promise<ClassPhotoMetadata> {
  const takenAt = new Date().toISOString();

  if (!('geolocation' in navigator)) {
    return { takenAt };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 6_000,
      });
    });

    return {
      accuracy: position.coords.accuracy,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      takenAt,
    };
  } catch {
    return { takenAt };
  }
}

export function formatClassPhotoLocation(metadata?: ClassPhotoMetadata | null) {
  if (metadata?.latitude === undefined || metadata.longitude === undefined) {
    return 'Lokasi tidak tersedia';
  }

  const accuracy = metadata.accuracy ? ` · akurasi ${Math.round(metadata.accuracy)} m` : '';
  return `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}${accuracy}`;
}

export async function prepareClassPhotoForUpload(file: File, metadata: ClassPhotoMetadata) {
  if (!file.type.startsWith('image/')) {
    throw new Error('File foto harus berupa gambar.');
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Browser tidak bisa menyiapkan foto kelas.');
  }

  const maxDimension = 1600;
  const baseRatio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const qualities = [0.94, 0.9, 0.86, 0.8, 0.72, 0.62, 0.52];
  let bestBlob: Blob | null = null;
  let scale = 1;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ratio = baseRatio * scale;
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawClassPhotoWatermark(context, canvas, metadata);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      bestBlob = !bestBlob || blob.size < bestBlob.size ? blob : bestBlob;
      if (blob.size <= classPhotoMaxUploadBytes) {
        return blobToFile(blob, file);
      }
    }

    scale *= 0.82;
  }

  if (!bestBlob || bestBlob.size > 1024 * 1024) {
    throw new Error('Foto terlalu besar. Coba ambil ulang foto dengan resolusi lebih rendah.');
  }

  return blobToFile(bestBlob, file);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Foto tidak bisa dibaca oleh browser.'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Foto gagal dikompresi.'));
      }
    }, type, quality);
  });
}

function blobToFile(blob: Blob, source: File) {
  const name = source.name.replace(/\.[^.]+$/, '') || 'foto-kelas';
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

function drawClassPhotoWatermark(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  metadata: ClassPhotoMetadata,
) {
  const lines = [
    `EduFlow · ${formatClassPhotoTakenAt(metadata.takenAt)}`,
    formatClassPhotoLocation(metadata),
  ];
  const fontSize = Math.max(16, Math.round(canvas.width * 0.022));
  const padding = Math.max(12, Math.round(canvas.width * 0.018));
  const lineHeight = Math.round(fontSize * 1.35);
  const boxHeight = padding * 2 + lineHeight * lines.length;

  context.save();
  context.fillStyle = 'rgba(15, 23, 42, 0.72)';
  context.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);
  context.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.fillStyle = '#ffffff';
  lines.forEach((line, index) => {
    context.fillText(line, padding, canvas.height - boxHeight + padding + lineHeight * (index + 0.75));
  });
  context.restore();
}

function formatClassPhotoTakenAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

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

export async function prepareClassPhotoForUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('File foto harus berupa gambar.');
  }

  if (file.size <= classPhotoMaxUploadBytes && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return file;
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Browser tidak bisa menyiapkan foto kelas.');
  }

  const maxDimension = 1280;
  const baseRatio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const qualities = [0.82, 0.72, 0.62, 0.52, 0.44];
  let bestBlob: Blob | null = null;
  let scale = 1;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ratio = baseRatio * scale;
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

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

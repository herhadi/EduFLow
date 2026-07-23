const profilePhotoMaxBytes = 700 * 1024;

export function formatImageSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function prepareProfilePhotoForUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('File foto harus berupa gambar.');
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Browser tidak bisa menyiapkan foto profil.');
  }

  const maxDimension = 900;
  const baseRatio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const qualities = [0.9, 0.84, 0.76, 0.68, 0.58];
  let bestBlob: Blob | null = null;
  let scale = 1;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const ratio = baseRatio * scale;
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      bestBlob = !bestBlob || blob.size < bestBlob.size ? blob : bestBlob;
      if (blob.size <= profilePhotoMaxBytes) {
        return blobToFile(blob, file, 'foto-profil');
      }
    }

    scale *= 0.82;
  }

  if (!bestBlob || bestBlob.size > 2 * 1024 * 1024) {
    throw new Error('Foto profil terlalu besar. Pilih foto yang lebih kecil.');
  }

  return blobToFile(bestBlob, file, 'foto-profil');
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
      if (blob) resolve(blob);
      else reject(new Error('Foto gagal dikompresi.'));
    }, type, quality);
  });
}

function blobToFile(blob: Blob, source: File, fallbackName: string) {
  const name = source.name.replace(/\.[^.]+$/, '') || fallbackName;
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

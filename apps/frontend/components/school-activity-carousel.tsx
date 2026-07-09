'use client';

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type ActivityThumbnail = {
  category: string;
  href: string;
  title: string;
  tone: string;
};

const slideSummaries: Record<string, string> = {
  Kegiatan:
    'Aktivitas belajar, pembiasaan, dan dokumentasi kelas tampil sebagai wajah utama sekolah.',
  'Info Terbaru':
    'Pengumuman penting untuk siswa dan wali murid ditempatkan pada area yang mudah ditemukan.',
  PPDB:
    'Informasi penerimaan peserta didik baru bisa diarahkan ke halaman alur dan persyaratan.',
  Prestasi:
    'Capaian siswa, lomba, dan kegiatan pembinaan ditampilkan sebagai bukti perkembangan sekolah.',
  Galeri:
    'Foto kegiatan sekolah menjadi arsip publik yang rapi dan nyaman dibuka dari perangkat mobile.',
};

function getSlideClass(tone: string) {
  if (tone === 'green') {
    return 'school-carousel-slide school-carousel-slide--green';
  }

  if (tone === 'amber') {
    return 'school-carousel-slide school-carousel-slide--amber';
  }

  if (tone === 'rose') {
    return 'school-carousel-slide school-carousel-slide--rose';
  }

  return 'school-carousel-slide';
}

export function SchoolActivityCarousel({
  items,
}: {
  items: ActivityThumbnail[];
}) {
  const intervalRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeItem = items[activeIndex];

  useEffect(() => {
    if (items.length <= 1 || isPaused) {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 4800);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, items.length]);

  if (!activeItem) {
    return null;
  }

  function moveSlide(direction: 'next' | 'previous') {
    setActiveIndex((current) => {
      if (direction === 'next') {
        return (current + 1) % items.length;
      }

      return (current - 1 + items.length) % items.length;
    });
  }

  return (
    <section
      aria-label="Sorotan kegiatan sekolah"
      className="school-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={getSlideClass(activeItem.tone)}>
        <div className="school-carousel-visual" aria-hidden="true">
          <div className="school-carousel-device school-carousel-device-main">
            <img
              alt=""
              className="h-24 w-24 object-contain opacity-95"
              src="/logo_sekolah.webp"
            />
            <span />
            <span />
            <span />
          </div>
          <div className="school-carousel-device school-carousel-device-side">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="school-carousel-content">
          <p className="school-carousel-kicker">{activeItem.category}</p>
          <h3>{activeItem.title}</h3>
          <p>
            {slideSummaries[activeItem.category] ??
              'Informasi sekolah ditampilkan ringkas, visual, dan mudah diakses.'}
          </p>
          <Link className="school-carousel-link" href={activeItem.href}>
            Lihat detail
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="school-carousel-controls">
          <button
            aria-label="Slide sebelumnya"
            className="school-carousel-arrow"
            onClick={() => moveSlide('previous')}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            aria-label="Slide berikutnya"
            className="school-carousel-arrow"
            onClick={() => moveSlide('next')}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <div className="school-carousel-tabs" role="tablist">
        {items.map((item, index) => (
          <button
            aria-label={`Tampilkan ${item.title}`}
            aria-selected={index === activeIndex}
            className={
              index === activeIndex
                ? 'school-carousel-tab school-carousel-tab-active'
                : 'school-carousel-tab'
            }
            key={item.title}
            onClick={() => setActiveIndex(index)}
            role="tab"
            type="button"
          >
            <span>{item.category}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

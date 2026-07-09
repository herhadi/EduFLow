'use client';

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  const resetTimerRef = useRef<number | null>(null);
  const [renderedIndex, setRenderedIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const renderedItems = useMemo(() => {
    if (items.length <= 1) {
      return items;
    }

    return [items[items.length - 1], ...items, items[0]];
  }, [items]);

  const activeIndex =
    items.length <= 1 ? 0 : (renderedIndex - 1 + items.length) % items.length;

  useEffect(() => {
    if (items.length <= 1 || isPaused || !isPageVisible) {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRenderedIndex((current) => current + 1);
    }, 4800);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isPageVisible, isPaused, items.length]);

  useEffect(() => {
    function handleVisibilityChange() {
      const nextIsVisible = document.visibilityState === 'visible';
      setIsPageVisible(nextIsVisible);

      if (nextIsVisible && items.length > 1) {
        setIsTransitioning(false);
        setRenderedIndex((current) =>
          ((current - 1 + items.length) % items.length) + 1,
        );
      }
    }

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    if (renderedIndex > 0 && renderedIndex < items.length + 1) {
      return;
    }

    resetTimerRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      setRenderedIndex(renderedIndex <= 0 ? items.length : 1);
    }, 780);

    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, [items.length, renderedIndex]);

  useEffect(() => {
    if (isTransitioning) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsTransitioning(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isTransitioning]);

  if (items.length === 0) {
    return null;
  }

  function moveSlide(direction: 'next' | 'previous') {
    setIsTransitioning(true);
    setRenderedIndex((current) => {
      const normalized = ((current - 1 + items.length) % items.length) + 1;
      return normalized + (direction === 'next' ? 1 : -1);
    });
  }

  function jumpToRealIndex(index: number) {
    setIsTransitioning(true);
    setRenderedIndex(items.length <= 1 ? index : index + 1);
  }

  function handleTransitionEnd() {
    if (items.length <= 1) {
      return;
    }

    if (renderedIndex === 0) {
      setIsTransitioning(false);
      setRenderedIndex(items.length);
      return;
    }

    if (renderedIndex === items.length + 1) {
      setIsTransitioning(false);
      setRenderedIndex(1);
    }
  }

  return (
    <section
      aria-label="Sorotan kegiatan sekolah"
      className="school-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="school-carousel-viewport">
        <div
          className="school-carousel-track"
          onTransitionEnd={handleTransitionEnd}
          style={{
            transform: `translateX(-${renderedIndex * 100}%)`,
            transition: isTransitioning ? undefined : 'none',
          }}
        >
          {renderedItems.map((item, index) => (
            <div className={getSlideClass(item.tone)} key={`${item.title}-${index}`}>
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
                <p className="school-carousel-kicker">{item.category}</p>
                <h3>{item.title}</h3>
                <p>
                  {slideSummaries[item.category] ??
                    'Informasi sekolah ditampilkan ringkas, visual, dan mudah diakses.'}
                </p>
                <Link className="school-carousel-link" href={item.href}>
                  Lihat detail
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          ))}
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
            onClick={() => jumpToRealIndex(index)}
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

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type ActivityThumbnail = {
  category: string;
  href: string;
  title: string;
  tone: string;
};

function getThumbnailToneClass(tone: string) {
  if (tone === 'green') return 'school-thumbnail-media school-thumbnail-media--green';
  if (tone === 'amber') return 'school-thumbnail-media school-thumbnail-media--amber';
  if (tone === 'rose') return 'school-thumbnail-media school-thumbnail-media--rose';
  return 'school-thumbnail-media';
}

export function SchoolActivityCarousel({
  items,
}: {
  items: ActivityThumbnail[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<number | null>(null);
  const activeRenderedIndexRef = useRef(0);
  const isPausedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeRenderedIndex, setActiveRenderedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Buat 3 set items: [1,2,3,4,5, 1,2,3,4,5, 1,2,3,4,5]
  const renderedItems = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items, ...items];
  }, [items]);

  const totalRealItems = items.length;
  const startIndex = totalRealItems; // Mulai dari item pertama di set kedua

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Inisialisasi posisi awal di set kedua
  useEffect(() => {
    if (renderedItems.length === 0) return;
    
    setTimeout(() => {
      jumpToRenderedIndex(startIndex, false);
    }, 50);

    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, [renderedItems.length, startIndex]);

  // Auto play
  useEffect(() => {
    if (items.length <= 1 || renderedItems.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      if (isPausedRef.current) {
        return;
      }
      scrollToRenderedIndex(activeRenderedIndexRef.current + 1);
    }, 2800);

    return () => window.clearInterval(interval);
  }, [items.length, renderedItems.length]);

  function jumpToRenderedIndex(index: number, smooth: boolean = true) {
    const track = trackRef.current;
    const target = track?.children[index] as HTMLElement | undefined;

    if (!track || !target) {
      return;
    }

    track.scrollTo({
      behavior: smooth ? 'smooth' : 'auto',
      left: target.offsetLeft - (track.clientWidth - target.clientWidth) / 2,
    });
    
    setRenderedIndex(index);
  }

  function scrollToRenderedIndex(index: number) {
    const totalItems = renderedItems.length;
    
    // Jika sudah di ujung (set ketiga), pindah ke set kedua tanpa animasi
    if (index >= totalItems - 1) {
      jumpToRenderedIndex(index);
      
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        // Pindah ke set kedua (index - totalRealItems)
        jumpToRenderedIndex(index - totalRealItems, false);
      }, 600);
    } 
    // Jika di awal (set pertama), pindah ke set kedua tanpa animasi
    else if (index <= 0) {
      jumpToRenderedIndex(index);
      
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        // Pindah ke set kedua (index + totalRealItems)
        jumpToRenderedIndex(index + totalRealItems, false);
      }, 600);
    } 
    else {
      jumpToRenderedIndex(index);
    }
  }

  function setRenderedIndex(index: number) {
    activeRenderedIndexRef.current = index;
    setActiveRenderedIndex(index);
    setActiveIndex(index % items.length);
  }

  function syncActiveIndex() {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const children = Array.from(track.children) as HTMLElement[];
    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    const nearestIndex = children.reduce(
      (nearest, child, index) => {
        const childCenter = child.offsetLeft + child.clientWidth / 2;
        const distance = Math.abs(childCenter - trackCenter);
        return distance < nearest.distance ? { distance, index } : nearest;
      },
      { distance: Number.POSITIVE_INFINITY, index: 0 },
    ).index;

    if (nearestIndex !== activeRenderedIndexRef.current) {
      setRenderedIndex(nearestIndex);
    }
  }

  return (
    <div
      className="school-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="school-carousel-track no-scrollbar flex gap-4 overflow-x-auto pb-1"
        onScroll={() => {
          syncActiveIndex();
        }}
        ref={trackRef}
      >
        {renderedItems.map((item, index) => (
          <Link
            aria-label={`Buka detail ${item.title}`}
            className={
              index === activeRenderedIndex
                ? 'school-thumbnail-card school-thumbnail-card-active'
                : 'school-thumbnail-card'
            }
            href={item.href}
            onFocus={() => scrollToRenderedIndex(index)}
            key={`${item.title}-${index}`}
          >
            <div className={getThumbnailToneClass(item.tone)}>
              <img
                alt=""
                aria-hidden="true"
                className="h-20 w-20 object-contain opacity-80"
                src="/logo_sekolah.webp"
              />
            </div>
            <div className="p-4">
              <p className="school-news-date">{item.category}</p>
              <h3 className="mt-1 text-base font-black leading-6 text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm font-bold text-brand-700">
                Lihat detail
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {items.map((item, index) => (
          <button
            aria-label={`Tampilkan ${item.title}`}
            className={
              index === activeIndex
                ? 'school-carousel-dot school-carousel-dot-active'
                : 'school-carousel-dot'
            }
            key={item.title}
            onClick={() => scrollToRenderedIndex(index + totalRealItems)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
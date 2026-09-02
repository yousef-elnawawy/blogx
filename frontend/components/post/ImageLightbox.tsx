"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

interface ImageLightboxProps {
  images: string[];
  open: boolean;
  index?: number;
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageLightbox({
  images,
  open,
  index = 0,
  initialIndex = 0,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(index ?? initialIndex ?? 0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragYOffset, setDragYOffset] = useState(0);

  const y = useMotionValue(0);
  const opacity = useTransform(y, [-250, 0, 250], [0.4, 1, 0.4]);
  const scale = useTransform(y, [-250, 0, 250], [0.85, 1, 0.85]);

  useEffect(() => {
    if (open) {
      setCurrentIndex(index ?? initialIndex ?? 0);
      setZoomLevel(1);
      setDragYOffset(0);
      y.set(0);
    }
  }, [open, index, initialIndex, y]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setZoomLevel(1);
      setCurrentIndex((prev) => (prev + 1) % images.length);
    },
    [images.length]
  );

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setZoomLevel(1);
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    },
    [images.length]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "+" || e.key === "=") {
        setZoomLevel((z) => Math.min(z + 0.5, 3));
      } else if (e.key === "-") {
        setZoomLevel((z) => Math.max(z - 0.5, 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, handleNext, handlePrev]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(currentImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `blogx-image-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch {
      window.open(currentImage, "_blank");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Image from BlogX",
          url: currentImage,
        });
      } catch {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(currentImage);
      toast.success("Image URL copied to clipboard");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md select-none touch-none overflow-hidden"
          onClick={onClose}
        >
          {/* Top Bar Controls */}
          <div
            className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-white/90 border border-white/15">
              <span>{currentIndex + 1}</span>
              <span className="text-white/50">/</span>
              <span>{images.length}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 3))}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title="Zoom in (+)"
              >
                <ZoomIn className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 1))}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title="Zoom out (-)"
              >
                <ZoomOut className="size-4" />
              </button>

              {zoomLevel > 1 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                  title="Reset zoom"
                >
                  <RotateCcw className="size-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleDownload}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title="Download image"
              >
                <Download className="size-4" />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title="Share image"
              >
                <Share2 className="size-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="size-9 rounded-full bg-white/15 hover:bg-rose-500/80 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer ml-2"
                title="Close (Esc)"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Previous Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-4 z-30 size-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-lg transition-all active:scale-90 cursor-pointer border border-white/15 shadow-xl"
              title="Previous image"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Image Container with Drag-to-Dismiss */}
          <motion.div
            style={{ y, opacity, scale }}
            drag={zoomLevel === 1 ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 500) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-full max-h-full flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                src={currentImage}
                alt={`Image ${currentIndex + 1}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: zoomLevel }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
                draggable={false}
                onDoubleClick={() => setZoomLevel((z) => (z === 1 ? 2 : 1))}
              />
            </AnimatePresence>
          </motion.div>

          {/* Next Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 z-30 size-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-lg transition-all active:scale-90 cursor-pointer border border-white/15 shadow-xl"
              title="Next image"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Bottom Indicators */}
          {images.length > 1 && (
            <div
              className="absolute bottom-4 inset-x-0 z-30 flex items-center justify-center gap-2 p-2 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setCurrentIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    i === currentIndex
                      ? "w-7 bg-primary"
                      : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

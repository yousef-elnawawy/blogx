"use client";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

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
  if (!images || images.length === 0) return null;

  const slides = images.map((src) => ({ src }));

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index ?? initialIndex}
      slides={slides}
      render={{
        buttonPrev: slides.length <= 1 ? () => null : undefined,
        buttonNext: slides.length <= 1 ? () => null : undefined,
      }}
    />
  );
}

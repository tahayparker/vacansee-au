/**
 * Image Optimization Utilities
 *
 * Provides utilities for optimizing images and handling responsive images.
 * Includes lazy loading, WebP support, and responsive image handling.
 */

import { useState, useEffect, useRef } from "react";

/**
 * Image optimization configuration
 */
export const imageConfig = {
  // Quality settings for different image types
  quality: {
    avatar: 80,
    thumbnail: 85,
    hero: 90,
    icon: 95,
  },

  // Sizes for responsive images
  sizes: {
    avatar: [32, 64, 128],
    thumbnail: [150, 300, 600],
    hero: [400, 800, 1200, 1600],
    icon: [16, 32, 64, 128],
  },

  // Formats to try in order of preference
  formats: ["webp", "avif", "jpeg", "png"],
} as const;

/**
 * Generate responsive image sources
 */
export function generateImageSources(
  src: string,
  sizes: number[],
  quality: number = 85,
): Array<{ src: string; width: number; quality: number }> {
  return sizes.map((size) => ({
    src: `${src}?w=${size}&q=${quality}`,
    width: size,
    quality,
  }));
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src =
      "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
  });
}

/**
 * Check if browser supports AVIF
 */
export function supportsAVIF(): Promise<boolean> {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMgkfAAAAR3N0YmwCCAAgBBEgnAAEEZQABAAAB4k=";
  });
}

/**
 * Get optimal image format for current browser
 */
export async function getOptimalFormat(): Promise<string> {
  if (await supportsAVIF()) return "avif";
  if (await supportsWebP()) return "webp";
  return "jpeg";
}

/**
 * Optimize image URL with format and quality
 */
export async function optimizeImageUrl(
  src: string,
  width?: number,
  quality?: number,
  format?: string,
): Promise<string> {
  const optimalFormat = format || (await getOptimalFormat());
  const params = new URLSearchParams();

  if (width) params.set("w", width.toString());
  if (quality) params.set("q", quality.toString());
  if (optimalFormat !== "jpeg") params.set("f", optimalFormat);

  const queryString = params.toString();
  return queryString ? `${src}?${queryString}` : src;
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(
  src: string,
  options: {
    threshold?: number;
    rootMargin?: string;
  } = {},
) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || "50px",
      },
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [src, options.threshold, options.rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsError(false);
  };

  const handleError = () => {
    setIsError(true);
    setIsLoaded(false);
  };

  return {
    imgRef,
    imageSrc,
    isLoaded,
    isError,
    handleLoad,
    handleError,
  };
}

/**
 * Hook for responsive images
 */
export function useResponsiveImage(
  src: string,
  sizes: number[],
  quality: number = 85,
) {
  const [sources, setSources] = useState<Array<{ src: string; width: number }>>(
    [],
  );
  const [optimalSrc, setOptimalSrc] = useState<string>("");

  useEffect(() => {
    const generateSources = async () => {
      const format = await getOptimalFormat();
      const newSources = await Promise.all(
        sizes.map(async (size) => ({
          src: await optimizeImageUrl(src, size, quality, format),
          width: size,
        })),
      );

      setSources(newSources);

      // Set optimal source based on viewport
      const viewportWidth = window.innerWidth;
      const optimalSize =
        sizes.find((size) => size >= viewportWidth) || sizes[sizes.length - 1];
      const optimalSource = newSources.find((s) => s.width === optimalSize);
      if (optimalSource) {
        setOptimalSrc(optimalSource.src);
      }
    };

    generateSources();
  }, [src, sizes, quality]);

  return {
    sources,
    optimalSrc,
  };
}

/**
 * Image preloading utility
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Preload multiple images
 */
export async function preloadImages(
  srcs: string[],
): Promise<HTMLImageElement[]> {
  return Promise.all(srcs.map(preloadImage));
}

/**
 * Get image dimensions
 */
export function getImageDimensions(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Optimize image for different use cases
 */
export const imageOptimization = {
  /**
   * Optimize avatar image
   */
  avatar: async (src: string, size: number = 64) => {
    return optimizeImageUrl(src, size, imageConfig.quality.avatar);
  },

  /**
   * Optimize thumbnail image
   */
  thumbnail: async (src: string, size: number = 300) => {
    return optimizeImageUrl(src, size, imageConfig.quality.thumbnail);
  },

  /**
   * Optimize hero image
   */
  hero: async (src: string, size: number = 1200) => {
    return optimizeImageUrl(src, size, imageConfig.quality.hero);
  },

  /**
   * Optimize icon image
   */
  icon: async (src: string, size: number = 64) => {
    return optimizeImageUrl(src, size, imageConfig.quality.icon);
  },
} as const;

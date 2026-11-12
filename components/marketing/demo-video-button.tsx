"use client";

import React, { useRef } from "react";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD } from "@/components/marketing/brand";

const VIDEO_SRC = "/videos/culturepulse-demo.mp4";
const POSTER_SRC = "/videos/culturepulse-demo-poster.jpg";
const CAPTIONS_SRC = "/videos/culturepulse-demo.en.vtt";

/**
 * Hero button that opens the product demo in a pop-up player and starts it with sound.
 * Uses a native <dialog> for focus trapping, Esc to close and an inert page behind it.
 */
export function DemoVideoButton({
  className,
  variant = "button",
  children,
}: {
  className?: string;
  /** "button" is the yellow hero pill; "link" is an inline text link with a small play icon. */
  variant?: "button" | "link";
  children?: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function open() {
    dialogRef.current?.showModal();
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => {
        /* Autoplay blocked: the controls are there to press play. */
      });
    }
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          className={cn(
            "inline-flex items-center gap-2 text-[15px] font-bold text-[#111110] underline decoration-2 underline-offset-4 hover:text-[#0B6B45] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B6B45]",
            className
          )}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#111110] bg-[#FFE14D]" aria-hidden>
            <Play className="ml-px h-2.5 w-2.5 fill-current" />
          </span>
          {children ?? "Watch the 54-second demo"}
        </button>
      ) : (
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={cn(
          "group inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full border-2 border-[#111110] bg-[#FFE14D] px-7 py-[14px] text-[17px] font-bold text-[#111110] shadow-[4px_4px_0_#111110] transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#111110] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_#111110] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B6B45]",
          className
        )}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#111110] text-[#FFE14D]" aria-hidden>
          <Play className="ml-px h-3 w-3 fill-current" />
        </span>
        {children ?? "See it in action"}
      </button>
      )}

      <dialog
        ref={dialogRef}
        aria-label="CulturePulse product demo"
        onClose={() => videoRef.current?.pause()}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself) closes it.
          if (e.target === dialogRef.current) close();
        }}
        className="w-[min(1120px,calc(100vw-2rem))] max-w-none overflow-visible bg-transparent p-0 backdrop:bg-[#111110]/80 backdrop:backdrop-blur-sm"
      >
        <div className="relative">
          <button
            type="button"
            onClick={close}
            aria-label="Close video"
            className="absolute -top-14 right-0 inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#111110] bg-[#F2EDE3] text-[#111110] shadow-[3px_3px_0_#111110] transition-colors hover:bg-[#FFE14D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE14D]"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <div className={cn(CARD, "overflow-hidden")}>
            <video
              ref={videoRef}
              className="block aspect-video w-full bg-[#F2EDE3]"
              src={VIDEO_SRC}
              poster={POSTER_SRC}
              controls
              playsInline
              preload="none"
            >
              <track kind="captions" src={CAPTIONS_SRC} srcLang="en" label="English" />
            </video>
          </div>
        </div>
      </dialog>
    </>
  );
}

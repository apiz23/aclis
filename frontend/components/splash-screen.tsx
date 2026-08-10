"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export function SplashScreen() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("aclis_splash_shown")) return
    sessionStorage.setItem("aclis_splash_shown", "1")
    setShow(true)
    const timer = setTimeout(() => setShow(false), 2800)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-navy text-white">
      <div className="flex flex-col items-center gap-6">
        {/* Logo — scale in */}
        <div className="size-20 overflow-hidden animate-in zoom-in-0 duration-700">
          <Image
            src="/icons/android-chrome-192x192.png"
            alt="ACLIS"
            width={80}
            height={80}
            className="size-full object-contain"
          />
        </div>

        {/* Brand line — slide down */}
        <div className="text-center animate-in slide-in-from-top-3 fade-in duration-700 delay-200 fill-mode-both">
          <p className="font-heading text-[13px] font-semibold uppercase tracking-[0.12em] text-gold">
            Kerajaan Malaysia
          </p>
          <p className="font-heading text-[15px] font-semibold uppercase tracking-[0.12em] text-white/55">
            Pejabat Daerah dan Tanah
          </p>
        </div>

        {/* Wordmark — fade up */}
        <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-700 delay-500 fill-mode-both">
          <h1 className="font-heading text-[56px] font-bold uppercase leading-[0.95] tracking-[0.02em] text-white">
            Pontian
          </h1>
          <div className="mx-auto my-5 h-[3px] w-[52px] bg-gold scale-x-0 animate-in zoom-in duration-500 delay-800 fill-mode-both" />
          <p className="font-heading text-[17px] font-semibold uppercase leading-[1.4] tracking-[0.06em] text-white/70">
            Sistem Pengurusan Daerah
          </p>
        </div>

        {/* Loading dots — stagger */}
        <div className="mt-8 flex items-center gap-2">
          <div className="size-2 animate-bounce rounded-full bg-gold" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
          <div className="size-2 animate-bounce rounded-full bg-gold" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
          <div className="size-2 animate-bounce rounded-full bg-gold" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
        </div>
      </div>
    </div>
  )
}

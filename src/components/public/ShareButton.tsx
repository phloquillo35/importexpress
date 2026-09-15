"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Share2, Link2, MessageCircle, Send } from "lucide-react"

interface ShareButtonProps {
  /** "icon": solo el ícono circular (navbar). "full": ícono + texto "Compartir" (páginas de producto, menú mobile). */
  variant?: "icon" | "full"
  /** Título/texto a compartir. Si no se pasa, se usa el título de la página actual. */
  title?: string
  className?: string
  /** Lado desde el que se despliega el menú. Default "right". */
  menuAlign?: "left" | "right"
}

export function ShareButton({ variant = "icon", title, className = "", menuAlign = "right" }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [mounted] = useState(() => typeof document !== "undefined")
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuWidth = 256
      setMenuPos({
        top: rect.bottom + 8,
        left: menuAlign === "left" ? rect.left : Math.max(8, rect.right - menuWidth),
      })
    }
    updatePosition()
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open, menuAlign])

  function getShareData() {
    const shareUrl = typeof window !== "undefined" ? window.location.href : ""
    const shareText = title ?? (typeof document !== "undefined" ? document.title : "Lo Pedís, Lo Tenes")
    return { shareUrl, shareText }
  }

  function handleCopyLink() {
    const { shareUrl } = getShareData()
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  function handleNativeShare() {
    const { shareUrl, shareText } = getShareData()
    if (navigator.share) {
      navigator.share({ title: shareText, url: shareUrl }).catch(() => {})
      setOpen(false)
    }
  }

  const { shareUrl, shareText } = getShareData()

  const menu = open && mounted && createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
      className="z-[100] w-64 bg-card border border-border/60 rounded-2xl shadow-xl p-2"
    >
      {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
        <button
          onClick={handleNativeShare}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-xl transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Compartir...
        </button>
      )}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-xl transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-xl transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94z"/></svg>
        Facebook
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-xl transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.9 1.9h3.68l-8.04 9.19L24 22.1h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.9h7.59l5.24 6.93zm-1.3 18h2.04L6.5 3.98H4.3z"/></svg>
        X (Twitter)
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-xl transition-colors"
      >
        <Send className="w-4 h-4" />
        Telegram
      </a>
      <button
        onClick={handleCopyLink}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-xl transition-colors"
      >
        <Link2 className="w-4 h-4" />
        {linkCopied ? "¡Enlace copiado!" : "Copiar enlace"}
      </button>
    </div>,
    document.body
  )

  return (
    <div className={className}>
      {variant === "icon" ? (
        <button
          ref={buttonRef}
          onClick={() => setOpen(v => !v)}
          className="flex items-center justify-center min-w-11 min-h-11 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Compartir"
          title="Compartir"
        >
          <Share2 className="w-5 h-5" />
        </button>
      ) : (
        <button
          ref={buttonRef}
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
        >
          <Share2 className="w-5 h-5" />
          Compartir
        </button>
      )}
      {menu}
    </div>
  )
}

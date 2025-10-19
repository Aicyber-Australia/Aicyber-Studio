"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

export type ToastVariant = "default" | "success" | "error" | "warning" | "info"

export type ToastProps = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  onClose?: () => void
}

const ToastIcon = ({ variant }: { variant: ToastVariant }) => {
  switch (variant) {
    case "success":
      return <CheckCircle className="h-3 w-3 text-green-500" />
    case "error":
      return <AlertCircle className="h-3 w-3 text-red-500" />
    case "warning":
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />
    case "info":
      return <Info className="h-3 w-3 text-blue-500" />
    default:
      return <Info className="h-3 w-3 text-gray-500" />
  }
}

export function Toast({ 
  id, 
  title, 
  description, 
  variant = "default", 
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300) // Wait for animation to complete
    }, 3000) // Auto close after 3 seconds

    return () => clearTimeout(timer)
  }, [onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose?.(), 300)
  }

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-xs overflow-hidden rounded-md border bg-background/95 backdrop-blur-sm shadow-lg transition-all duration-300",
        isVisible 
          ? "translate-x-0 opacity-100" 
          : "translate-x-full opacity-0"
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <ToastIcon variant={variant} />
        <div className="flex-1 space-y-0.5">
          {title && (
            <div className="text-xs font-medium text-foreground">
              {title}
            </div>
          )}
          {description && (
            <div className="text-xs text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {children}
    </div>
  )
}

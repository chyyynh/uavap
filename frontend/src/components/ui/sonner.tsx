'use client'

import { Toaster as Sonner, toast } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            'group bg-[var(--uav-panel)] border border-[var(--uav-stroke)] rounded-[var(--uav-radius-sm)] shadow-[var(--uav-shadow-md)]',
          title: 'text-[var(--uav-text)] text-sm font-medium',
          description: 'text-[var(--uav-text-secondary)] text-xs',
          actionButton:
            'bg-[var(--uav-teal)] text-white text-xs px-2 py-1 rounded-[var(--uav-radius-xs)] hover:bg-[var(--uav-teal)]/90',
          cancelButton:
            'bg-white/6 text-[var(--uav-text-secondary)] text-xs px-2 py-1 rounded-[var(--uav-radius-xs)] hover:bg-white/10',
          closeButton:
            'bg-white/6 border-[var(--uav-stroke)] hover:bg-white/10 text-[var(--uav-text-secondary)]',
          success: 'border-[var(--uav-success)]/20',
          error: 'border-[var(--uav-error)]/20',
          warning: 'border-[var(--uav-warning)]/20',
          info: 'border-[var(--uav-teal)]/20',
        },
      }}
      {...props}
    />
  )
}

// Toast utility functions
const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),
  error: (message: string, description?: string) =>
    toast.error(message, { description }),
  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),
  info: (message: string, description?: string) =>
    toast.info(message, { description }),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string | number) => toast.dismiss(id),
  promise: toast.promise,
}

export { Toaster, notify, toast }

export type ToastKind = "info" | "warning" | "error";

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
};

export default function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toastHost" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role="status">
          <div className="toastTop">
            <div className="toastTitle">{t.title}</div>
            <button
              className="toastX"
              onClick={() => onDismiss(t.id)}
              type="button"
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
          {t.message ? <div className="toastMsg">{t.message}</div> : null}
        </div>
      ))}
    </div>
  );
}

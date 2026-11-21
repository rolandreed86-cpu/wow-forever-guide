export function Loading({ what }: { what: string }) {
  return (
    <div className="frame p-5 text-muted italic" role="status" aria-live="polite">
      Consulting the archives for {what}…
    </div>
  );
}

export function LoadError({ what, error, retry }: { what: string; error: unknown; retry?: () => void }) {
  return (
    <div className="frame p-5 flex flex-col gap-3" role="alert">
      <div className="lbl">Couldn't load {what}</div>
      <div className="text-[15px] text-[#d9c79a]">
        {error instanceof Error ? error.message : "The data source didn't answer."} The rest of the app still works with its built-in data.
      </div>
      {retry && <div><button type="button" className="btn ghost" onClick={retry}>Try again</button></div>}
    </div>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="lbl">{eyebrow}</div>
      <h1 className="heading text-3xl sm:text-4xl m-0">{title}</h1>
      {children && <p className="m-0 italic text-[#bfa978] max-w-3xl">{children}</p>}
    </div>
  );
}

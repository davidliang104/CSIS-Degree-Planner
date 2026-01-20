import { useDroppable } from "@dnd-kit/core";

export default function TermTileDropZone({
  termK,
  isInvalid = false,
  className,
  onClick,
  children,
}: {
  termK: string;
  isInvalid?: boolean;
  className: string;
  onClick?: () => void;
  children: (args: { isOver: boolean }) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `term:${termK}`,
    data: { kind: "term" as const, termK },
  });

  return (
    <section
      ref={setNodeRef}
      className={`${className} ${isInvalid ? "termDropDisabled" : ""}`}
      onClick={onClick}
    >
      {children({ isOver })}
    </section>
  );
}

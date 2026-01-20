import { useDroppable } from "@dnd-kit/core";

export default function TermDropZone({
  termK,
  isInvalid = false,
  children,
}: {
  termK: string;
  isInvalid?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `term:${termK}`,
    data: { kind: "term" as const, termK },
  });

  return (
    <div
      ref={setNodeRef}
      className={`termBody ${isInvalid ? "dropDisabled" : isOver ? "dropOver" : ""}`}
    >
      {children}
    </div>
  );
}

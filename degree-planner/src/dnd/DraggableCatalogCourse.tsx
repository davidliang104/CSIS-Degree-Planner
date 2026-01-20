import { useDraggable } from "@dnd-kit/core";

export default function DraggableCatalogCourse({
  courseId,
  disabled,
  children,
}: {
  courseId: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `catalog:${courseId}`,
      data: { kind: "catalog" as const, courseId },
      disabled,
    });

  const style: React.CSSProperties = {
  width: "100%",
  opacity: isDragging ? 0 : 1,     // hide original while dragging
  touchAction: "manipulation",
};

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

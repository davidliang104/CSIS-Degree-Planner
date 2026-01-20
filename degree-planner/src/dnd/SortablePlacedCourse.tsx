import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortablePlacedCourse({
  courseId,
  termK,
  left,
  right,
}: {
  courseId: string;
  termK: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: courseId,
      data: {
        origin: "term" as const,
        termK,
        courseId,
      },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    touchAction: "manipulation",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`placed ${isDragging ? "isDragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      {left}
      {right}
    </div>
  );
}

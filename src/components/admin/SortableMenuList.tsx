'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MenuItemRow } from './MenuItemRow';
import type { MenuItem } from '@/lib/admin/menu';

interface SortableMenuListProps {
  items: MenuItem[];
  onReorder: (orderedIds: string[]) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleSoldOut: (id: string) => void;
}

function SortableItem({
  item,
  onEdit,
  onDelete,
  onToggleSoldOut,
}: {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleSoldOut: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <MenuItemRow
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleSoldOut={onToggleSoldOut}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export const SortableMenuList = ({
  items,
  onReorder,
  onEdit,
  onDelete,
  onToggleSoldOut,
}: SortableMenuListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    onReorder(newItems.map((i) => i.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleSoldOut={onToggleSoldOut}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

import React from 'react';
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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RecommendationItem } from '../types';
import { timeAgo } from '../utils';
import { getUrlHostname } from '../../../utils/favicon';
import { ItemCard, type ItemCardAction } from './ItemCard';

interface SortableCardProps {
  item: RecommendationItem;
  actions: ItemCardAction[];
}

const SortableCard: React.FC<SortableCardProps> = ({ item, actions }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.url });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <ItemCard
        href={item.url}
        title={item.title}
        hostname={getUrlHostname(item.url)}
        faviconUrl={item.favicon}
        visitCount={item.visitsInWindow}
        timeLabel={timeAgo(item.lastVisitTime)}
        tags={item.tags}
        actions={actions}
        isDraggable
        dragHandleProps={{ ...attributes, ...listeners }}
        dragHandleRef={setActivatorNodeRef}
        isDragging={isDragging}
      />
    </div>
  );
};

interface SortableHomeGridProps {
  items: RecommendationItem[];
  gridStyle: React.CSSProperties;
  getActions: (item: RecommendationItem) => ItemCardAction[];
  onOrderChange: (urls: string[]) => void;
}

const SortableHomeGrid: React.FC<SortableHomeGridProps> = ({
  items,
  gridStyle,
  getActions,
  onOrderChange,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(item => item.url === active.id);
    const newIndex = items.findIndex(item => item.url === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onOrderChange(arrayMove(items, oldIndex, newIndex).map(item => item.url));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(item => item.url)} strategy={rectSortingStrategy}>
        <div className="home-card-grid" style={gridStyle}>
          {items.map(item => (
            <SortableCard key={item.url} item={item} actions={getActions(item)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default SortableHomeGrid;

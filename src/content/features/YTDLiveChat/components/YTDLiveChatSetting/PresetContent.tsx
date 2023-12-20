import React, { useState } from 'react';

import { DndContext, closestCenter } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classNames from 'classnames';
import {
  MdAutoFixNormal,
  MdOutlineDragIndicator,
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowRight,
} from 'react-icons/md';

import styles from '../../styles/YTDLiveChatSetting/PresetContent.module.scss';
export const PresetContent = () => {
  const [items, setItems] = useState(['1', '2', '3']);
  return (
    <div className={styles['content-preset-container']}>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (over == null || active.id === over.id) {
            return;
          }
          const oldIndex = items.findIndex((item) => item === active.id);
          const newIndex = items.findIndex((item) => item === over.id);
          const newItems = arrayMove(items, oldIndex, newIndex);
          setItems(newItems);
        }}
      >
        <SortableContext items={items}>
          {items.map((id) => (
            <Card key={id} id={id} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

interface CardType {
  id: string;
}

const Card = ({ id }: CardType) => {
  const [title, setTitle] = useState('title');
  const [isOpen, setIsOpen] = useState(false);

  const {
    attributes,
    setActivatorNodeRef,
    listeners,
    setNodeRef,
    transform,
    isDragging,
    transition,
  } = useSortable({
    id: id,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  return (
    <div
      className={classNames(styles['cardContainer'], isDragging && styles['dragging'])}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className={styles['flex']}>
        <div className={styles['leftContainer']}>
          <div ref={setActivatorNodeRef}>
            <MdOutlineDragIndicator
              className={classNames(styles['dragIcon'], isDragging && styles['dragging'])}
              size={20}
              {...listeners}
              {...attributes}
            />
          </div>
          <input type="text" value={title} onChange={handleChange} className={styles['title']} />
        </div>
        <div className={styles['rightContainer']}>
          <MdAutoFixNormal size={20} />
          {isOpen ? (
            <MdOutlineKeyboardArrowDown size={20} onClick={() => setIsOpen(false)} />
          ) : (
            <MdOutlineKeyboardArrowRight size={20} onClick={() => setIsOpen(true)} />
          )}
          {/* <div className={styles['colorBar']}>
            <div className={`${styles['colorSection']} ${styles.blue}`}></div>
            <div className={`${styles['colorSection']} ${styles.red}`}></div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

import * as Y from 'yjs';

import { CollaborationHistoryEntry, HistoryElement, HistoryElementState } from '../interfaces';

const YJS_DOCUMENT_KEYS = {
  ELEMENTS: 'elements',
  ELEMENT_ORDER: 'elementOrder',
} as const;

type YElementMap = Y.Map<unknown>;
type YElementsMap = Y.Map<YElementMap>;
type YElementOrder = Y.Array<string>;

export function applyUndoEntry(
  document: Y.Doc,
  entry: CollaborationHistoryEntry,
): void {
  const yElements = document.getMap<YElementMap>(YJS_DOCUMENT_KEYS.ELEMENTS);
  const yElementOrder = document.getArray<string>(YJS_DOCUMENT_KEYS.ELEMENT_ORDER);

  document.transact(() => {
    for (const change of entry.changes) {
      if (change.before === null) {
        removeElementState(yElements, yElementOrder, change.elementId);

        continue;
      }

      restoreElementState(yElements, yElementOrder, change.before);
    }
  });
}

function restoreElementState(
  yElements: YElementsMap,
  yElementOrder: YElementOrder,
  state: HistoryElementState,
): void {
  const elementId = state.element.id;

  removeElementFromOrder(yElementOrder, elementId);

  yElements.set(elementId, createYElement(state.element));

  const insertionIndex = resolveInsertionIndex(yElementOrder, state);

  yElementOrder.insert(insertionIndex, [elementId]);
}

function removeElementState(
  yElements: YElementsMap,
  yElementOrder: YElementOrder,
  elementId: string,
): void {
  removeElementFromOrder(yElementOrder, elementId);
  yElements.delete(elementId);
}

function resolveInsertionIndex(
  yElementOrder: YElementOrder,
  state: HistoryElementState,
): number {
  const currentOrder = yElementOrder.toArray();

  const { previousElementId, nextElementId } = state.orderContext;

  if (nextElementId !== null) {
    const nextElementIndex = currentOrder.indexOf(nextElementId);

    if (nextElementIndex !== -1) {
      return nextElementIndex;
    }
  }

  if (previousElementId !== null) {
    const previousElementIndex = currentOrder.indexOf(previousElementId);

    if (previousElementIndex !== -1) {
      return previousElementIndex + 1;
    }
  }

  return Math.min(state.index, currentOrder.length);
}

function removeElementFromOrder(
  yElementOrder: YElementOrder,
  elementId: string,
): void {
  const elementIndex = yElementOrder.toArray().indexOf(elementId);

  if (elementIndex === -1) {
    return;
  }

  yElementOrder.delete(elementIndex, 1);
}

function createYElement(element: HistoryElement): YElementMap {
  const yElement = new Y.Map<unknown>();

  for (const [key, value] of Object.entries(element)) {
    if (key === 'id') {
      continue;
    }

    yElement.set(
      key,
      toYValue(value),
    );
  }

  return yElement;
}

function toYValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const yArray = new Y.Array<unknown>();
    yArray.push(value.map(toYValue),);

    return yArray;
  }

  if (value !== null && typeof value === 'object') {
    const yMap = new Y.Map<unknown>();

    for (const [key, nestedValue] of Object.entries(value)) {
      yMap.set(key, toYValue(nestedValue));
    }

    return yMap;
  }

  return value;
}

import * as Y from 'yjs';

import {
  ContinueImportElement,
} from '../interfaces';

const YJS_DOCUMENT_KEYS = {
  ELEMENTS: 'elements',
  ELEMENT_ORDER: 'elementOrder',
} as const;

type YElementMap = Y.Map<unknown>;

// type YElementsMap = Y.Map<YElementMap>;
//
// type YElementOrder = Y.Array<string>;

export function applyContinueImport(
  document: Y.Doc,
  elements: ContinueImportElement[],
): void {
  const yElements = document.getMap<YElementMap>(YJS_DOCUMENT_KEYS.ELEMENTS);
  const yElementOrder = document.getArray<string>(YJS_DOCUMENT_KEYS.ELEMENT_ORDER);

  document.transact(() => {
    const existingOrder = new Set(yElementOrder.toArray());

    for (const element of elements) {
      yElements.set(element.id, createYElement(element));

      if (existingOrder.has(element.id)) {
        continue;
      }

      yElementOrder.push([element.id]);
      existingOrder.add(element.id);
    }
  });
}

export function createYElement(element: ContinueImportElement): YElementMap {
  const yElement = new Y.Map<unknown>();

  for (const [key, value] of Object.entries(element)) {
    if (key === 'id') {
      continue;
    }

    yElement.set(key, toYValue(value));
  }

  return yElement;
}

function toYValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const yArray = new Y.Array<unknown>();

    yArray.push(value.map(toYValue));

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
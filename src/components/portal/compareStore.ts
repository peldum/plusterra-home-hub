import { useState, useEffect, useSyncExternalStore } from 'react';
import type { PublicListing } from '@/hooks/usePublicListings';

// Simple external store for compare list (max 3)
let _listeners: (() => void)[] = [];
let _compareList: PublicListing[] = [];

function emitChange() {
  _listeners.forEach(fn => fn());
}

export const compareStore = {
  getSnapshot: () => _compareList,
  subscribe: (fn: () => void) => {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  },
  add: (p: PublicListing) => {
    if (_compareList.length >= 3 || _compareList.find(x => x.id === p.id)) return false;
    _compareList = [..._compareList, p];
    emitChange();
    return true;
  },
  remove: (id: string) => {
    _compareList = _compareList.filter(x => x.id !== id);
    emitChange();
  },
  clear: () => {
    _compareList = [];
    emitChange();
  },
  has: (id: string) => _compareList.some(x => x.id === id),
};

export const useCompareList = () => {
  const items = useSyncExternalStore(compareStore.subscribe, compareStore.getSnapshot);
  return {
    items,
    add: compareStore.add,
    remove: compareStore.remove,
    clear: compareStore.clear,
    has: compareStore.has,
    count: items.length,
  };
};

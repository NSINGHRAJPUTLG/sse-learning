'use client';

import { create } from 'zustand';

type RequestLoaderState = {
  activeRequests: number;
  startRequest: () => void;
  finishRequest: () => void;
};

export const useRequestLoaderStore = create<RequestLoaderState>((set) => ({
  activeRequests: 0,
  startRequest: () => set((state) => ({ activeRequests: state.activeRequests + 1 })),
  finishRequest: () =>
    set((state) => ({
      activeRequests: state.activeRequests > 0 ? state.activeRequests - 1 : 0,
    })),
}));

'use client';

import { useRequestLoaderStore } from '@/store/request-loader.store';

export default function ApiTopLoader() {
  const isActive = useRequestLoaderStore((state) => state.activeRequests > 0);

  return (
    <div
      aria-hidden="true"
      className={`api-top-loader${isActive ? ' api-top-loader-active' : ''}`}
    >
      <div className="api-top-loader-bar" />
    </div>
  );
}

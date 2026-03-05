'use client';

import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof AxiosError) {
    const apiMessage =
      (error.response?.data as { message?: string; error?: string } | undefined)?.message ||
      (error.response?.data as { message?: string; error?: string } | undefined)?.error;
    return apiMessage || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

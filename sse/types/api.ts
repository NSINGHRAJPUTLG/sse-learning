export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

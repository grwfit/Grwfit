export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Money stored in paise (integer). Never use float for money. */
export type Paise = number;

/** Convert paise to rupees for display */
export const paiseToRupees = (paise: Paise): string =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

/** Convert rupees to paise for storage */
export const rupeesToPaise = (rupees: number): Paise => Math.round(rupees * 100);

export type UserType = "staff" | "member" | "platform";

export type ISTDateString = string;

export const toIST = (date: Date): ISTDateString =>
  date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

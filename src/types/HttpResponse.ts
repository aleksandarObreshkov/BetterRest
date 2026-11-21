export interface HttpResponse {
  body: string;
  status: number;
  contentType: string;
  headers: Record<string, string>;
  cancelled?: boolean;
}

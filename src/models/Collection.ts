export interface RequestSummary {
  id: string;
  name: string;
  collectionId: string;
}

export interface CollectionNode {
  id: string; // directory name on disk, doubles as display name
  requests: RequestSummary[];
}

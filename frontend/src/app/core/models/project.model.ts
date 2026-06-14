export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateRequest {
  name: string;
  key?: string;
  description?: string | null;
}

export interface ProjectUpdateRequest {
  name?: string;
  key?: string;
  description?: string | null;
}

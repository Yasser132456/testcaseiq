export interface AuditEvent {
  id: string;
  timestamp: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  outcome: string;
  summary: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  ipAddress: string | null;
}

export interface AuditEventPage {
  content: AuditEvent[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface AuditEventFilters {
  action?: string;
  outcome?: string;
  resourceType?: string;
}

// Issue statuses as defined by Beads
export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'closed'
  | 'tombstone'
  | 'deferred'
  | 'pinned'
  | 'hooked';

// Issue types
export type IssueType = 'task' | 'bug' | 'feature' | 'epic';

// Priority levels (0=Critical, 1=High, 2=Medium, 3=Low, 4=Lowest)
export type Priority = 0 | 1 | 2 | 3 | 4;

// Main Issue interface matching .beads/issues.jsonl structure
export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  issue_type: IssueType;
  priority: Priority;
  created_at: string; // ISO 8601 timestamp
  updated_at?: string; // ISO 8601 timestamp
  assignee?: string;
  labels?: string[];
  dependencies?: string[]; // IDs of issues this depends on
  blocked_by?: string[]; // IDs of issues blocking this one
}

// Data point for lead time scatterplot
export interface LeadTimeDataPoint {
  id: string;
  closedDate: number; // Unix timestamp for X axis
  closedDateStr: string; // Formatted date string
  cycleTime: number; // Days from creation to closure
  title: string;
}

// Data point for aging WIP scatterplot
export interface AgingWipDataPoint {
  id: string;
  status: string;
  age: number; // Days since creation
  title: string;
  color: string; // Color based on age (green/orange/red)
}

// Data point for cumulative flow diagram
export interface FlowChartDataPoint {
  date: string; // YYYY-MM-DD
  open: number; // Running total of open issues
  closed: number; // Running total of closed issues
  throughput: number; // Issues closed on this day
}

// Age distribution bucket
export interface AgeChartDataPoint {
  range: string; // e.g., "0-7d", "8-14d"
  count: number;
}

// Calculated metrics for dashboard
export interface Metrics {
  avgAge: string; // Average age of open issues
  openCount: number; // Total open issues
  cycleTimeP50: number; // 50th percentile cycle time
  cycleTimeP85: number; // 85th percentile cycle time
  leadTimeData: LeadTimeDataPoint[];
  agingWipData: AgingWipDataPoint[];
  flowChartData: FlowChartDataPoint[];
  ageChartData: AgeChartDataPoint[];
}

// API request/response types
export interface UpdateIssueDescriptionRequest {
  description: string;
}

export interface UpdateIssueStatusRequest {
  status: IssueStatus;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Priority display labels
export const PRIORITY_LABELS: Record<Priority, string> = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Low',
  4: 'Lowest',
};

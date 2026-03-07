export interface BoardIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  assignee: {
    login: string;
    avatar_url: string;
  } | null;
  labels: { name: string; color: string }[];
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface ColumnDef {
  id: string;
  title: string;
  label: string | null; // null means "no status label" (Todo column)
  color: string;
}

export interface BoardData {
  columns: {
    [columnId: string]: {
      def: ColumnDef;
      issues: BoardIssue[];
    };
  };
  columnOrder: string[];
}

export interface MoveRequest {
  issueNumber: number;
  toColumnId: string;
}

export interface IssueComment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  html_url: string;
}

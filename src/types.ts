export interface Yard {
  name: string;
  type: 'BONDED' | 'WAREHOUSE' | 'BUFFER' | string;
  capacity: number;
  cheio: number;
  vazio: number;
  porto: number;
  prontoColeta: number;
  delivered: number;
}

export interface YardsState {
  [key: string]: Yard;
}

export interface Vessel {
  id: number;
  name: string;
  eta: string;
  cntrs: number;
}

export interface ChartLeftItem {
  week: string;
  arrivals: number;
  backlog: number;
}

export interface ChartRightItem {
  date: string;
  value: number;
  type?: string;
}

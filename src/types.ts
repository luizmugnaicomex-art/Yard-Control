export interface YardStockItem {
  id: string;
  name: string;
  category: 'BONDED' | 'WAREHOUSE' | 'BUFFER';
  capacity: number;
  currentFull: number;
  currentEmpty: number;
  inTransitPort: number;
  inTransitCollection: number;
  inTransitDelivery: number;
}

export interface VesselETAItem {
  id: string;
  vesselName: string;
  etaDate: string; // ISO date format "YYYY-MM-DD" or standard date
  containerCount: number;
  blCount?: number;
  status: 'SCHEDULED' | 'BERTHED' | 'DISCHARGED' | 'DELAYED';
}

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

export interface BufferSlot {
  row: number;
  col: number;
  containerNo?: string;
  cargoType?: string;
  size?: '20FT' | '40FT' | string;
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | string;
  isOptimalPickup?: boolean;
  status?: string;
  entryTime?: string;
  danfe?: string;
  origin?: string;
  loteNo?: string;
  statusRecebimento?: string;
  validade?: string;
  stack?: BufferSlot[];
  updatedAt?: string;
}

export interface BufferArea {
  id: string;
  name: string;
  rows: number;
  cols: number;
  slots: BufferSlot[];
}

export interface Depot {
  id: string;
  name: string;
  avgVolume: number;
  maxCapacity: number;
  operatingDays: string;
  operatingHours: string;
  status: 'Open' | 'Closed';
  isAlert: boolean;
}


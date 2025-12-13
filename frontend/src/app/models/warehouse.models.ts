export interface Position {
  floor: number;
  row: number;
  col: number;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

export interface PalletConfig {
  type: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  unit: string;
  color?: string;
}

export interface StockConfig {
  type: string;
  length: number;
  width: number;
  height: number;
  unit: string;
  color?: string;
  position: Position;
}

export interface RackConfig {
  num_floors: number;
  num_rows: number;
  num_racks: number;
  custom_gaps: number[];
  gap_unit: string;
  gap_front: number;
  gap_back: number;
  gap_left: number;
  gap_right: number;
  wall_gap_unit: string;
}

export interface BlockConfig {
  block_index: number;
  rack_config: RackConfig;
  pallet_config: PalletConfig;
  stock_config: StockConfig;
  collapsed?: boolean; // UI helper
}

export interface WarehouseConfig {
  id: string;
  warehouse_dimensions: Dimensions;
  num_blocks: number;
  block_gap: number;
  block_gap_unit: string;
  block_configs: BlockConfig[];
}
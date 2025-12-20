// frontend/src/app/models/warehouse.models.ts
export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

export interface Position {
  floor: number;
  row: number;
  col: number;
}

export interface PalletConfig {
  type: string;
  weight: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  color: string;
  position: Position;
}

export interface RackConfig {
  num_floors: number;
  num_rows: number;
  num_racks: number;
  custom_gaps: number[];
  gap_front: number;
  gap_back: number;
  gap_left: number;
  gap_right: number;
  wall_gap_unit: string;
}

export interface BlockConfig {
  block_index: number;
  rack_config: RackConfig;
  pallet_configs: PalletConfig[];
}

export interface WarehouseConfig {
  blocks: boolean;
  id: string;
  warehouse_dimensions: Dimensions;
  num_blocks: number;
  block_gap: number;
  block_gap_unit: string;
  block_configs: BlockConfig[];
}

// Layout response interfaces
export interface PalletDims {
  length: number;
  width: number;
  height: number;
}

export interface PalletData {
  type: string;
  color: string;
  dims: PalletDims;
}

export interface RackIndices {
  floor: number;
  row: number;
  col: number;
}

export interface RackData {
  id: string;
  position: { x: number; y: number; z: number };
  dimensions: { length: number; width: number; height: number };
  indices: RackIndices;
  pallets?: PalletData[];
}

export interface BlockData {
  id: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; length: number; height: number };
  racks: RackData[];
}

export interface LayoutData {
  warehouse_dimensions?: {
    width: number;
    length: number;
    height: number;
  };
  blocks: BlockData[];
}
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

export interface AisleConfig {
  num_floors: number;
  num_rows: number;
  num_aisles: number;
  custom_gaps: number[];
  gap_front: number;
  gap_back: number;
  gap_left: number;
  gap_right: number;
  wall_gap_unit: string;
}

export interface WorkstationConfig {
  workstation_index: number;
  aisle_config: AisleConfig;
  pallet_configs: PalletConfig[];
}

export interface WarehouseConfig {
  workstations: boolean;
  id: string;
  warehouse_dimensions: Dimensions;
  num_workstations: number;
  workstation_gap: number;
  workstation_gap_unit: string;
  workstation_configs: WorkstationConfig[];
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

export interface AisleIndices {
  floor: number;
  row: number;
  col: number;
}

export interface AisleData {
  id: string;
  position: { x: number; y: number; z: number };
  dimensions: { length: number; width: number; height: number };
  indices: AisleIndices;
  pallets?: PalletData[];
}

export interface WorkstationData {
  id: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; length: number; height: number };
  aisles: AisleData[];
}

export interface LayoutData {
  warehouse_dimensions?: {
    width: number;
    length: number;
    height: number;
  };
  workstations: WorkstationData[];
}
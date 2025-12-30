import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { WarehouseService } from "../../services/warehouse.service";
import {
  WarehouseConfig,
  LayoutData,
  PalletConfig,
  SideAisleConfig,
} from "../../models/warehouse.models";

@Component({
  selector: "app-warehouse",
  templateUrl: "./warehouse.component.html",
  styleUrls: ["./warehouse.component.css"],
})
export class WarehouseVisualizerComponent implements OnInit {
  warehouseConfig: WarehouseConfig = {
    id: "warehouse-1",
    warehouse_dimensions: {
      length: 3000,
      width: 6000,
      height: 1500,
      height_safety_margin: 300,
      unit: "cm",
    },
    num_workstations: 2,
    workstation_gap: 100,
    workstation_gap_unit: "cm",
    workstation_configs: [],
    workstations: false
  };

  // Separate units for each dimension field
  dimensionUnits = {
    length: "cm",
    width: "cm", 
    height: "cm",
    height_safety_margin: "cm",
  };

  // Display values (user sees these)
  displayDimensions = {
    length: 3000,
    width: 6000,
    height: 1500,
    height_safety_margin: 300
  };

  workstations: any[] = [];
  layoutData: LayoutData | null = null;
  is3DView: boolean = true;
  statusMessage: string = "Ready";
  statusClass: string = "text-success";

  // Warehouse dimensions for visualization (in cm)
  warehouseDimensions: { length: number; width: number; height: number; height_safety_margin: number } | null = null;

  // Taisle previous num_workstations to avoid unnecessary reinitialization
  private previousNumWorkstations: number = 5;

  palletColors: { [key: string]: string } = {
    wooden: "#8B4513",
    plastic: "#1E90FF",
    metal: "#A9A9A9",
  };

  constructor(private warehouseService: WarehouseService) {}

  ngOnInit(): void {
    this.previousNumWorkstations = this.warehouseConfig.num_workstations;
    this.initializeWorkstations();
    this.syncDimensionsFromConfig();
    this.updateWarehouseDimensions();
  }

  // Sync display dimensions from config (on init)
  private syncDimensionsFromConfig(): void {
    this.displayDimensions.length = this.warehouseConfig.warehouse_dimensions.length;
    this.displayDimensions.width = this.warehouseConfig.warehouse_dimensions.width;
    this.displayDimensions.height = this.warehouseConfig.warehouse_dimensions.height;
    this.displayDimensions.height_safety_margin = this.warehouseConfig.warehouse_dimensions.height_safety_margin;
  }

  // Update config from display dimensions (converting to cm)
  updateDimensionValue(field: 'length' | 'width' | 'height' | 'height_safety_margin'): void {
    const value = this.displayDimensions[field];
    const unit = this.dimensionUnits[field];
    const factor = this.getUnitConversionFactor(unit);
    
    // Store in config as cm
    (this.warehouseConfig.warehouse_dimensions as any)[field] = value * factor;
    this.updateWarehouseDimensions();
  }

  // When unit changes, convert the display value
  onUnitChange(field: 'length' | 'width' | 'height' | 'height_safety_margin', newUnit: string): void {
    const oldUnit = this.dimensionUnits[field];
    const oldValue = this.displayDimensions[field];
    
    // Convert: oldValue in oldUnit -> cm -> newUnit
    const valueInCm = oldValue * this.getUnitConversionFactor(oldUnit);
    const newValue = valueInCm / this.getUnitConversionFactor(newUnit);
    
    this.dimensionUnits[field] = newUnit;
    this.displayDimensions[field] = Math.round(newValue * 100) / 100; // Round to 2 decimals
  }

  private updateWarehouseDimensions(): void {
    const dim = this.warehouseConfig.warehouse_dimensions;
    // Config always stores in cm now
    this.warehouseDimensions = {
      length: dim.length,
      width: dim.width,
      height: dim.height,
      height_safety_margin: dim.height_safety_margin
    };
  }

  private getUnitConversionFactor(unit: string): number {
    const factors: { [key: string]: number } = {
      'cm': 1, 'm': 100, 'mm': 0.1, 'ft': 30.48, 'in': 2.54
    };
    return factors[unit?.toLowerCase()] || 1;
  }

  // TaisleBy functions for *ngFor to prevent unnecessary re-renders
  taisleByWorkstationIndex(index: number, workstation: any): number {
    return index;
  }

  taisleByGapIndex(index: number, gap: number): number {
    return index;
  }

  taisleByPalletIndex(index: number, pallet: any): number {
    return index;
  }

  // Called on blur to avoid losing focus while typing
  onNumWorkstationsBlur(): void {
    const newNumWorkstations = this.warehouseConfig.num_workstations;
    if (newNumWorkstations !== this.previousNumWorkstations && newNumWorkstations > 0) {
      this.adjustWorkstationsArray(newNumWorkstations);
      this.previousNumWorkstations = newNumWorkstations;
    }
  }

  initializeWorkstations(): void {
    this.workstations = [];
    for (let i = 0; i < this.warehouseConfig.num_workstations; i++) {
      this.workstations.push(this.createDefaultWorkstation());
    }
    this.updateWorkstationConfigs();
    this.updateWarehouseDimensions();
  }

  private createDefaultWorkstation(): any {
    const defaultSideConfig = {
      num_floors: 4,  // Y_position (floors)
      num_rows: 4,    // X_position (rows)
      num_aisles: 2,  // Number of horizontal aisles
      depth: 1,       // Number of Deep (depth dimension)
      deep_gaps: [],  // Gaps between depth sections
      aisle_gaps: [], // Gaps between aisles
      custom_gaps: [],
      gap_front: 100,
      gap_back: 100,
      gap_left: 100,
      gap_right: 100,
      wall_gap_unit: "cm",
    };
    
    return {
      aisle_width: 500,  // Central aisle width (A_W)
      aisle_width_unit: "cm",
      left_side_config: { ...defaultSideConfig },
      right_side_config: { ...defaultSideConfig },
      // UI-only wall gap values with individual units for left side
      leftWallGaps: {
        front: { value: 100, unit: "cm" },
        back: { value: 100, unit: "cm" },
        left: { value: 100, unit: "cm" },
        right: { value: 100, unit: "cm" },
      },
      // UI-only wall gap values with individual units for right side
      rightWallGaps: {
        front: { value: 100, unit: "cm" },
        back: { value: 100, unit: "cm" },
        left: { value: 100, unit: "cm" },
        right: { value: 100, unit: "cm" },
      },
      pallets: [],
    };
  }

  private adjustWorkstationsArray(newNumWorkstations: number): void {
    const currentLength = this.workstations.length;
    
    if (newNumWorkstations > currentLength) {
      // Add new workstations
      for (let i = currentLength; i < newNumWorkstations; i++) {
        this.workstations.push(this.createDefaultWorkstation());
      }
    } else if (newNumWorkstations < currentLength) {
      // Remove excess workstations
      this.workstations.splice(newNumWorkstations);
    }
    
    this.updateWorkstationConfigs();
  }

  updateWorkstationConfigs(): void {
    this.warehouseConfig.workstation_configs = this.workstations.map((workstation, index) => {
      // Convert central aisle width to cm
      const aisleWidthCm =
        (workstation.aisle_width || 200) *
        this.getUnitConversionFactor(workstation.aisle_width_unit || "cm");

      // Convert left side wall gaps to cm
      const leftGapFrontCm =
        (workstation.leftWallGaps?.front?.value || 0) *
        this.getUnitConversionFactor(workstation.leftWallGaps?.front?.unit || "cm");
      const leftGapBackCm =
        (workstation.leftWallGaps?.back?.value || 0) *
        this.getUnitConversionFactor(workstation.leftWallGaps?.back?.unit || "cm");
      const leftGapLeftCm =
        (workstation.leftWallGaps?.left?.value || 0) *
        this.getUnitConversionFactor(workstation.leftWallGaps?.left?.unit || "cm");
      const leftGapRightCm =
        (workstation.leftWallGaps?.right?.value || 0) *
        this.getUnitConversionFactor(workstation.leftWallGaps?.right?.unit || "cm");

      // Convert right side wall gaps to cm
      const rightGapFrontCm =
        (workstation.rightWallGaps?.front?.value || 0) *
        this.getUnitConversionFactor(workstation.rightWallGaps?.front?.unit || "cm");
      const rightGapBackCm =
        (workstation.rightWallGaps?.back?.value || 0) *
        this.getUnitConversionFactor(workstation.rightWallGaps?.back?.unit || "cm");
      const rightGapLeftCm =
        (workstation.rightWallGaps?.left?.value || 0) *
        this.getUnitConversionFactor(workstation.rightWallGaps?.left?.unit || "cm");
      const rightGapRightCm =
        (workstation.rightWallGaps?.right?.value || 0) *
        this.getUnitConversionFactor(workstation.rightWallGaps?.right?.unit || "cm");

      // Convert custom gaps to cm
      const convertGaps = (gaps: number[], unit: string) => {
        return gaps.map(g => g * this.getUnitConversionFactor(unit || "cm"));
      };

      const leftSideConfig: any = {
        ...workstation.left_side_config,
        gap_front: leftGapFrontCm,
        gap_back: leftGapBackCm,
        gap_left: leftGapLeftCm,
        gap_right: leftGapRightCm,
        custom_gaps: convertGaps(workstation.left_side_config.custom_gaps || [], workstation.left_side_config.wall_gap_unit || "cm"),
        wall_gap_unit: "cm",
      };

      const rightSideConfig: any = {
        ...workstation.right_side_config,
        gap_front: rightGapFrontCm,
        gap_back: rightGapBackCm,
        gap_left: rightGapLeftCm,
        gap_right: rightGapRightCm,
        custom_gaps: convertGaps(workstation.right_side_config.custom_gaps || [], workstation.right_side_config.wall_gap_unit || "cm"),
        wall_gap_unit: "cm",
      };

      return {
        workstation_index: index,
        aisle_width: aisleWidthCm,
        aisle_width_unit: "cm",
        left_side_config: leftSideConfig,
        right_side_config: rightSideConfig,
        pallet_configs: workstation.pallets.map((pallet: any) => ({
          ...pallet,
          color: this.palletColors[pallet.type] || "#8B4513",
        })),
      };
    });
  }

  addPallet(workstationIndex: number): void {
    const newPallet: PalletConfig = {
      type: "wooden",
      weight: 1200,
      length_cm: 100,
      width_cm: 100,
      height_cm: 15,
      color: this.palletColors["wooden"],
      position: { 
        floor: 1,  // Y_position (floors)
        row: 1,    // X_position (rows)
        col: 1,
        depth: 1,
        side: "left"
      },
    };

    if (!this.workstations[workstationIndex].pallets) {
      this.workstations[workstationIndex].pallets = [];
    }
    this.workstations[workstationIndex].pallets.push(newPallet);
    this.updateWorkstationConfigs();
  }

  removePallet(workstationIndex: number, palletIndex: number): void {
    if (this.workstations[workstationIndex]?.pallets) {
      this.workstations[workstationIndex].pallets.splice(palletIndex, 1);
      this.updateWorkstationConfigs();
    }
  }

  updateAisleGaps(workstationIndex: number, side: 'left' | 'right'): void {
    const workstation = this.workstations[workstationIndex];
    const sideConfig = side === 'left' ? workstation.left_side_config : workstation.right_side_config;
    const numAisles = sideConfig.num_aisles;
    const depth = sideConfig.depth;
    
    // Number of gaps = (num_aisles × depth) - 1
    const requiredGaps = (numAisles * depth) - 1;
    const currentGaps = sideConfig.custom_gaps || [];
    const newGaps = Array(requiredGaps).fill(50); // Default 50cm gap

    // Preserve existing gap values
    for (let i = 0; i < Math.min(currentGaps.length, newGaps.length); i++) {
      newGaps[i] = currentGaps[i];
    }

    sideConfig.custom_gaps = newGaps;
    this.updateWorkstationConfigs();
  }

  onSideConfigChange(workstationIndex: number, side: 'left' | 'right'): void {
    // Update gaps when num_aisles or depth changes
    this.updateAisleGaps(workstationIndex, side);
  }

  getTotalPallets(): number {
    return this.workstations.reduce(
      (total, workstation) => total + (workstation.pallets?.length || 0),
      0
    );
  }

  getTotalPalletsWeight(workstation: any): number {
    return (
      workstation.pallets?.reduce(
        (total: number, pallet: any) => total + (pallet.weight || 0),
        0
      ) || 0
    );
  }

  onPalletChange(
    workstationIndex: number,
    palletIndex: number,
    updatedPallet: PalletConfig
  ): void {
    if (this.workstations[workstationIndex]?.pallets[palletIndex]) {
      this.workstations[workstationIndex].pallets[palletIndex] = updatedPallet;
      this.updateWorkstationConfigs();
    }
  }

  generateLayout(): void {
    this.setStatus("Generating layout...", "text-warning");
    this.updateWorkstationConfigs();
    this.updateWarehouseDimensions();
    
    this.warehouseService.createWarehouse(this.warehouseConfig).subscribe({
      next: (response: any) => {
        this.layoutData = response.layout || response.data;
        
        // Update dimensions from response if available
        if (this.layoutData?.warehouse_dimensions) {
          this.warehouseDimensions = {
            width: this.layoutData.warehouse_dimensions.width,
            length: this.layoutData.warehouse_dimensions.length,
            height: this.layoutData.warehouse_dimensions.height,
            height_safety_margin: this.layoutData.warehouse_dimensions.height_safety_margin
          };
        }
        
        console.log("Warehouse created:", response);
        console.log("Layout data:", this.layoutData);
        this.setStatus("Layout generated successfully", "text-success");
      },
      error: (error) => {
        console.error("Error creating warehouse:", error);
        this.setStatus(
          `Error: ${error.error?.detail || error.message || 'Unknown error'}`,
          "text-danger"
        );
      },
    });
  }

  validateConfig(): void {
    this.setStatus("Validating configuration...", "text-warning");

    this.warehouseService.validateConfig(this.warehouseConfig).subscribe({
      next: (response: any) => {
        console.log("Validation:", response);
        this.setStatus(
          response.message || "Configuration is valid",
          response.valid ? "text-success" : "text-danger"
        );
        if (!response.valid) {
          alert("Configuration is invalid. Please check the error message.");
        }
      },
      error: (error) => {
        console.error("Validation error:", error);
        this.setStatus(`Validation failed: ${error.message}`, "text-danger");
      },
    });
  }

  clearVisualization(): void {
    this.layoutData = null;
    this.setStatus("Visualization cleared", "text-info");
  }

  private setStatus(message: string, className: string): void {
    this.statusMessage = message;
    this.statusClass = className;
  }

  onElementClicked(element: any): void {
    console.log('Element clicked:', element);
    // You can add more functionality here, like showing details
  }

  onPalletClicked(pallet: PalletConfig): void {
    console.log('Pallet clicked:', pallet);
    // You can add more functionality here, like showing pallet details
  }

  // Helper methods for pallet configuration limits
  getMaxFloors(workstation: any): number {
    return Math.max(
      workstation.left_side_config?.num_floors || 1,
      workstation.right_side_config?.num_floors || 1
    );
  }

  getMaxRows(workstation: any): number {
    return Math.max(
      workstation.left_side_config?.num_rows || 1,
      workstation.right_side_config?.num_rows || 1
    );
  }

  getMaxAisles(workstation: any): number {
    const leftTotal = (workstation.left_side_config?.num_aisles || 1) * 
                      (workstation.left_side_config?.depth || 1);
    const rightTotal = (workstation.right_side_config?.num_aisles || 1) * 
                       (workstation.right_side_config?.depth || 1);
    return Math.max(leftTotal, rightTotal);
  }

  getMaxDepth(workstation: any): number {
    return Math.max(
      workstation.left_side_config?.depth || 1,
      workstation.right_side_config?.depth || 1
    );
  }

  // Helper methods for generating arrays for *ngFor loops
  getDeepGapArray(depth: number): number[] {
    // Returns array [0, 1, 2, ..., depth-2] for depth gaps
    return Array.from({ length: Math.max(0, depth - 1) }, (_, i) => i);
  }

  getAisleGapArray(numAisles: number): number[] {
    // Returns array [0, 1, 2, ..., numAisles-2] for aisle gaps
    return Array.from({ length: Math.max(0, numAisles - 1) }, (_, i) => i);
  }
}
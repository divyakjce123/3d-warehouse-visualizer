import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { WarehouseService } from "../../services/warehouse.service";
import {
  WarehouseConfig,
  LayoutData,
  PalletConfig,
  AisleConfig,
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
    workstation_gap: 1000,
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
    return {
      aisleConfig: {
        num_floors: 4,
        num_rows: 8,
        num_aisles: 4,
        custom_gaps: [],
        gap_front: 100,
        gap_back: 100,
        gap_left: 100,
        gap_right: 100,
        // Backend unit (we will always send cm)
        wall_gap_unit: "cm",
      },
      // UI-only wall gap values with individual units
      wallGaps: {
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
      const aisleConfig = workstation.aisleConfig;
      const wallGaps = workstation.wallGaps || {
        front: { value: aisleConfig.gap_front, unit: "cm" },
        back: { value: aisleConfig.gap_back, unit: "cm" },
        left: { value: aisleConfig.gap_left, unit: "cm" },
        right: { value: aisleConfig.gap_right, unit: "cm" },
      };

      // Convert each wall gap to cm for backend
      const gapFrontCm =
        (wallGaps.front?.value || 0) *
        this.getUnitConversionFactor(wallGaps.front?.unit || "cm");
      const gapBackCm =
        (wallGaps.back?.value || 0) *
        this.getUnitConversionFactor(wallGaps.back?.unit || "cm");
      const gapLeftCm =
        (wallGaps.left?.value || 0) *
        this.getUnitConversionFactor(wallGaps.left?.unit || "cm");
      const gapRightCm =
        (wallGaps.right?.value || 0) *
        this.getUnitConversionFactor(wallGaps.right?.unit || "cm");

      const aisleConfigForBackend: AisleConfig = {
        ...aisleConfig,
        gap_front: gapFrontCm,
        gap_back: gapBackCm,
        gap_left: gapLeftCm,
        gap_right: gapRightCm,
        // All gaps are now expressed in cm for backend
        wall_gap_unit: "cm",
      };

      return {
        workstation_index: index,
        aisle_config: aisleConfigForBackend,
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
      position: { floor: 1, row: 1, col: 1 },
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

  updateAisleGaps(workstationIndex: number): void {
    const numAisles = this.workstations[workstationIndex].aisleConfig.num_aisles;
    const currentGaps = this.workstations[workstationIndex].aisleConfig.custom_gaps || [];
    const newGaps = Array(numAisles - 1).fill(500);

    for (let i = 0; i < Math.min(currentGaps.length, newGaps.length); i++) {
      newGaps[i] = currentGaps[i];
    }

    this.workstations[workstationIndex].aisleConfig.custom_gaps = newGaps;
    this.updateWorkstationConfigs();
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
}
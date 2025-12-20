import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { WarehouseService } from "../../services/warehouse.service";
import {
  WarehouseConfig,
  LayoutData,
  PalletConfig,
  RackConfig,
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
      unit: "cm",
    },
    num_subwarehouses: 2,
    subwarehouse_gap: 1000,
    subwarehouse_gap_unit: "cm",
    subwarehouse_configs: [],
    subwarehouses: false
  };

  // Separate units for each dimension field
  dimensionUnits = {
    length: "cm",
    width: "cm", 
    height: "cm"
  };

  // Display values (user sees these)
  displayDimensions = {
    length: 3000,
    width: 2000,
    height: 3000
  };

  subwarehouses: any[] = [];
  layoutData: LayoutData | null = null;
  is3DView: boolean = true;
  statusMessage: string = "Ready";
  statusClass: string = "text-success";

  // Warehouse dimensions for visualization (in cm)
  warehouseDimensions: { length: number; width: number; height: number } | null = null;

  // Track previous num_subwarehouses to avoid unnecessary reinitialization
  private previousNumSubwarehouses: number = 5;

  palletColors: { [key: string]: string } = {
    wooden: "#8B4513",
    plastic: "#1E90FF",
    metal: "#A9A9A9",
  };

  constructor(private warehouseService: WarehouseService) {}

  ngOnInit(): void {
    this.previousNumSubwarehouses = this.warehouseConfig.num_subwarehouses;
    this.initializeSubwarehouses();
    this.syncDimensionsFromConfig();
    this.updateWarehouseDimensions();
  }

  // Sync display dimensions from config (on init)
  private syncDimensionsFromConfig(): void {
    this.displayDimensions.length = this.warehouseConfig.warehouse_dimensions.length;
    this.displayDimensions.width = this.warehouseConfig.warehouse_dimensions.width;
    this.displayDimensions.height = this.warehouseConfig.warehouse_dimensions.height;
  }

  // Update config from display dimensions (converting to cm)
  updateDimensionValue(field: 'length' | 'width' | 'height'): void {
    const value = this.displayDimensions[field];
    const unit = this.dimensionUnits[field];
    const factor = this.getUnitConversionFactor(unit);
    
    // Store in config as cm
    (this.warehouseConfig.warehouse_dimensions as any)[field] = value * factor;
    this.updateWarehouseDimensions();
  }

  // When unit changes, convert the display value
  onUnitChange(field: 'length' | 'width' | 'height', newUnit: string): void {
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
      height: dim.height
    };
  }

  private getUnitConversionFactor(unit: string): number {
    const factors: { [key: string]: number } = {
      'cm': 1, 'm': 100, 'mm': 0.1, 'ft': 30.48, 'in': 2.54
    };
    return factors[unit?.toLowerCase()] || 1;
  }

  // TrackBy functions for *ngFor to prevent unnecessary re-renders
  trackBySubwarehouseIndex(index: number, subwarehouse: any): number {
    return index;
  }

  trackByGapIndex(index: number, gap: number): number {
    return index;
  }

  trackByPalletIndex(index: number, pallet: any): number {
    return index;
  }

  // Called on blur to avoid losing focus while typing
  onNumSubwarehousesBlur(): void {
    const newNumSubwarehouses = this.warehouseConfig.num_subwarehouses;
    if (newNumSubwarehouses !== this.previousNumSubwarehouses && newNumSubwarehouses > 0) {
      this.adjustSubwarehousesArray(newNumSubwarehouses);
      this.previousNumSubwarehouses = newNumSubwarehouses;
    }
  }

  initializeSubwarehouses(): void {
    this.subwarehouses = [];
    for (let i = 0; i < this.warehouseConfig.num_subwarehouses; i++) {
      this.subwarehouses.push(this.createDefaultSubwarehouse());
    }
    this.updateSubwarehouseConfigs();
    this.updateWarehouseDimensions();
  }

  private createDefaultSubwarehouse(): any {
    return {
      rackConfig: {
        num_floors: 4,
        num_rows: 8,
        num_racks: 4,
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

  private adjustSubwarehousesArray(newNumSubwarehouses: number): void {
    const currentLength = this.subwarehouses.length;
    
    if (newNumSubwarehouses > currentLength) {
      // Add new subwarehouses
      for (let i = currentLength; i < newNumSubwarehouses; i++) {
        this.subwarehouses.push(this.createDefaultSubwarehouse());
      }
    } else if (newNumSubwarehouses < currentLength) {
      // Remove excess subwarehouses
      this.subwarehouses.splice(newNumSubwarehouses);
    }
    
    this.updateSubwarehouseConfigs();
  }

  updateSubwarehouseConfigs(): void {
    this.warehouseConfig.subwarehouse_configs = this.subwarehouses.map((subwarehouse, index) => {
      const rackConfig = subwarehouse.rackConfig;
      const wallGaps = subwarehouse.wallGaps || {
        front: { value: rackConfig.gap_front, unit: "cm" },
        back: { value: rackConfig.gap_back, unit: "cm" },
        left: { value: rackConfig.gap_left, unit: "cm" },
        right: { value: rackConfig.gap_right, unit: "cm" },
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

      const rackConfigForBackend: RackConfig = {
        ...rackConfig,
        gap_front: gapFrontCm,
        gap_back: gapBackCm,
        gap_left: gapLeftCm,
        gap_right: gapRightCm,
        // All gaps are now expressed in cm for backend
        wall_gap_unit: "cm",
      };

      return {
        subwarehouse_index: index,
        rack_config: rackConfigForBackend,
        pallet_configs: subwarehouse.pallets.map((pallet: any) => ({
          ...pallet,
          color: this.palletColors[pallet.type] || "#8B4513",
        })),
      };
    });
  }

  addPallet(subwarehouseIndex: number): void {
    const newPallet: PalletConfig = {
      type: "wooden",
      weight: 1200,
      length_cm: 100,
      width_cm: 100,
      height_cm: 15,
      color: this.palletColors["wooden"],
      position: { floor: 1, row: 1, col: 1 },
    };

    if (!this.subwarehouses[subwarehouseIndex].pallets) {
      this.subwarehouses[subwarehouseIndex].pallets = [];
    }
    this.subwarehouses[subwarehouseIndex].pallets.push(newPallet);
    this.updateSubwarehouseConfigs();
  }

  removePallet(subwarehouseIndex: number, palletIndex: number): void {
    if (this.subwarehouses[subwarehouseIndex]?.pallets) {
      this.subwarehouses[subwarehouseIndex].pallets.splice(palletIndex, 1);
      this.updateSubwarehouseConfigs();
    }
  }

  updateRackGaps(subwarehouseIndex: number): void {
    const numRacks = this.subwarehouses[subwarehouseIndex].rackConfig.num_racks;
    const currentGaps = this.subwarehouses[subwarehouseIndex].rackConfig.custom_gaps || [];
    const newGaps = Array(numRacks - 1).fill(500);

    for (let i = 0; i < Math.min(currentGaps.length, newGaps.length); i++) {
      newGaps[i] = currentGaps[i];
    }

    this.subwarehouses[subwarehouseIndex].rackConfig.custom_gaps = newGaps;
    this.updateSubwarehouseConfigs();
  }

  getTotalPallets(): number {
    return this.subwarehouses.reduce(
      (total, subwarehouse) => total + (subwarehouse.pallets?.length || 0),
      0
    );
  }

  getTotalPalletsWeight(subwarehouse: any): number {
    return (
      subwarehouse.pallets?.reduce(
        (total: number, pallet: any) => total + (pallet.weight || 0),
        0
      ) || 0
    );
  }

  onPalletChange(
    subwarehouseIndex: number,
    palletIndex: number,
    updatedPallet: PalletConfig
  ): void {
    if (this.subwarehouses[subwarehouseIndex]?.pallets[palletIndex]) {
      this.subwarehouses[subwarehouseIndex].pallets[palletIndex] = updatedPallet;
      this.updateSubwarehouseConfigs();
    }
  }

  generateLayout(): void {
    this.setStatus("Generating layout...", "text-warning");
    this.updateSubwarehouseConfigs();
    this.updateWarehouseDimensions();
    
    this.warehouseService.createWarehouse(this.warehouseConfig).subscribe({
      next: (response: any) => {
        this.layoutData = response.layout || response.data;
        
        // Update dimensions from response if available
        if (this.layoutData?.warehouse_dimensions) {
          this.warehouseDimensions = {
            width: this.layoutData.warehouse_dimensions.width,
            length: this.layoutData.warehouse_dimensions.length,
            height: this.layoutData.warehouse_dimensions.height
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
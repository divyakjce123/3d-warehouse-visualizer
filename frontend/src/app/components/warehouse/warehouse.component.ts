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
    num_blocks: 2,
    block_gap: 1000,
    block_gap_unit: "cm",
    block_configs: [],
    blocks: false
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

  blocks: any[] = [];
  layoutData: LayoutData | null = null;
  is3DView: boolean = true;
  statusMessage: string = "Ready";
  statusClass: string = "text-success";

  // Warehouse dimensions for visualization (in cm)
  warehouseDimensions: { length: number; width: number; height: number } | null = null;

  // Track previous num_blocks to avoid unnecessary reinitialization
  private previousNumBlocks: number = 5;

  palletColors: { [key: string]: string } = {
    wooden: "#8B4513",
    plastic: "#1E90FF",
    metal: "#A9A9A9",
  };

  constructor(private warehouseService: WarehouseService) {}

  ngOnInit(): void {
    this.previousNumBlocks = this.warehouseConfig.num_blocks;
    this.initializeBlocks();
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
  trackByBlockIndex(index: number, block: any): number {
    return index;
  }

  trackByGapIndex(index: number, gap: number): number {
    return index;
  }

  trackByPalletIndex(index: number, pallet: any): number {
    return index;
  }

  // Called on blur to avoid losing focus while typing
  onNumBlocksBlur(): void {
    const newNumBlocks = this.warehouseConfig.num_blocks;
    if (newNumBlocks !== this.previousNumBlocks && newNumBlocks > 0) {
      this.adjustBlocksArray(newNumBlocks);
      this.previousNumBlocks = newNumBlocks;
    }
  }

  initializeBlocks(): void {
    this.blocks = [];
    for (let i = 0; i < this.warehouseConfig.num_blocks; i++) {
      this.blocks.push(this.createDefaultBlock());
    }
    this.updateBlockConfigs();
    this.updateWarehouseDimensions();
  }

  private createDefaultBlock(): any {
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

  private adjustBlocksArray(newNumBlocks: number): void {
    const currentLength = this.blocks.length;
    
    if (newNumBlocks > currentLength) {
      // Add new blocks
      for (let i = currentLength; i < newNumBlocks; i++) {
        this.blocks.push(this.createDefaultBlock());
      }
    } else if (newNumBlocks < currentLength) {
      // Remove excess blocks
      this.blocks.splice(newNumBlocks);
    }
    
    this.updateBlockConfigs();
  }

  updateBlockConfigs(): void {
    this.warehouseConfig.block_configs = this.blocks.map((block, index) => {
      const rackConfig = block.rackConfig;
      const wallGaps = block.wallGaps || {
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
        block_index: index,
        rack_config: rackConfigForBackend,
        pallet_configs: block.pallets.map((pallet: any) => ({
          ...pallet,
          color: this.palletColors[pallet.type] || "#8B4513",
        })),
      };
    });
  }

  addPallet(blockIndex: number): void {
    const newPallet: PalletConfig = {
      type: "wooden",
      weight: 1200,
      length_cm: 100,
      width_cm: 100,
      height_cm: 15,
      color: this.palletColors["wooden"],
      position: { floor: 1, row: 1, col: 1 },
    };

    if (!this.blocks[blockIndex].pallets) {
      this.blocks[blockIndex].pallets = [];
    }
    this.blocks[blockIndex].pallets.push(newPallet);
    this.updateBlockConfigs();
  }

  removePallet(blockIndex: number, palletIndex: number): void {
    if (this.blocks[blockIndex]?.pallets) {
      this.blocks[blockIndex].pallets.splice(palletIndex, 1);
      this.updateBlockConfigs();
    }
  }

  updateRackGaps(blockIndex: number): void {
    const numRacks = this.blocks[blockIndex].rackConfig.num_racks;
    const currentGaps = this.blocks[blockIndex].rackConfig.custom_gaps || [];
    const newGaps = Array(numRacks - 1).fill(500);

    for (let i = 0; i < Math.min(currentGaps.length, newGaps.length); i++) {
      newGaps[i] = currentGaps[i];
    }

    this.blocks[blockIndex].rackConfig.custom_gaps = newGaps;
    this.updateBlockConfigs();
  }

  getTotalPallets(): number {
    return this.blocks.reduce(
      (total, block) => total + (block.pallets?.length || 0),
      0
    );
  }

  getTotalPalletsWeight(block: any): number {
    return (
      block.pallets?.reduce(
        (total: number, pallet: any) => total + (pallet.weight || 0),
        0
      ) || 0
    );
  }

  onPalletChange(
    blockIndex: number,
    palletIndex: number,
    updatedPallet: PalletConfig
  ): void {
    if (this.blocks[blockIndex]?.pallets[palletIndex]) {
      this.blocks[blockIndex].pallets[palletIndex] = updatedPallet;
      this.updateBlockConfigs();
    }
  }

  generateLayout(): void {
    this.setStatus("Generating layout...", "text-warning");
    this.updateBlockConfigs();
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
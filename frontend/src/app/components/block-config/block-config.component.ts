import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { PalletConfig, RackConfig } from 'src/app/models/warehouse.models';

@Component({
  selector: 'app-block-config',
  templateUrl: './block-config.component.html',
  styleUrls: ['./block-config.component.css']
})
export class BlockConfigComponent implements OnInit, OnChanges {
  @Input() blockIndex: number = 0;
  @Input() rackConfig!: RackConfig;
  @Input() pallets: PalletConfig[] = [];
  @Input() blockGapUnit: string = 'cm';
  
  @Output() rackConfigChange = new EventEmitter<RackConfig>();
  @Output() palletsChange = new EventEmitter<PalletConfig[]>();
  @Output() addPallet = new EventEmitter<void>();
  @Output() removePallet = new EventEmitter<number>();
  @Output() updateRackGaps = new EventEmitter<void>();

  // Available units for dropdowns
  units = ['cm', 'm', 'mm', 'ft', 'in'];
  weightUnits = ['kg', 'lbs'];
  
  // Pallet types with colors
  palletTypes = [
    { value: 'wooden', label: 'Wooden', color: '#8B4513' },
    { value: 'plastic', label: 'Plastic', color: '#1E90FF' },
    { value: 'metal', label: 'Metal', color: '#A9A9A9' }
  ];

  // Track rack gaps
  rackGaps: { value: number, unit: string }[] = [];

  ngOnInit(): void {
    this.initializeRackGaps();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rackConfig'] && changes['rackConfig'].currentValue) {
      this.initializeRackGaps();
    }
  }

  initializeRackGaps(): void {
    const numGaps = this.rackConfig.num_racks - 1;
    this.rackGaps = [];
    
    for (let i = 0; i < numGaps; i++) {
      this.rackGaps.push({
        value: this.rackConfig.custom_gaps[i] || 20,
        unit: this.rackConfig.wall_gap_unit || 'cm'
      });
    }
  }

  onRackConfigChange(): void {
    // Update custom gaps from rackGaps array, converting each to cm
    this.rackConfig.custom_gaps = this.rackGaps.map(gap =>
      this.convertToCm(gap.value, gap.unit)
    );
    
    // Keep wall_gap_unit ONLY for wall gaps (front/back/left/right),
    // do NOT force all rack gaps to share the same unit anymore.
    
    this.rackConfigChange.emit(this.rackConfig);
    this.updateRackGaps.emit();
  }

  onPalletsChange(): void {
    this.palletsChange.emit(this.pallets);
  }

  onAddPallet(): void {
    const newPallet: PalletConfig = {
      type: 'wooden',
      weight: 500,
      length_cm: 120,
      width_cm: 80,
      height_cm: 15,
      color: '#8B4513',
      position: {
        floor: 1,
        row: 1,
        col: 1
      }
    };
    
    this.pallets.push(newPallet);
    this.onPalletsChange();
    this.addPallet.emit();
  }

  onRemovePallet(index: number): void {
    this.pallets.splice(index, 1);
    this.onPalletsChange();
    this.removePallet.emit(index);
  }

  onPalletTypeChange(pallet: PalletConfig, type: string): void {
    pallet.type = type;
    const palletType = this.palletTypes.find(pt => pt.value === type);
    pallet.color = palletType?.color || '#8B4513';
    this.onPalletsChange();
  }

  getRackGapLabel(index: number): string {
    return `Gap between Rack ${index + 1}-${index + 2}`;
  }

  addRackGap(): void {
    if (this.rackConfig.num_racks > 0) {
      this.rackConfig.num_racks++;
      this.initializeRackGaps();
      this.onRackConfigChange();
    }
  }

  removeRackGap(): void {
    if (this.rackConfig.num_racks > 1) {
      this.rackConfig.num_racks--;
      this.initializeRackGaps();
      this.onRackConfigChange();
    }
  }

  updateRackCount(): void {
    // Update rack gaps based on new rack count
    const oldCount = this.rackGaps.length + 1;
    const newCount = this.rackConfig.num_racks;
    
    if (newCount > oldCount) {
      // Add new gaps
      for (let i = oldCount; i < newCount; i++) {
        this.rackGaps.push({
          value: 20,
          unit: this.rackConfig.wall_gap_unit || 'cm'
        });
      }
    } else if (newCount < oldCount) {
      // Remove extra gaps
      this.rackGaps = this.rackGaps.slice(0, newCount - 1);
    }
    
    // Store gaps in cm for backend
    this.rackConfig.custom_gaps = this.rackGaps.map(gap =>
      this.convertToCm(gap.value, gap.unit)
    );
    this.onRackConfigChange();
  }

  convertToCm(value: number, unit: string): number {
    const conversions: { [key: string]: number } = {
      'cm': 1,
      'm': 100,
      'mm': 0.1,
      'ft': 30.48,
      'in': 2.54
    };
    return value * (conversions[unit] || 1);
  }

  getTotalPalletsWeight(): number {
    return this.pallets.reduce((total, pallet) => total + pallet.weight, 0);
  }

  getBlockInfo(): string {
    return `Block ${this.blockIndex + 1}: ${this.rackConfig.num_floors}F × ${this.rackConfig.num_rows}R × ${this.rackConfig.num_racks}C`;
  }

  // ADD THIS MISSING METHOD
  getTotalGapsWidth(): number {
    if (!this.rackGaps || this.rackGaps.length === 0) {
      return 0;
    }
    
    let totalWidthCm = 0;
    for (const gap of this.rackGaps) {
      totalWidthCm += this.convertToCm(gap.value, gap.unit);
    }
    
    return totalWidthCm;
  }
}
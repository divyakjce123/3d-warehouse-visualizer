import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { WarehouseConfig, BlockConfig } from '../../models/warehouse.models';
import { WarehouseService } from '../../services/warehouse.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Output() generate = new EventEmitter<WarehouseConfig>();
  @Output() reset = new EventEmitter<void>();

  units = ['cm', 'm', 'ft', 'in'];
  palletTypes = ['wooden', 'plastic', 'metal'];
  stockTypes = [
    { value: 'hell_classic', label: 'Hell Classic' },
    { value: 'hell_apple', label: 'Hell Apple' },
    { value: 'hell_multi', label: 'Hell Multi' }
  ];

  config: WarehouseConfig = {
    id: `wh_${Date.now()}`,
    warehouse_dimensions: { length: 5000, width: 3000, height: 1000, unit: 'cm' },
    num_blocks: 2,
    block_gap: 200,
    block_gap_unit: 'cm',
    block_configs: []
  };

  constructor(private warehouseService: WarehouseService) {}

  ngOnInit(): void {
    this.updateBlockCount();
  }

  updateBlockCount(): void {
    const currentLen = this.config.block_configs.length;
    const targetLen = this.config.num_blocks;

    if (targetLen > currentLen) {
      for (let i = currentLen; i < targetLen; i++) {
        this.config.block_configs.push(this.warehouseService.getDefaultBlockConfig(i + 1));
      }
    } else if (targetLen < currentLen) {
      this.config.block_configs = this.config.block_configs.slice(0, targetLen);
    }
  }

  updateRackGaps(block: BlockConfig): void {
    // Logic to resize custom_gaps array based on num_racks
    const numRacks = block.rack_config.num_racks;
    const gapsNeeded = Math.max(0, numRacks - 1);
    const currentGaps = block.rack_config.custom_gaps;
    
    if (currentGaps.length !== gapsNeeded) {
      block.rack_config.custom_gaps = new Array(gapsNeeded).fill(50);
    }
  }

  onGenerate(): void {
    this.config.id = `wh_${Date.now()}`;
    this.generate.emit(this.config);
  }

  onReset(): void {
    if(confirm('Reset all configurations?')) {
      this.reset.emit();
    }
  }
}
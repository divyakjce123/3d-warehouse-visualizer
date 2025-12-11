import math

class WarehouseCalculator:
    def __init__(self):
        self.conversion_factors = {
            'cm': 0.01, 'm': 1.0, 'km': 1000.0,
            'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mi': 1609.34
        }
    
    def convert_to_meters(self, value, unit):
        if unit not in self.conversion_factors:
            raise ValueError(f"Unsupported unit: {unit}")
        return value * self.conversion_factors[unit]
    
    def create_warehouse_layout(self, config):
        """Create complete warehouse layout with heterogeneous blocks"""
        
        # 1. Warehouse Dimensions
        wh_dims = config['warehouse_dimensions']
        wh_length = self.convert_to_meters(wh_dims['length'], wh_dims['unit'])
        wh_width = self.convert_to_meters(wh_dims['width'], wh_dims['unit'])
        wh_height = self.convert_to_meters(wh_dims['height'], wh_dims['unit'])
        
        num_blocks = config['num_blocks']
        block_gap = self.convert_to_meters(config['block_gap'], config['block_gap_unit'])
        
        # 2. Calculate Block Sizes (Evenly divided along Width)
        # Available width = Total Width - (Gaps between blocks)
        total_gap_width = block_gap * (num_blocks - 1) if num_blocks > 1 else 0
        available_width = wh_width - total_gap_width
        
        block_width = available_width / num_blocks
        block_length = wh_length
        
        blocks_layout = []
        
        # Calculate starting X to center everything
        total_occupied_width = (block_width * num_blocks) + total_gap_width
        start_x = -total_occupied_width / 2 + block_width / 2
        
        # 3. Generate Each Block
        for i, block_conf in enumerate(config['block_configs']):
            block_id = f"block_{i + 1}"
            x_offset = start_x + i * (block_width + block_gap)
            
            block_data = {
                'id': block_id,
                'name': f"Block {i + 1}",
                'position': {'x': x_offset, 'y': 0, 'z': 0},
                'dimensions': {
                    'width': block_width,
                    'length': block_length,
                    'height': wh_height
                },
                'color': self.get_block_color(i),
                'racks': []
            }
            
            # 4. Generate Racks based on specific config
            racks = self.calculate_racks_for_block(block_data['dimensions'], block_conf)
            block_data['racks'] = racks
            
            blocks_layout.append(block_data)
            
        return {
            'warehouse_dimensions': config['warehouse_dimensions'],
            'blocks': blocks_layout
        }

    def calculate_racks_for_block(self, block_dims, block_conf):
        racks = []
        rack_cfg = block_conf['rack_config']
        
        # Wall gaps
        gap_f = self.convert_to_meters(rack_cfg['gap_front'], rack_cfg['wall_gap_unit'])
        gap_b = self.convert_to_meters(rack_cfg['gap_back'], rack_cfg['wall_gap_unit'])
        gap_l = self.convert_to_meters(rack_cfg['gap_left'], rack_cfg['wall_gap_unit'])
        gap_r = self.convert_to_meters(rack_cfg['gap_right'], rack_cfg['wall_gap_unit'])
        
        # Rack spacing
        gap_rack = self.convert_to_meters(rack_cfg['gap_between_racks'], rack_cfg['gap_unit'])
        
        # Layout info
        num_rows = rack_cfg['num_rows']
        num_racks_total = rack_cfg['num_racks']
        num_floors = rack_cfg['num_floors']
        
        racks_per_row = math.ceil(num_racks_total / num_rows) if num_rows > 0 else 0
        
        # Available space
        avail_w = block_dims['width'] - gap_l - gap_r
        avail_l = block_dims['length'] - gap_f - gap_b
        
        if racks_per_row == 0: return []

        # Calculate single rack size
        total_rack_gaps_w = gap_rack * (racks_per_row - 1) if racks_per_row > 1 else 0
        rack_w = (avail_w - total_rack_gaps_w) / racks_per_row
        
        total_row_gaps = gap_rack * (num_rows - 1) if num_rows > 1 else 0
        rack_l = (avail_l - total_row_gaps) / num_rows
        
        rack_h = block_dims['height'] * 0.8
        floor_h = rack_h / num_floors
        
        count = 0
        for r in range(num_rows):
            for c in range(racks_per_row):
                if count >= num_racks_total: break
                
                # Center-relative positioning
                x_start = -block_dims['width']/2 + gap_l + (rack_w/2)
                x_pos = x_start + c * (rack_w + gap_rack)
                
                z_start = -block_dims['length']/2 + gap_f + (rack_l/2)
                z_pos = z_start + r * (rack_l + gap_rack)
                
                rack_id = f"rack_{r+1}_{c+1}"
                
                for f in range(num_floors):
                    y_pos = (f * floor_h) + (floor_h/2)
                    
                    rack_data = {
                        'id': f"{rack_id}_f{f+1}",
                        'position': {'x': x_pos, 'y': y_pos, 'z': z_pos},
                        'dimensions': {
                            'width': rack_w,
                            'length': rack_l,
                            'height': floor_h
                        },
                        'floor': f+1, 'row': r+1, 'column': c+1
                    }
                    
                    # Add pallet if position matches user input
                    stock_pos = block_conf['stock_config']['position']
                    if stock_pos['floor'] == f+1 and stock_pos['row'] == r+1 and stock_pos['col'] == c+1:
                        rack_data['pallet'] = self.create_pallet_data(block_conf)
                        
                    racks.append(rack_data)
                
                count += 1
                
        return racks

    def create_pallet_data(self, block_conf):
        pc = block_conf['pallet_config']
        sc = block_conf['stock_config']
        
        return {
            'type': pc['type'],
            'color': pc['color'],
            'weight': pc['weight'],
            'dimensions': {
                'length': self.convert_to_meters(pc['length'], pc['unit']),
                'width': self.convert_to_meters(pc['width'], pc['unit']),
                'height': self.convert_to_meters(pc['height'], pc['unit']),
            },
            'stock': {
                'type': sc['type'],
                'color': sc['color'],
                'dimensions': {
                    'length': self.convert_to_meters(sc['length'], sc['unit']),
                    'width': self.convert_to_meters(sc['width'], sc['unit']),
                    'height': self.convert_to_meters(sc['height'], sc['unit']),
                }
            }
        }

    def get_block_color(self, index):
        colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#073B4C', '#7209B7', '#F72585']
        return colors[index % len(colors)]
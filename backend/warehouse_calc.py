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
        """
        Main entry point.
        Calculates the layout for the entire warehouse, dividing it into blocks
        and then delegating rack calculation to each specific block config.
        """
        
        # 1. Parse Warehouse Dimensions
        wh_dims = config['warehouse_dimensions']
        wh_L = self.convert_to_meters(wh_dims['length'], wh_dims['unit'])
        wh_W = self.convert_to_meters(wh_dims['width'], wh_dims['unit'])
        wh_H = self.convert_to_meters(wh_dims['height'], wh_dims['unit'])
        
        # 2. Divide Warehouse into Blocks
        num_blocks = config['num_blocks']
        block_gap = self.convert_to_meters(config['block_gap'], config['block_gap_unit'])
        
        # Calculate total width consumed by gaps
        total_gap_width = block_gap * (num_blocks - 1) if num_blocks > 1 else 0
        
        # Remaining width for blocks
        available_width = wh_W - total_gap_width
        if available_width <= 0:
            raise ValueError("Block gaps are too large for the warehouse width.")
            
        block_width = available_width / num_blocks
        block_length = wh_L  # Blocks span the full length of the warehouse
        
        blocks_layout = []
        
        # Calculate starting X to center the group of blocks in the 3D scene (0,0,0 is center)
        # Total structure width = num_blocks * width + gaps
        total_structure_width = (block_width * num_blocks) + total_gap_width
        start_x = -total_structure_width / 2 + (block_width / 2)
        
        # 3. Process Each Block Config
        # We iterate through the user-provided configs for each block
        for i, block_conf in enumerate(config['block_configs']):
            # Calculate position for this specific block
            x_offset = start_x + i * (block_width + block_gap)
            
            block_id = f"block_{i + 1}"
            
            block_data = {
                'id': block_id,
                'name': f"Block {i + 1}",
                'position': {'x': x_offset, 'y': 0, 'z': 0},
                'dimensions': {
                    'width': block_width,
                    'length': block_length,
                    'height': wh_H
                },
                'color': self.get_block_color(i),
                'racks': [] # Will be filled below
            }
            
            # Calculate Racks specific to THIS block's configuration
            racks = self.calculate_racks_for_block(block_data['dimensions'], block_conf)
            block_data['racks'] = racks
            
            blocks_layout.append(block_data)
            
        return {
            'warehouse_dimensions': config['warehouse_dimensions'],
            'blocks': blocks_layout
        }

    def calculate_racks_for_block(self, block_dims, block_conf):
        """
        Calculates rack positions inside a single block using its specific gaps and counts.
        """
        racks = []
        rack_cfg = block_conf['rack_config']
        
        # Convert Wall Gaps
        gap_unit = rack_cfg['wall_gap_unit']
        gap_f = self.convert_to_meters(rack_cfg['gap_front'], gap_unit)
        gap_b = self.convert_to_meters(rack_cfg['gap_back'], gap_unit)
        gap_l = self.convert_to_meters(rack_cfg['gap_left'], gap_unit)
        gap_r = self.convert_to_meters(rack_cfg['gap_right'], gap_unit)
        
        # Convert Custom Rack Gaps (List)
        # custom_gaps[0] is gap between rack 1 & 2
        custom_gaps = [self.convert_to_meters(g, rack_cfg['gap_unit']) for g in rack_cfg.get('custom_gaps', [])]
        
        num_rows = rack_cfg['num_rows']
        num_racks_total = rack_cfg['num_racks']
        num_floors = rack_cfg['num_floors']
        
        if num_rows < 1: num_rows = 1
        racks_per_row = math.ceil(num_racks_total / num_rows)
        if racks_per_row == 0: return []

        # --- Calculate Rack Dimensions ---
        # We need to fit 'racks_per_row' racks into the available width.
        # The width taken by gaps varies per row, but racks usually have uniform width.
        # We find the 'tightest' fit required (max total gaps in a row) to determine safe rack width.
        
        max_row_gap_sum = 0
        
        for r in range(num_rows):
            current_row_gap_sum = 0
            start_rack_idx = r * racks_per_row
            
            # Sum the specific gaps for this row
            # We need (racks_per_row - 1) gaps
            for c in range(racks_per_row - 1):
                # The gap between global rack index N and N+1 is stored at custom_gaps[N]?
                # No, custom_gaps[0] is 1-2. 
                # So gap after rack N (0-indexed) is custom_gaps[N].
                
                # Global index of the rack to the LEFT of the gap
                gap_index = start_rack_idx + c
                
                if gap_index < len(custom_gaps):
                    current_row_gap_sum += custom_gaps[gap_index]
            
            if current_row_gap_sum > max_row_gap_sum:
                max_row_gap_sum = current_row_gap_sum

        avail_w = block_dims['width'] - gap_l - gap_r
        avail_l = block_dims['length'] - gap_f - gap_b
        
        # Rack Width
        rack_w = (avail_w - max_row_gap_sum) / racks_per_row
        if rack_w < 0.1: rack_w = 0.5 # Safety fallback if config is impossible
        
        # Rack Length (Depth) - Uniform spacing for rows
        row_gap_std = 1.5 # 1.5m aisle between rows
        total_row_gaps = row_gap_std * (num_rows - 1)
        rack_l = (avail_l - total_row_gaps) / num_rows
        
        # Rack Height
        rack_h = block_dims['height'] * 0.75
        floor_h = rack_h / num_floors
        
        # --- Generate Rack Positions ---
        global_cnt = 0
        
        for r in range(num_rows):
            # Reset X cursor to left wall gap
            current_x = -block_dims['width']/2 + gap_l
            
            for c in range(racks_per_row):
                if global_cnt >= num_racks_total: break
                
                # Add gap BEFORE placing rack (except for first rack in row)
                if c > 0:
                    # Gap between previous rack and this one
                    # Previous rack index was global_cnt - 1
                    gap_idx = global_cnt - 1
                    gap_val = 0
                    if gap_idx < len(custom_gaps):
                        gap_val = custom_gaps[gap_idx]
                    
                    current_x += gap_val
                
                # Calculate center position for this rack
                # current_x is at the left edge of the rack
                pos_x = current_x + (rack_w / 2)
                
                # Z position (Length)
                # Starts at -length/2 + front gap + half rack length + row offset
                pos_z = (-block_dims['length']/2) + gap_f + (rack_l / 2) + (r * (rack_l + row_gap_std))
                
                rack_name = f"Rack {global_cnt + 1} (R{r+1} C{c+1})"
                
                # Generate Floors
                for f in range(num_floors):
                    pos_y = (f * floor_h) + (floor_h / 2)
                    
                    rack_id = f"{block_dims['width']}_{global_cnt}_{f}" # unique string
                    
                    rack_entry = {
                        'id': f"rack_{global_cnt}_f{f}",
                        'name': rack_name,
                        'position': {'x': pos_x, 'y': pos_y, 'z': pos_z},
                        'dimensions': {'width': rack_w, 'length': rack_l, 'height': floor_h},
                        'floor': f+1, 'row': r+1, 'column': c+1
                    }
                    
                    # Check if Stock should be placed here
                    stock_pos = block_conf['stock_config']['position']
                    # User input is 1-based (Floor 1, Row 1, Col 1)
                    if (stock_pos['floor'] == f+1 and 
                        stock_pos['row'] == r+1 and 
                        stock_pos['col'] == c+1):
                        
                        rack_entry['pallet'] = self.create_pallet_data(block_conf)
                    
                    racks.append(rack_entry)
                
                # Advance X cursor past this rack
                current_x += rack_w
                global_cnt += 1
                
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
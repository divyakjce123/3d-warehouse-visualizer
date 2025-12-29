import math

class WarehouseCalculator:
    def __init__(self):
        self.conversion_factors = {
            'cm': 1.0, 'm': 100.0, 'km': 100000.0,
            'in': 2.54, 'ft': 30.48, 'yd': 91.44, 'mm': 0.1
        }

        self.MIN_RACK_WIDTH_CM = 1.0
        self.MIN_RACK_LENGTH_CM = 1.0
        self.MIN_FLOOR_HEIGHT_CM = 10.0

    def to_cm(self, value, unit):
        if value is None:
            return 0.0
        try:
            return float(value) * self.conversion_factors.get(unit.lower(), 1.0)
        except ValueError:
            return 0.0

    def create_warehouse_layout(self, config):
        wh = config['warehouse_dimensions']

        W = self.to_cm(wh['width'], wh['unit'])
        L = self.to_cm(wh['length'], wh['unit'])
        H = self.to_cm(wh['height'], wh['unit'])
        H_safety = self.to_cm(wh['height_safety_margin'], wh['unit'])

        n_ws = config['num_workstations']
        wg = self.to_cm(config['workstation_gap'], config['workstation_gap_unit'])

        workstation_width = (W - wg * (n_ws - 1)) / n_ws
        workstation_height = H - H_safety

        workstations = []

        for i, ws_conf in enumerate(config['workstation_configs']):
            ws_x = i * (workstation_width + wg)

            aisle_width = self.to_cm(
                ws_conf['aisle_width'],
                ws_conf.get('aisle_width_unit', 'cm')
            )

            side_width = (workstation_width - aisle_width) / 2

            aisles = []

            # CENTRAL AISLE
            aisles.append({
                "id": f"central-aisle-{i}",
                "type": "central_aisle",
                "position": {"x": ws_x + side_width, "y": 0, "z": 0},
                "dimensions": {
                    "width": aisle_width,
                    "length": L,
                    "height": workstation_height
                }
            })

            # LEFT + RIGHT SIDES
            aisles += self._process_side(
                ws_conf['left_side_config'],
                ws_x,
                side_width,
                L,
                workstation_height,
                i,
                "left"
            )

            aisles += self._process_side(
                ws_conf['right_side_config'],
                ws_x + side_width + aisle_width,
                side_width,
                L,
                workstation_height,
                i,
                "right"
            )

            # ASSIGN PALLETS
            self._assign_pallets(ws_conf.get('pallet_configs', []), aisles)

            workstations.append({
                "id": f"workstation_{i+1}",
                "position": {"x": ws_x, "y": 0, "z": 0},
                "dimensions": {
                    "width": workstation_width,
                    "length": L,
                    "height": H
                },
                "aisles": aisles
            })

        return {
            "warehouse_dimensions": {
                "width": W,
                "length": L,
                "height": H
            },
            "workstations": workstations
        }

    def _process_side(
        self,
        cfg,
        start_x,
        side_width,
        side_length,
        side_height,
        ws_index,
        side_name
    ):
        gf = self.to_cm(cfg['gap_front'], cfg['wall_gap_unit'])
        gb = self.to_cm(cfg['gap_back'], cfg['wall_gap_unit'])
        gl = self.to_cm(cfg['gap_left'], cfg['wall_gap_unit'])
        gr = self.to_cm(cfg['gap_right'], cfg['wall_gap_unit'])

        avail_w = side_width - gl - gr
        avail_l = side_length - gf - gb

        rows = cfg['num_rows']
        floors = cfg['num_floors']
        num_aisles = cfg['num_aisles']
        depth = cfg['depth']

        # ✅ TRUE STORAGE AISLE COUNT
        n = num_aisles * depth

        custom_gaps = [self.to_cm(g, cfg['wall_gap_unit']) for g in cfg.get('custom_gaps', [])]
        custom_gaps += [0.0] * (n - 1 - len(custom_gaps))

        aisle_width = (avail_w - sum(custom_gaps)) / n
        aisle_length = avail_l / rows
        aisle_height = side_height / floors

        aisles = []

        for r in range(rows):
            y = gf + r * aisle_length
            current_x = start_x + gl
            aisle_no = 1

            for d in range(depth):
                for a in range(num_aisles):

                    if aisle_no > 1:
                        current_x += custom_gaps[aisle_no - 2]

                    for f in range(floors):
                        aisles.append({
                            "id": f"aisle-{ws_index}-{side_name}-{r}-{aisle_no}-{f}",
                            "type": "storage_aisle",
                            "side": side_name,
                            "position": {
                                "x": current_x,
                                "y": y,
                                "z": f * aisle_height
                            },
                            "dimensions": {
                                "width": aisle_width,
                                "length": aisle_length,
                                "height": aisle_height
                            },
                            "indices": {
                                "row": r + 1,
                                "floor": f + 1,
                                "aisle_no": aisle_no,          # ✅ GLOBAL (1 → n)
                                "depth": d + 1,
                                "aisle_in_depth": a + 1
                            },
                            "pallets": []
                        })

                    current_x += aisle_width
                    aisle_no += 1

        return aisles

    def _assign_pallets(self, pallets, aisles):
        for p in pallets:
            pos = p['position']
            for aisle in aisles:
                if aisle['type'] != 'storage_aisle':
                    continue
                if (
                    aisle['side'] == pos['side'] and
                    aisle['indices']['row'] == pos['row'] and
                    aisle['indices']['floor'] == pos['floor'] and
                    aisle['indices']['aisle_no'] == pos['aisle_no']
                ):
                    aisle['pallets'].append({
                        "type": p['type'],
                        "color": p.get('color', '#8B4513'),
                        "dims": p.get('dims', {})
                    })
                    break

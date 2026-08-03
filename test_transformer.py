import json, re, uuid

def gen_id():
    return "gge" + uuid.uuid4().hex[:8]

def transform_svg_path(path_str, dx, dy):
    # Regex to shift numbers in SVG path M x y L x y A rx ry rot large sweep x y Z
    def repl_cmd(m):
        cmd = m.group(1)
        coords = m.group(2).strip().split()
        new_coords = []
        if cmd.upper() in ['M', 'L', 'T']:
            for idx in range(0, len(coords), 2):
                if idx+1 < len(coords):
                    x = float(coords[idx]) + dx
                    y = float(coords[idx+1]) + dy
                    new_coords.extend([f"{x:.4f}", f"{y:.4f}"])
        elif cmd.upper() == 'A':
            # rx ry x-axis-rotation large-arc-flag sweep-flag x y
            if len(coords) >= 7:
                rx, ry, rot, la, sw, x, y = coords[:7]
                nx = float(x) + dx
                ny = float(y) + dy
                new_coords = [rx, ry, rot, la, sw, f"{nx:.4f}", f"{ny:.4f}"]
        else:
            new_coords = coords
        return cmd + " " + " ".join(new_coords)
    
    return re.sub(r'([a-zA-Z])\s*([^a-zA-Z]*)', repl_cmd, path_str)

def transform_sch_shape(shape_str, dx, dy, net_map={}, ref_suffix=""):
    parts = shape_str.split('~')
    stype = parts[0]
    
    if stype == 'LIB':
        parts[1] = f"{float(parts[1]) + dx:.4f}"
        parts[2] = f"{float(parts[2]) + dy:.4f}"
        # Update prefix/designator if ref_suffix provided
        full_str = '~'.join(parts)
        if ref_suffix:
            # Change C1 -> C1_M1, U1 -> U1_M1, etc.
            full_str = re.sub(r'comment~([A-Z]+[0-9]+)~', r'comment~\1' + ref_suffix + '~', full_str)
        return full_str
    elif stype == 'W':
        coords = parts[1].split(' ')
        new_c = []
        for i in range(0, len(coords), 2):
            if i+1 < len(coords):
                new_c.extend([f"{float(coords[i])+dx:.4f}", f"{float(coords[i+1])+dy:.4f}"])
        parts[1] = ' '.join(new_c)
        return '~'.join(parts)
    elif stype in ['F', 'J', 'TEXT']:
        parts[2] = f"{float(parts[2]) + dx:.4f}"
        parts[3] = f"{float(parts[3]) + dy:.4f}"
        full_str = '~'.join(parts)
        for old_net, new_net in net_map.items():
            full_str = full_str.replace(f"^^{old_net}^^", f"^^{new_net}^^")
        return full_str
    return shape_str

# Test transformer on SCH
with open('SCH_simplefocmini_2024-04-26.json') as f:
    sch = json.load(f)

src_shapes = sch['schematics'][0]['dataStr']['shape']
m1_shapes = [transform_sch_shape(s, 0, 0, {"IN1": "MOT1_A", "IN2": "MOT1_B", "IN3": "MOT1_C", "EN": "MOT1_EN"}, "_L") for s in src_shapes]
m2_shapes = [transform_sch_shape(s, 600, 0, {"IN1": "MOT2_A", "IN2": "MOT2_B", "IN3": "MOT2_C", "EN": "MOT2_EN"}, "_R") for s in src_shapes]

print("Transformed M1 shapes:", len(m1_shapes))
print("Transformed M2 shapes:", len(m2_shapes))

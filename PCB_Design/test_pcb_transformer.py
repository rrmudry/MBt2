import json, re, uuid

def transform_pcb_shape(shape_str, dx, dy, net_map={}, ref_suffix=""):
    parts = shape_str.split('~')
    stype = parts[0]

    # Remap nets if in net_map
    def map_net(n):
        return net_map.get(n, n)

    if stype == 'TRACK':
        # TRACK~layer~width~net~coords~id~0
        parts[3] = map_net(parts[3])
        coords = parts[4].split(' ')
        new_c = []
        for i in range(0, len(coords), 2):
            if i+1 < len(coords):
                new_c.extend([f"{float(coords[i])+dx:.4f}", f"{float(coords[i+1])+dy:.4f}"])
        parts[4] = ' '.join(new_c)
        return '~'.join(parts)

    elif stype == 'PAD':
        # PAD~shape~x~y~w~h~layer~net~num~hole_d~points~rot~id~0~~Y~0~0~0.2~x,y
        parts[2] = f"{float(parts[2])+dx:.4f}"
        parts[3] = f"{float(parts[3])+dy:.4f}"
        parts[7] = map_net(parts[7])
        if len(parts) > 17:
            # Trailing x,y
            try:
                tx, ty = parts[17].split(',')
                parts[17] = f"{float(tx)+dx:.4f},{float(ty)+dy:.4f}"
            except:
                pass
        return '~'.join(parts)

    elif stype == 'VIA':
        # VIA~x~y~diameter~net~hole_d~id~0
        parts[1] = f"{float(parts[1])+dx:.4f}"
        parts[2] = f"{float(parts[2])+dy:.4f}"
        parts[4] = map_net(parts[4])
        return '~'.join(parts)

    elif stype == 'LIB':
        # LIB~x~y~package...#@$PAD~...#@$TRACK~...
        parts[1] = f"{float(parts[1])+dx:.4f}"
        parts[2] = f"{float(parts[2])+dy:.4f}"
        
        # Transform sub-elements inside LIB separated by #@$
        sub_elements = shape_str.split('#@$')
        new_subs = []
        for idx, sub in enumerate(sub_elements):
            if idx == 0:
                # Main LIB header
                lp = sub.split('~')
                lp[1] = f"{float(lp[1])+dx:.4f}"
                lp[2] = f"{float(lp[2])+dy:.4f}"
                new_subs.append('~'.join(lp))
            else:
                sp = sub.split('~')
                subtype = sp[0]
                if subtype in ['T', 'TEXT']:
                    sp[2] = f"{float(sp[2])+dx:.4f}"
                    sp[3] = f"{float(sp[3])+dy:.4f}"
                    new_subs.append('~'.join(sp))
                elif subtype == 'P':
                    sp[2] = f"{float(sp[2])+dx:.4f}"
                    sp[3] = f"{float(sp[3])+dy:.4f}"
                    new_subs.append('~'.join(sp))
                elif subtype in ['PAD', 'TRACK', 'PL']:
                    # Transform coordinates inside sub-shapes
                    sub_str = '~'.join(sp)
                    # Replace coordinate pairs
                    def repl_coords(m):
                        c_str = m.group(0)
                        nums = c_str.split(' ')
                        nc = []
                        for i in range(0, len(nums), 2):
                            if i+1 < len(nums):
                                nc.extend([f"{float(nums[i])+dx:.4f}", f"{float(nums[i+1])+dy:.4f}"])
                        return ' '.join(nc)
                    sub_str = re.sub(r'(\d+\.?\d*\s+\d+\.?\d*(\s+\d+\.?\d*\s+\d+\.?\d*)*)', repl_coords, sub_str)
                    new_subs.append(sub_str)
                else:
                    new_subs.append(sub)
        return '#@$'.join(new_subs)

    return shape_str

# Test PCB transformer
with open('PCB_simplefocmini_2024-04-26.json') as f:
    pcb = json.load(f)

src_pcb_shapes = pcb['shape']
m1_pcb = [transform_pcb_shape(s, 0, 0, {"IN1": "MOT1_A", "IN2": "MOT1_B", "IN3": "MOT1_C", "EN": "MOT1_EN"}, "_L") for s in src_pcb_shapes]
m2_pcb = [transform_pcb_shape(s, 200, 0, {"IN1": "MOT2_A", "IN2": "MOT2_B", "IN3": "MOT2_C", "EN": "MOT2_EN"}, "_R") for s in src_pcb_shapes]

print("Transformed PCB M1 shapes:", len(m1_pcb))
print("Transformed PCB M2 shapes:", len(m2_pcb))

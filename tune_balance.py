import serial, time, statistics, math, sys, select, termios, tty, json, csv

# === TUNING PARAMETERS ===
# I will edit these values based on your feedback after each run
PID_STB_P = 30.0
PID_STB_I = 0.0
PID_STB_D = 1.0

# Keeping Velocity PID weak/zero to isolate stabilization
PID_VEL_P = 0.0
PID_VEL_I = 0.0
PID_VEL_D = 0.0

# Mechanical center of gravity offset (degrees)
PITCH_OFFSET = 3.47
# =========================

def setup_terminal():
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    tty.setcbreak(fd)
    return old_settings

def restore_terminal(settings):
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, settings)

def is_space_pressed():
    if select.select([sys.stdin], [], [], 0) == ([sys.stdin], [], []):
        c = sys.stdin.read(1)
        if c == ' ': return True
        if c == '\x03': raise KeyboardInterrupt
    return False

print("Connecting to ESP32...")
try:
    s = serial.Serial('/dev/ttyUSB0', 230400, timeout=0.05)
    s.setDTR(False)
    s.setRTS(False)
except Exception as e:
    print("Failed to open port:", e)
    sys.exit(1)

# Ensure Stream is ON
print("Enabling Stream...")
s.write(b"S\n")
time.sleep(0.1)

print("\nSending Tuning Parameters to ESP32...")
cmds = [
    f"O{PITCH_OFFSET}",
    f"AP{PID_STB_P}", f"AI{PID_STB_I}", f"AD{PID_STB_D}",
    f"VP{PID_VEL_P}", f"VI{PID_VEL_I}", f"VD{PID_VEL_D}",
]
for cmd in cmds:
    s.write((cmd + "\n").encode('utf-8'))
    time.sleep(0.05)
s.flushInput()
print("Parameters Applied.")

print("\n" + "="*50)
print("              BALANCING TUNER")
print("="*50)
print("1. Hold the robot perfectly upright (wheels on ground).")
print("2. Press SPACEBAR to enable the balancing motors.")
print("3. Gently let go. Observe if it oscillates or falls.")
print("4. Press SPACEBAR again to disable and save the report.")
print("   (Press Ctrl+C to force exit)")
print("="*50)

old_term = setup_terminal()
try:
    # Wait for start
    while not is_space_pressed():
        time.sleep(0.01)
        
    print("\n\n>>> BALANCING ENABLED <<<")
    s.write(b"B\n")
    s.flushInput()
    
    data = []
    # Collect data until space pressed again
    while not is_space_pressed():
        try:
            line = s.readline().decode('utf-8', 'ignore').strip()
            if line.startswith("DATA,"):
                parts = line.split(',')
                if len(parts) == 7:
                    t = int(parts[1])
                    vl = float(parts[2])
                    vr = float(parts[3])
                    ax = float(parts[4])
                    ay = float(parts[5])
                    az = float(parts[6])
                    
                    pitch_rad = math.atan2(-ax, math.sqrt(ay*ay + az*az))
                    pitch_deg = pitch_rad * (180.0 / math.pi)
                    g_mag = math.sqrt(ax*ax + ay*ay + az*az)
                    
                    data.append((t, pitch_deg, vl, vr, ax, ay, az))
                    
                    if len(data) % 5 == 0:
                        sys.stdout.write(f"\rLive Pitch: {pitch_deg:>6.1f} deg | Vib: {g_mag:>5.2f} g")
                        sys.stdout.flush()
        except Exception as e:
            pass

    print("\n\n>>> BALANCING DISABLED <<<")
    s.write(b"B\n")
    time.sleep(0.1)
    # Stop motors just in case
    s.write(b"L0\nR0\n")
    
    if len(data) > 10:
        pitches = [d[1] for d in data]
        gmags = [math.sqrt(d[4]**2 + d[5]**2 + d[6]**2) for d in data]
        
        mean_pitch = statistics.mean(pitches)
        std_pitch = statistics.stdev(pitches)
        std_vib = statistics.stdev(gmags)
        
        report = {
            "timestamp": time.time(),
            "samples": len(data),
            "pid_stb": {"P": PID_STB_P, "I": PID_STB_I, "D": PID_STB_D},
            "pid_vel": {"P": PID_VEL_P, "I": PID_VEL_I, "D": PID_VEL_D},
            "pitch_avg": mean_pitch,
            "pitch_stddev": std_pitch,
            "vibration_stddev": std_vib
        }
        
        with open("tuning_report.txt", "w") as f:
            json.dump(report, f, indent=2)

        with open("run_data.csv", "w", newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["time_ms", "pitch_deg", "vel_left", "vel_right", "ax", "ay", "az"])
            for row in data:
                writer.writerow(row)
        
        print("\n" + "-"*30)
        print("Tuning run complete.")
        print(f"Mean Pitch : {mean_pitch:.2f} deg")
        print(f"Pitch Error: {std_pitch:.2f} deg stddev")
        print(f"Vibration  : {std_vib:.3f} m/s^2 stddev")
        print("-" * 30)
        print("Report saved to tuning_report.txt and run_data.csv. Antigravity will analyze it next.")
    else:
        print("\nNot enough data collected.")

except KeyboardInterrupt:
    print("\n\n>>> EMERGENCY STOP <<<")
    s.write(b"B\n")
    time.sleep(0.1)
    s.write(b"L0\nR0\n")
finally:
    restore_terminal(old_term)

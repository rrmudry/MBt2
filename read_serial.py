import serial
import time

try:
    ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=2)
    print("Connected to /dev/ttyUSB0 at 115200 baud.")
    
    # Send a reset signal (DTR/RTS) to force a reboot and catch the boot logs
    ser.setDTR(False)
    ser.setRTS(False)
    time.sleep(0.1)
    ser.setDTR(True)
    ser.setRTS(True)
    time.sleep(0.1)
    ser.setDTR(False)
    ser.setRTS(False)
    
    print("Reset sent. Listening for 5 seconds...")
    start_time = time.time()
    while time.time() - start_time < 5:
        if ser.in_waiting:
            line = ser.readline()
            try:
                print(f"[{time.time() - start_time:.2f}s] {line.decode('utf-8', errors='replace').strip()}")
            except:
                print(f"[{time.time() - start_time:.2f}s] RAW: {line}")
        else:
            time.sleep(0.01)
            
    ser.close()
    print("Done listening.")
except Exception as e:
    print(f"Error: {e}")

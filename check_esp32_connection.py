#!/usr/bin/env python3
import sys
import time
import glob
import serial
import serial.tools.list_ports

def find_esp32_ports():
    """Scans system for potential ESP32 USB serial ports."""
    usb_ports = []
    # Search via serial.tools.list_ports
    for port in serial.tools.list_ports.comports():
        dev = port.device
        if 'ttyUSB' in dev or 'ttyACM' in dev or port.vid is not None:
            usb_ports.append((dev, f"{port.description} [{port.hwid}]"))
    
    # Fallback search if list_ports missed anything
    if not usb_ports:
        for p in glob.glob('/dev/ttyUSB*') + glob.glob('/dev/ttyACM*'):
            usb_ports.append((p, "USB Serial Device"))
            
    return usb_ports

def test_connection(port_path, baudrate=115200, timeout=3.0):
    print("=" * 60)
    print(f"🔌 Testing ESP32 Serial Connection on: {port_path}")
    print(f"⚡ Baud Rate: {baudrate}")
    print("=" * 60)
    
    try:
        ser = serial.Serial(port_path, baudrate, timeout=1.0)
    except Exception as e:
        print(f"❌ Failed to open port {port_path}: {e}")
        return False

    print("✔ Serial port opened successfully.")
    
    # Reset ESP32 using DTR/RTS lines
    print("🔄 Sending reboot signal (DTR/RTS toggle)...")
    ser.setDTR(False)
    ser.setRTS(False)
    time.sleep(0.1)
    ser.setDTR(True)
    ser.setRTS(True)
    time.sleep(0.1)
    ser.setDTR(False)
    ser.setRTS(False)
    time.sleep(0.3)
    
    # Listen for initial boot message or output
    print(f"📥 Listening for incoming data ({timeout}s window)...")
    start_time = time.time()
    lines_received = []
    
    # Also send a PING command
    ser.write(b"PING\n")
    
    while time.time() - start_time < timeout:
        if ser.in_waiting > 0:
            raw = ser.readline()
            line = raw.decode('utf-8', errors='replace').strip()
            if line:
                lines_received.append(line)
                print(f"  [ESP32 -> PC]: {line}")
        else:
            time.sleep(0.05)
            
    ser.close()
    
    print("-" * 60)
    if lines_received:
        print(f"✅ SUCCESS: Received {len(lines_received)} line(s) from ESP32!")
        print("🎉 Connection between ESP32 and Computer is WORKING PERFECTLY!")
        return True
    else:
        print("⚠️ WARNING: Port opened, but NO serial data was received from the ESP32.")
        print("   Troubleshooting Checklist:")
        print("   1. Check if the ESP32 power LED is lit.")
        print("   2. Ensure the USB cable supports DATA (not a power-only cable).")
        print("   3. Make sure the baud rate in firmware matches 115200.")
        print("   4. Verify firmware is flashed and running `Serial.begin(115200)`.")
        return False

if __name__ == "__main__":
    ports = find_esp32_ports()
    if not ports:
        print("❌ No USB Serial ports (/dev/ttyUSB* or /dev/ttyACM*) found!")
        print("   Please make sure your ESP32 is plugged in via USB.")
        sys.exit(1)
        
    print(f"Found {len(ports)} serial port(s):")
    for device, desc in ports:
        print(f"  • {device}: {desc}")
    print()
    
    # Use the first available port (or /dev/ttyUSB0 if specified)
    target_port = sys.argv[1] if len(sys.argv) > 1 else ports[0][0]
    success = test_connection(target_port)
    sys.exit(0 if success else 1)

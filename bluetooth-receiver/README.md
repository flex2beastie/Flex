# Bluetooth receiver for MSI Cubi

Makes the Cubi appear as a Bluetooth speaker (A2DP sink). Phones/laptops pair with it and stream audio out of its headphone jack or HDMI.

## Requirements
- Debian 12+ / Ubuntu 22.04+ (needs PipeWire). Not for immutable distros like ZimaOS; install Debian/Ubuntu or run it in a VM/host that allows apt.
- A Bluetooth adapter. Some Cubi models have none; a cheap USB BT 5.0 dongle works. Check with `bluetoothctl list`.

## Install
```
sudo ./setup.sh "Living Room"     # name is optional, default "Cubi Speaker"
```

## Use
Pair from your phone's Bluetooth settings and play music. Select the output device with `wpctl status` then `wpctl set-default <sink-id>`, or use `pavucontrol`.

## Notes
- Pairing is always open and auto-accepted (no PIN) so anyone in range can connect. To restrict, run `bluetoothctl discoverable off` after pairing your devices, and disable `bt-agent` (`sudo systemctl disable --now bt-agent`) — paired devices still reconnect.
- Troubleshooting: `systemctl status bluetooth bt-agent`, `rfkill list`, `journalctl -u bluetooth -f`.

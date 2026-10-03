#!/usr/bin/env bash
# Turns a Debian/Ubuntu box (e.g. MSI Cubi) into a Bluetooth audio receiver (A2DP sink).
# Usage: sudo ./setup.sh [device-name]
set -euo pipefail

NAME="${1:-Cubi Speaker}"
[ "$(id -u)" -eq 0 ] || { echo "Run with sudo: sudo $0" >&2; exit 1; }
USER_NAME="${SUDO_USER:-root}"
[ "$USER_NAME" != root ] || { echo "Run via sudo from a normal user account (audio runs in that user's session)." >&2; exit 1; }
USER_ID="$(id -u "$USER_NAME")"

echo "==> Installing packages"
apt-get update
apt-get install -y bluez bluez-tools rfkill pipewire pipewire-pulse wireplumber \
  libspa-0.2-bluetooth pulseaudio-utils

echo "==> Configuring BlueZ (name: $NAME)"
install -d /etc/bluetooth
if [ -f /etc/bluetooth/main.conf ] && [ ! -f /etc/bluetooth/main.conf.orig ]; then
  cp /etc/bluetooth/main.conf /etc/bluetooth/main.conf.orig
fi
cat > /etc/bluetooth/main.conf <<CONF
[General]
Name = $NAME
Class = 0x240414
DiscoverableTimeout = 0
PairableTimeout = 0
JustWorksRepairing = always
FastConnectable = true

[Policy]
AutoEnable = true
CONF

echo "==> Installing pairing agent + discoverable services"
cat > /etc/systemd/system/bt-agent.service <<UNIT
[Unit]
Description=Bluetooth auto-accept pairing agent
After=bluetooth.service
Requires=bluetooth.service

[Service]
ExecStartPre=/usr/sbin/rfkill unblock bluetooth
ExecStartPre=/usr/bin/bluetoothctl power on
ExecStartPre=/usr/bin/bluetoothctl pairable on
ExecStartPre=/usr/bin/bluetoothctl discoverable on
ExecStart=/usr/bin/bt-agent -c NoInputNoOutput
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

echo "==> Enabling services"
loginctl enable-linger "$USER_NAME"            # keep user audio session alive without login
systemctl enable --now bluetooth.service
systemctl daemon-reload
systemctl enable --now bt-agent.service
systemctl restart bluetooth.service
systemctl restart bt-agent.service
systemctl start "user@${USER_ID}.service"
sudo -u "$USER_NAME" XDG_RUNTIME_DIR="/run/user/$USER_ID" \
  systemctl --user enable --now pipewire pipewire-pulse wireplumber || true

cat <<DONE

Done. On your phone, pair with "$NAME" and play audio.
Pick the output: sudo -u $USER_NAME XDG_RUNTIME_DIR=/run/user/$USER_ID pactl list short sinks
Volume/output:   pavucontrol or wpctl status / wpctl set-default <id>
Pairing is open to anyone in range (no PIN). See README.md to lock it down.
DONE

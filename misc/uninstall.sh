#!/bin/bash
if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

systemctl disable piserver.service
systemctl disable webserver.service
systemctl stop piserver.service
systemctl stop webserver.service
rm /etc/systemd/system/piserver.service
rm /etc/systemd/system/webserver.service


echo "Uninstalled"
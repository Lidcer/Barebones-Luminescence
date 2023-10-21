#!/bin/bash
if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

systemctl disable webserver.service
systemctl stop webserver.service
rm /etc/systemd/system/webserver.service


echo "Uninstalled"
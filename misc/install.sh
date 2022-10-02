#!/bin/bash
if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

cp ./piserver.service /etc/systemd/system/piserver.service
cp ./webserver.service /etc/systemd/system/webserver.service

systemctl enable piserver.service
systemctl enable webserver.service
systemctl start piserver.service
systemctl start webserver.service

echo "Installation succeeded"
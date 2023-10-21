#!/bin/bash
if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

cp ./webserver.service /etc/systemd/system/webserver.service

systemctl enable webserver.service
systemctl start webserver.service

echo "Installation succeeded"
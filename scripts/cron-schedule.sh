#!/bin/sh
#
# run crontab -e
# and add 
# 00 3 * * * ~/vizon/scripts/cron-schedule.sh 

cd ~/vizon/
git pull
sudo npm update
./scripts/start.sh

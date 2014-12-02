sudo pkill node
sudo pkill nodemon
sudo nohup nodemon &
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 1415

#!/bin/bash
cd ~
wget https://repo.anaconda.com/archive/Anaconda3-2019.03-Linux-x86_64.sh
bash ./Anaconda2-2019.03-Linux-x86_64.sh
source ~/.bashrc

sudo apt-get install -y zookeeperd


wget http://ftp.fau.de/apache/kafka/2.2.0/kafka_2.12-2.2.0.tgz
cd ~
mkdir kafka
cd kafka
tar -xvzf kafka_2.12-2.2.0.tgz --strip 1

./bin/kafka-server-start.sh -daemon ./config/server.properties


# install elasticsearch
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/7.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-7.x.list


sudo apt-get update
sudo apt-get install apt-transport-https
sudo apt-get install elasticsearch

# start as daemon
sudo systemctl daemon-reload
sudo systemctl enable elasticsearch.service
sudo systemctl restart elasticsearch.service

# install node and npm
curl -sL https://deb.nodesource.com/setup_10.x | sudo bash
sudo apt update
sudo apt -y install nodejs

#!/bin/bash
cd ~
cd vim-platform
cd Backend
python setup.py install


cd ../Frontend
sudo npm cache clean --force
sudo npm install -g @angular/cli@1.7.3
sudo npm install --no-optional
sudo npm rebuild node-sass

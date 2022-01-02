# Vim Platform

This is a prototype implementation of a a platform that supports the [Virtual Mobility World (ViM) project](https://vim-project.org/)

## Getting Started

These instructions are for Linux-based operating system. If you are using a macOS, please refer to this [README](https://github.com/vim-tum/vim-platform/blob/master/macOS_README.md).

### Required Dependencies
- Python v3
- [Node.js v1.5/1.6](https://nodejs.org/en/download/)
- [npm](https://www.npmjs.com/get-npm)
- [ElasticSearch v6/7](https://www.elastic.co/products/elasticsearch)

### Installation instructions
* install git
```
sudo apt-get install git
```
* clone this repo
```
cd ~
git clone https://github.com/vim-tum/vim-platform.git
cd vim-platform
bash ./req_installer.sh
```
* setup flask, express, angular
```
bash ./setup_servers.sh
```
* Run python server
```
cd ~/vim-platform/Backend/
python server.py
```
In another terminal, navigate to tests/http-test-server and run `node app.js`. Make sure `localhost:3003` is not being used beforehand


* Run Angular server
```
cd ~/vim-platform/Frontend/
bash ./serve.sh
```

### [Instructions to use (legacy)](https://github.com/vim-tum/vim-platform/wiki/Usage-Instructions)


### _Contact_
[Nitinder Mohan](https://www.nitindermohan.com/) & [Ljubica Kärkkäinen](https://www.cm.in.tum.de/en/research-group/ljubicak/)

# Installation notes for macOS
If you are running macOS, the ```req_installer.sh``` and ```setup_server.sh``` will not install the dependency. Please follow this guide step by step and install all requirements for running **ViM platform**.

## Dependency requirements
For building ViM platform, your system **must** satisfy the following dependencies:
-   Python v3
-   [Node.js v1.5/1.6](https://nodejs.org/en/download/)
-   [npm](https://www.npmjs.com/get-npm)
-   [ElasticSearch v6/7](https://www.elastic.co/products/elasticsearch)
- [Apache Zookeeper](https://zookeeper.apache.org/)
- [Anaconda v2](https://www.anaconda.com/distribution/)
- [Java Development Kit](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
- [Apache Kafka]([https://kafka.apache.org/](https://kafka.apache.org/))
- [Angular](https://angular.io/)

To assist us with our installation, we will rely on ```Homebrew```. ```Homebrew``` is a package manager for Mac which will automatically handle majority of missing dependencies.

## Installation instructions

### Install ```Homebrew```
In your terminal, type the following command:
```
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

Do ```brew -v``` to check if Homebrew was installed correctly

### Install Python3
In your terminal, type:
```
brew install python
```
After installation, check your python version by ```python --version```

### Install Anaconda2

- Downlad the graphical installer for Mac from [https://www.anaconda.com/distribution/#macos](https://www.anaconda.com/distribution/#macos). 
- Pick the distribution corresponding to the Python version in your machine (preferably v2.7). 
- Follow simple instructions of the installer.

After installation, check your Anaconda version by ```conda --version```

### Install Zookeeper

- In your terminal, type:
```
brew install zookeeper
```
- Start the ```Zookeeper``` service by:
```
brew services start zookeeper
```

### Install Java Development Kit (JDK)

- Open a browser and navigate to the URL [http://www.oracle.com/technetwork/java/javase/downloads/index.html](http://www.oracle.com/technetwork/java/javase/downloads/index.html).
- Click on JDK, check “Accept License Agreement” and download .dmg file for installation on Mac.
- Run the disk image and proceed with the installation steps.

After installation, you can check your machine's java version by ```java -version```

### Apache Kafka

- Download the latest Apache Kafka from [https://kafka.apache.org/downloads](https://kafka.apache.org/downloads) under Binary downloads
- Extract the contents. Navigate to root of Apache Kafka folder and open a Terminal. **OR** Open a Terminal and navigate to the root directory of Apache Kafka.
- Start Kafka server
```
./bin/kafka-server-start.sh -daemon ./config/server.properties
```

### ElasticSearch

- In your terminal, type:
```
brew install elasticsearch
```

- Start ```elasticsearch``` as a daemon
```
brew services start elasticsearch
```

### Install Node and NPM

- Run the following command:
```
brew install node
```
After completion, you can check if the packages were installed correctly by running ```node -v``` and ```npm -v```

### Install Angular v1.7

- In your terminal, run:
```
sudo npm cache clean --force
sudo npm install -g @angular/cli@1.7.3
```
> It is possible that your build fails with EACCES permission error. This happens when you give root permission to NPM to install a package globally. In this case, you need to manually change NPM's default directory by following the instructions provided [here](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).
> After changing the directory, run the commands above to reinstall Angular.

## Building servers

### ViM Backend 
- In your root ```vim-platform``` directory, navigate to ```Backend``` folder by running ```cd Backend``` 
- Build the server setup by:
```
python setup.py install
```

### ViM Frontend 
> Instructions to be added soon
%this is a trial 

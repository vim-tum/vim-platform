'''
# Devs: Ali; Rakib;
'''

from setuptools import setup, find_packages

# Setup configuration for the tool
setup(
    name='OEDA-Backend',
    version='1.0',
    long_description="",
    packages=find_packages(),
    include_package_data=False,
    zip_safe=False,
    install_requires=[

        # Tempita is a small templating language for text substitution.
        'Tempita', # MIT license
        # coloring terminal text
        'colorama', # BSD license (BSD)
        
        # python server related
        'tornado', # Apache license
        'flask_restful', # BSD License (BSD)
        'flask_cors', # MIT License (MIT)
        'requests', # http integreation, Apache Software License (Apache 2.0)
        'pyjwt', # JSON Web Token implementation in Python, MIT License (MIT)
        'backports.ssl_match_hostname', # The ssl.match_hostname() function from Python 3.5, Python Software Foundation License

        # database
        'elasticsearch', # Apache Software License (Apache License, Version 2.0)


        'numpy>=1.14.2', # scientific computing, OSI Approved (BSD)
        'statsmodels', # statistics and statistical testing, BSD License (BSD License)
        'scikit-optimize>=0.5.2', # gauss optimizer, BSD
        'pandas', # Powerful data structures for data analysis, time series, and statistics, BSD
        'scipy', # Scientific Library for Python, BSD License (BSD)

        # Font
        'freetype-py', # bindings for the FreeType library, GNU General Public License (GPL)

        # visualization
        'pypng', # PNG image files to be read and written using pure Python, MIT License
        'matplotlib', # Python Software Foundation License (BSD)
        'seaborn', # statistical data visualization, BSD License (BSD (3-clause))
        
        # data streaming
        'kafka-python', # Pure Python client for Apache Kafka, Apache Software License (Apache License 2.0)
        'paho-mqtt', # MQTT version 3.1.1 client class, OSI Approved (Eclipse Public License v1.0 / Eclipse Distribution License v1.0)
    ]
)

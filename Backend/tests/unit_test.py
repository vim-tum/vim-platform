import unittest
import os
import requests
from oeda.databases import setup_experiment_database, db
from sumolib import checkBinary
from oeda.config.R_config import Config
from oeda.log import *
from oeda.rtxlib.dataproviders import createInstance
from oeda.utilities.TestUtility import parse_config, adjust_functions_and_weights, create_knobs, create_analysis


class UnitTest(unittest.TestCase):
    for_tests = True
    # docker without http authentication can be used
    # elasticsearch_ip = "192.168.99.100"
    elasticsearch_ip = None
    elasticsearch_port = None
    elasticsearch_index = None

    data_providers = None
    considered_data_types = None
    analysis = None

    def test_a_db_1(self):
        config = parse_config(["oeda", "databases"], "experiment_db_config")
        self.assertTrue(config)
        self.assertTrue(config["host"])
        self.assertTrue(config["port"])
        self.assertTrue(config["index"]["name"])
        UnitTest.elasticsearch_index = config["index"]["name"] + "_test"
        UnitTest.elasticsearch_ip = str(config["host"])
        UnitTest.elasticsearch_port = str(config["port"])
        setup_experiment_database("elasticsearch", UnitTest.elasticsearch_ip, UnitTest.elasticsearch_port, for_tests=UnitTest.for_tests)
        self.assertTrue(db())

    def test_a_db_2(self):
        health = db().es.cluster.health()
        # yellow means that the primary shard is allocated but replicas are not
        # and green means that all shards are allocated
        self.assertEqual('yellow', health["status"])

    # uses regular http GET request
    def test_a_db_3(self):
        res = requests.get("http://" + UnitTest.elasticsearch_ip + ":" + UnitTest.elasticsearch_port).json()
        self.assertTrue(res["cluster_name"])
        self.assertTrue(res["cluster_uuid"])

    def test_b_Rconnection(self):
        self.assertTrue(Config.plumber_host)
        self.assertTrue(Config.plumber_port)
        # res should be [u'Plumber API is running']
        res = requests.get("http://" + Config.plumber_host + ":" + str(Config.plumber_port)).json()
        info(res[0], Fore.CYAN)
        self.assertTrue(res[0])

    def test_c_sumo(self):
        try:
            var = os.environ.get("SUMO_HOME")
            self.assertTrue(var)
            sys.path.append(var)
            sumoGuiBinary = checkBinary('sumo-gui')
            self.assertTrue(sumoGuiBinary)
            sumoBinary = checkBinary('sumo')
            self.assertTrue(sumoBinary)
        except ImportError:
            sys.exit("please declare environment variable 'SUMO_HOME' as the root directory"
                     " of your sumo installation (it should contain folders 'bin', 'tools' and 'docs')")

    # as we're only using crowdnav_config for now,
    # make sure right values have been set in dataProviders.json file under oeda/crowdnav_config folder
    # also you need to add 127.0.0.1 kafka entry to /etc/hosts file because we're using kafka:9092 there
    # one important point: we need to set dp["instance"] to Null after assertion
    # because it will be created by oeda.rtxlib.dataproviders.init_data_providers method
    # if we don't do so, ES gives serialization error while saving
    def test_e_data_provider(self):
        data_providers = parse_config(["oeda", "config", "crowdnav_config"], "dataProviders")
        self.assertTrue(data_providers)
        for dp in data_providers:
            self.assertTrue(dp["type"])
            self.assertTrue(dp["serializer"])
            createInstance(wf=None, cp=dp)
            self.assertTrue(dp["instance"])
            dp["instance"] = None
        UnitTest.data_providers = data_providers

    def test_f_considered_data_types(self):
        data_providers = parse_config(["oeda", "config", "crowdnav_config"], "dataProviders")
        self.assertTrue(data_providers)
        # integrity check
        for dp in data_providers:
            self.assertTrue(dp["name"])
            self.assertTrue(dp["description"])
            self.assertTrue(dp["type"])
            self.assertTrue(dp["serializer"])
            self.assertTrue(dp["incomingDataTypes"])
            for dt in dp["incomingDataTypes"]:
                self.assertTrue(dt["name"])
                self.assertTrue(dt["description"])
                self.assertTrue(dt["scale"])
                self.assertTrue(dt["dataProviderName"])
                self.assertTrue(dt["criteria"])

            if dp["name"] == "Trips":
                considered_data_types = adjust_functions_and_weights(dp["incomingDataTypes"])
                self.assertTrue(considered_data_types)
                UnitTest.considered_data_types = considered_data_types

    def test_g_default_variables(self):
        default_variables = parse_config(["oeda", "config", "crowdnav_config"], "knobs")
        self.assertTrue(default_variables)
        # integrity check
        for var in default_variables:
            self.assertTrue(var["name"])
            self.assertTrue(var["description"])
            self.assertTrue(var["scale"])
            self.assertTrue(type(var["min"]) is float or type(var["min"]) is int)
            self.assertTrue(type(var["max"]) is float or type(var["min"]) is int)
            self.assertTrue(type(var["default"]) is float or type(var["min"]) is int)

    def test_h_create_knobs(self):
        knobs = create_knobs()
        self.assertTrue(knobs)
        UnitTest.knobs = knobs

    def test_i_create_analysis(self):
        analysis = create_analysis()
        self.assertTrue(analysis)
        UnitTest.analysis = analysis

if __name__ == '__main__':
    unittest.main()
    exit(1)
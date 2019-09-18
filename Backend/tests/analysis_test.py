from oeda.databases import setup_experiment_database, db
import unittest, random
from tests.unit_test import UnitTest
from tests.integration_test import IntegrationTest
from oeda.utilities.TestUtility import parse_config
from oeda.analysis.two_sample_tests import Ttest, TtestPower, TtestSampleSizeEstimation
from oeda.analysis.one_sample_tests import DAgostinoPearson, AndersonDarling, KolmogorovSmirnov, ShapiroWilk
from oeda.analysis.n_sample_tests import Bartlett, FlignerKilleen, KruskalWallis, Levene, OneWayAnova
from oeda.analysis.factorial_tests import FactorialAnova
from math import sqrt
import numpy as np

''' Simulation systems should be running in the background
    see https://stackoverflow.com/questions/5387299/python-unittest-testcase-execution-order/5387956#5387956 and
    https://docs.python.org/2/library/unittest.html#unittest.TestLoader.sortTestMethodsUsing
    also, self.assertTrue(param) function checks if bool(x) is True, we use it for assertIsNotNone() - which is available 
    in Python >=3.1 - 
    
    names of test cases are important because of the default ordering of the unittest framework
    so, tests are named according to this pattern: test_<order>_<name>. 
        
    random experiment id and 2 stage ids are sampled for different purposes 
    
    TODO: main method should contain a test suite that executes 1)unit tests 2)integration tests 3)analysis tests 

'''
class AnalysisTest(unittest.TestCase):

    data = None
    knobs = None # type: array[dict]
    experiment_id = None
    stage_id = None
    outer_key = "payload"
    key = "overhead"
    mean_diff = 0.1 # as in crowdnav-elastic-ttest-sample-size/definition.py
    # for n-sample tests,
    n = 2 # if n > 2, two-sample tests only use first two samples, and mostly FactorialAnova gives SingularMatrix error

    def test_a_db_1(self):
        config = parse_config(["oeda", "databases"], "experiment_db_config")
        self.assertTrue(config)
        self.assertTrue(config["host"])
        self.assertTrue(config["port"])
        self.assertTrue(config["index"]["name"])
        UnitTest.elasticsearch_index = config["index"]["name"] + "_test"
        UnitTest.elasticsearch_ip = str(config["host"])
        UnitTest.elasticsearch_port = str(config["port"])
        setup_experiment_database("elasticsearch", UnitTest.elasticsearch_ip, UnitTest.elasticsearch_port, for_tests=True)
        self.assertTrue(db())

    def test_b_experiment_ids(self):
        experiment_ids, source = db().get_experiments()
        self.assertTrue(experiment_ids)
        random_experiment_id = random.choice(experiment_ids)
        self.assertTrue(random_experiment_id)
        # tries to sample an experiment with number of stages >= n
        # TODO: update w.r.t new db mappings
        # while db().get_stages_count(experiment_id=random_experiment_id) < AnalysisTest.n:
        #     random_experiment_id = random.choice(experiment_ids)
        # self.assertTrue(random_experiment_id)
        AnalysisTest.experiment_id = random_experiment_id

    def test_c_data_points(self):
        data, knobs = db().get_data_for_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_no)
        self.assertTrue(data)
        self.assertTrue(knobs)
        AnalysisTest.data = data
        AnalysisTest.knobs = knobs

    def test_d_random_stage(self):
        stage_ids = AnalysisTest.data.keys()
        self.assertTrue(stage_ids)
        random_stage_ids = random.sample(stage_ids, AnalysisTest.n)
        self.assertTrue(random_stage_ids)
        AnalysisTest.stage_ids = random_stage_ids
        AnalysisTest.stage_id = AnalysisTest.stage_ids[0] # this can also be randomized

    def test_f_convert_outer_payload(self):
        if AnalysisTest.outer_key is not None:
            for stage_id in AnalysisTest.stage_ids:
                res = []
                # AnalysisTest.data is a dict of stage_ids and data_points
                for data_point in AnalysisTest.data[stage_id]:
                    # data might not always contain payload["overhead"]
                    outer_key = AnalysisTest.outer_key
                    inner_key = AnalysisTest.key
                    if outer_key in data_point:
                        if inner_key in data_point[outer_key]:
                            res.append(data_point[outer_key][inner_key])
                AnalysisTest.data[stage_id] = res

    ##########################
    ## One sample tests (Normality tests)
    ## only pass one stage_id to db().save_analysis() method
    ##########################
    def test_g_anderson(self):
        test = AndersonDarling(AnalysisTest.experiment_id, AnalysisTest.key, alpha=0.05)
        result = test.run(data=AnalysisTest.data[AnalysisTest.stage_id], knobs=AnalysisTest.knobs[AnalysisTest.stage_id])
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None) # we used this instead of assertTrue(test[k]) because value can be False
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_id, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_id, test.name)
        self.assertTrue(retrieved)

    def test_h_dagostino(self):
        test = DAgostinoPearson(AnalysisTest.experiment_id, AnalysisTest.key, alpha=0.05)
        result = test.run(data=AnalysisTest.data[AnalysisTest.stage_id], knobs=AnalysisTest.knobs[AnalysisTest.stage_id])
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_id, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_id, test.name)
        self.assertTrue(retrieved)

    def test_i_kolmogorov(self):
        test = KolmogorovSmirnov(AnalysisTest.experiment_id, AnalysisTest.key, alpha=0.05)
        result = test.run(data=AnalysisTest.data[AnalysisTest.stage_id], knobs=AnalysisTest.knobs[AnalysisTest.stage_id])
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_id, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_id, test.name)
        self.assertTrue(retrieved)

    def test_j_shapiro(self):
        test = ShapiroWilk(AnalysisTest.experiment_id, AnalysisTest.key, alpha=0.05)
        result = test.run(data=AnalysisTest.data[AnalysisTest.stage_id], knobs=AnalysisTest.knobs[AnalysisTest.stage_id])
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_id, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_id, test.name)
        self.assertTrue(retrieved)

    #########################
    # Two-sample tests
    # pass both stage_ids to db().save_analysis() method
    #########################
    def test_k_Ttest(self):
        stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
        test = Ttest(stage_ids=stage_ids, y_key=AnalysisTest.key)
        result = test.run(data=samples, knobs=knobs)
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name)
        self.assertTrue(retrieved)

    def test_l_TtestPower(self):
        stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
        x1 = samples[0]
        x2 = samples[1]
        pooled_std = sqrt((np.var(x1) + np.var(x2)) / 2)
        effect_size = AnalysisTest.mean_diff / pooled_std
        test = TtestPower(stage_ids=stage_ids, y_key=AnalysisTest.key, effect_size=effect_size)
        result = test.run(data=samples, knobs=knobs)
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name)
        self.assertTrue(retrieved)

    def test_m_TtestSampleSizeEstimation(self):
        stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
        test = TtestSampleSizeEstimation(stage_ids=stage_ids, y_key=AnalysisTest.key, effect_size=None, mean_diff=AnalysisTest.mean_diff)
        result = test.run(data=samples, knobs=knobs)
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name)
        self.assertTrue(retrieved)

    #########################
    # Different distributions tests
    # pass necessary stage_ids to db().save_analysis() method
    #########################
    def test_n_OneWayAnova(self):
        stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
        test = OneWayAnova(stage_ids=stage_ids, y_key=AnalysisTest.key)
        result = test.run(data=samples, knobs=knobs)
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name)
        self.assertTrue(retrieved)

    def test_o_KruskalWallis(self):
        stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
        test = KruskalWallis(stage_ids=stage_ids, y_key=AnalysisTest.key)
        result = test.run(data=samples, knobs=knobs)
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name)
        self.assertTrue(retrieved)

    ##########################
    ## Equal variance tests
    ##########################
    def test_p_Levene(self):
        stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
        test = Levene(stage_ids=stage_ids, y_key=AnalysisTest.key)
        result = test.run(data=samples, knobs=knobs)
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name)
        self.assertTrue(retrieved)

    def test_q_Bartlett(self):
        stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
        test = Bartlett(stage_ids=stage_ids, y_key=AnalysisTest.key)
        result = test.run(data=samples, knobs=knobs)
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name)
        self.assertTrue(retrieved)

    def test_r_FlignerKilleen(self):
        stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
        test = FlignerKilleen(stage_ids=stage_ids, y_key=AnalysisTest.key)
        result = test.run(data=samples, knobs=knobs)
        self.assertTrue(result)
        for key in result:
            self.assertTrue(result[key] is not None)
        db().save_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name, result)
        retrieved = db().get_analysis(AnalysisTest.experiment_id, AnalysisTest.stage_ids, test.name)
        self.assertTrue(retrieved)


    ##########################
    ## Two-way anova
    ##########################
    def test_s_FactorialAnova(self):
        try:
            stage_ids, samples, knobs = AnalysisTest.get_data_for_tests()
            test = FactorialAnova(stage_ids=stage_ids, y_key=AnalysisTest.key, knob_keys=None, stages_count=len(stage_ids))
            result = test.run(data=samples, knobs=knobs)
            self.assertTrue(result is not None)
        except Exception as e:
            error_name = type(e).__name__
            self.assertTrue(error_name == "LinAlgError" or error_name == "ValueError")

    """ helper fcn for two and n-sample tests """
    @staticmethod
    def get_data_for_tests():
        stage_ids = AnalysisTest.stage_ids
        # uses stage_ids that have been randomized before to get samples and respective knobs
        samples = [AnalysisTest.data[stage_id] for stage_id in stage_ids]
        knobs = [AnalysisTest.knobs[stage_id] for stage_id in stage_ids]
        return stage_ids, samples, knobs

def suite():
    """
        Gather all the tests from this module in a test suite.
        set analysis_tests_included to True o/w data will be deleted before these tests
    """
    test_suite = unittest.TestSuite()
    test_suite.addTest(unittest.makeSuite(UnitTest))
    IntegrationTest.analysis_tests_included = True
    test_suite.addTest(unittest.makeSuite(IntegrationTest))
    test_suite.addTest(unittest.makeSuite(AnalysisTest))
    return test_suite

if __name__ == '__main__':
    mySuit = suite()
    runner = unittest.TextTestRunner()
    runner.run(mySuit)
    exit(1)
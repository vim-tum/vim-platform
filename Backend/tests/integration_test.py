from oeda.databases import setup_experiment_database, db
from oeda.log import *
from oeda.utilities.TestUtility import create_experiment_with_mlr_mbo, create_target_system, rtx_execution
from tests.unit_test import UnitTest
import unittest


''' Simulation systems should be running in the background
    see https://stackoverflow.com/questions/5387299/python-unittest-testcase-execution-order/5387956#5387956 and
    https://docs.python.org/2/library/unittest.html#unittest.TestLoader.sortTestMethodsUsing
    also, self.assertTrue(param) function checks if bool(x) is True, we use it for assertIsNotNone() - which is available 
    in Python >=3.1 - 
    
    names of test cases are important because of the default ordering of the unittest framework
    so, tests are named according to this pattern: test_<order>_<name>. 
    
    main method contains a test suite that first executes unit tests and then executes test cases of this class 
    
    analysis_tests_included is initially set to False to make this test self-executable
    we set it to True when we run analysis tests
'''
class IntegrationTest(unittest.TestCase):
    for_tests = True
    knobs = None
    considered_data_types = None # these are subset of all data types, but they account for the weight in overall result
    data_providers = None
    target_system = None
    experiment = None
    stage_ids = None
    analysis_tests_included = False
    analysis = None

    def test_e_data_provider(self):
        self.assertTrue(UnitTest.data_providers)
        IntegrationTest.data_providers = UnitTest.data_providers

    def test_f_considered_data_types(self):
        self.assertTrue(UnitTest.considered_data_types)
        IntegrationTest.considered_data_types = UnitTest.considered_data_types

    def test_g_analysis(self):
        self.assertTrue(UnitTest.analysis)
        IntegrationTest.analysis = UnitTest.analysis

    def test_h_create_knobs(self):
        self.assertTrue(UnitTest.knobs)
        IntegrationTest.knobs = UnitTest.knobs

    # this case must be executed before the rest below
    def test_i_create_target_system(self):
        target_system = create_target_system(data_providers=IntegrationTest.data_providers,
                                             default_variables=IntegrationTest.knobs,
                                             ignore_first_n_samples=30)
        self.assertTrue(target_system)
        db().save_target(target_system)
        IntegrationTest.target_system = target_system

    def test_j_create_experiment(self):
        experiment = create_experiment_with_mlr_mbo("mlr_mbo",
                                                    sample_size=20,
                                                    knobs=IntegrationTest.knobs,
                                                    considered_data_types=IntegrationTest.considered_data_types,
                                                    analysis=IntegrationTest.analysis,
                                                    optimizer_iterations_in_design=len(IntegrationTest.knobs)*4,
                                                    acquisition_method="ei",
                                                    optimizer_iterations=5)
        self.assertTrue(experiment)
        self.assertTrue(experiment["id"])
        experiment["targetSystemId"] = IntegrationTest.target_system["id"]
        db().save_experiment(experiment)
        saved_experiment = db().get_experiment(experiment["id"])
        self.assertTrue(saved_experiment)
        IntegrationTest.experiment = experiment

    def test_k_execution(self):
        executed_workflow = rtx_execution(experiment=IntegrationTest.experiment, target=IntegrationTest.target_system)
        self.assertTrue(executed_workflow)
        target_status = db().get_target(IntegrationTest.target_system["id"])["status"]
        self.assertEqual(target_status, "READY")
        experiment_status = db().get_experiment(IntegrationTest.experiment["id"])["status"]
        self.assertEqual(experiment_status, "SUCCESS")
        self.stage_test()
        self.data_point_test()
        self.analysis_test()
        if IntegrationTest.analysis_tests_included is False:
            self.delete_index_test()

    # following three should not start with test_ because they need to wait for test_k_execution method to end
    def stage_test(self):
        experiment_id = IntegrationTest.experiment["id"]
        self.assertTrue(experiment_id)
        stage_ids = db().get_stages(experiment_id)[0] # 0 = _id, 1 = _source
        self.assertTrue(stage_ids)
        IntegrationTest.stage_ids = stage_ids

    def data_point_test(self):
        for stage_id in IntegrationTest.stage_ids:
            self.assertTrue(stage_id)
            data_points = db().get_data_points(IntegrationTest.experiment["id"], stage_id)
            for point in data_points:
                self.assertTrue(point["payload"])
                self.assertTrue(point["createdDate"])

    def delete_index_test(self):
        db().indices_client.delete(index=UnitTest.elasticsearch_index, ignore=[400, 404]) # remove all records
        available_indices = db().indices_client.get('*')  # uses wild-card
        self.assertTrue(UnitTest.elasticsearch_index not in available_indices)
        info("Data points were valid, deleting index.", Fore.CYAN)

def suite():
    """
        Gather all the tests from this module in a test suite.
    """
    test_suite = unittest.TestSuite()
    test_suite.addTest(unittest.makeSuite(UnitTest))
    test_suite.addTest(unittest.makeSuite(IntegrationTest))
    return test_suite

if __name__ == '__main__':
    # ref https://stackoverflow.com/questions/12011091/trying-to-implement-python-testsuite
    mySuit = suite()
    runner = unittest.TextTestRunner()
    runner.run(mySuit)
    exit(1)
from colorama import Fore

from oeda.log import *
from oeda.rtxlib.changeproviders import init_change_provider
from oeda.rtxlib.dataproviders import init_data_providers
from oeda.rtxlib.simulationchannels import init_channels
from oeda.rtxlib.preprocessors import init_pre_processors, kill_pre_processors
from oeda.rtxlib.executionstrategy.FactorialExperimentStrategy import start_factorial_experiment
from oeda.rtxlib.executionstrategy.TtestStrategy import start_ttest_analysis
from oeda.rtxlib.executionstrategy.SingleExperimentStrategy import start_single_experiment


def execute_analysis(wf):
    # start the right execution strategy
    if wf.analysis["type"] == "factorial_experiment":
        start_factorial_experiment(wf)
    if wf.analysis["type"] == "t_test":
        start_ttest_analysis(wf)
    if wf.analysis["type"] == "one_sample_tests":
        start_single_experiment(wf)

def execute_workflow(wf):
    """ this is the main workflow for executing a given workflow """
    try:
        info("######################################", Fore.CYAN)
        info("> Workflow       | " + str(wf.name), Fore.CYAN)
        debug("execution_strategy:" + str(wf.execution_strategy))

    except KeyError as e:
        error("workflow is missing a value " + str(e))
        exit(1)

    # initialize the test environment
    init_pre_processors(wf)
    init_change_provider(wf)
    init_data_providers(wf)

    # initialize orchestration channel
    if wf.analysis["type"] == "one_sample_tests":
        init_channels(wf)

    # execute analysis
    execute_analysis(wf)

    # we are done, now we clean up
    kill_pre_processors(wf)
    info("> Finished workflow")

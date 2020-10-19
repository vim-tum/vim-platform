from colorama import Fore

from oeda.log import *
from oeda.rtxlib.changeproviders import init_change_provider
from oeda.rtxlib.dataproviders import init_data_providers
from oeda.rtxlib.preprocessors import init_pre_processors, kill_pre_processors
from oeda.rtxlib.executionstrategy.FactorialExperimentStrategy import start_factorial_experiment
from oeda.rtxlib.executionstrategy.TtestStrategy import start_ttest_analysis
from oeda.analysis.analysis_execution import start_one_sample_tests
from oeda.rtxlib.executionstrategy import run_execution_strategy
from oeda.rtxlib.simulationchannels import init_channels, create_scenario_file, init_simulation, experimentAck


def execute_analysis(wf):
    # start the right execution strategy
    if wf.analysis["type"] == "factorial_experiment":
        start_factorial_experiment(wf)
    if wf.analysis["type"] == "t_test":
        start_ttest_analysis(wf)
    if wf.analysis["type"] == "one_sample_tests":
        start_one_sample_tests(wf)

def execute_workflow(wf):
    """ this is the main workflow for executing a given workflow """
    try:
        info("######################################", Fore.CYAN)
        info("> Workflow       | " + str(wf.name), Fore.CYAN)
        debug("execution_strategy:" + str(wf.execution_strategy))

    except KeyError as e:
        error("workflow is missing a value " + str(e))
        exit(1)

    # initialize channels for simulation
    if (wf._oeda_target["type"] == 'simulation'):
        init_channels(wf)

    # initialize the experiment environment
    init_pre_processors(wf)
    init_change_provider(wf)
    init_data_providers(wf)

    # generate sce-file
    sc = create_scenario_file(wf)

    # initiate send it on orchestration
    init_simulation(wf, sc)

    ack = experimentAck(wf)
    if (len(ack) == 0):
        debug("No acknowledgement received from simulator. Please check if it is running.", Fore.RED)
        exit(1)

    # execute chosen strategy and run analysis
    run_execution_strategy(wf)

    # execute_analysis(wf)

    # we are done, now we clean up
    kill_pre_processors(wf)
    info("> Finished workflow")

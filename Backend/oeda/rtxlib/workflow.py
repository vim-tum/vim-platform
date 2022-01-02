from time import sleep

from colorama import Fore

from oeda.databases import db
from oeda.log import *
from oeda.rtxlib.changeproviders import init_change_provider
from oeda.rtxlib.dataproviders import init_data_providers
from oeda.rtxlib.preprocessors import init_pre_processors, kill_pre_processors
from oeda.rtxlib.executionstrategy.FactorialExperimentStrategy import start_factorial_experiment
from oeda.rtxlib.executionstrategy.TtestStrategy import start_ttest_analysis
from oeda.analysis.analysis_execution import start_one_sample_tests
from oeda.rtxlib.executionstrategy import run_execution_strategy
from oeda.rtxlib.simulationchannels import init_channels, create_scenario_file, init_simulation, experiment_ACK, fetch_results, fetch_status
from oeda.rtxlib.analysischannels import create_start_command, send_command_analysis, fetch_analysis_response, validate_ack_analysis, wait_ack_analysis


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
    init_channels(wf)
    # for simulation - wf.secondary_data_providers.extend(orchestration_data_providers)
    # for analysis - wf.secondary_data_providers.extend(orchestration_data_providers_analysis)

    # initialize the experiment environment
    init_pre_processors(wf)
    # wf type independent - for each preprocessor - p["instance"] = SparkPreProcessor(wf, p)

    init_change_provider(wf)
    # wf type independent - loads the specified change provider into the workflow

    init_data_providers(wf)
    # wf type independent - creates the required data providers

    if wf.is_type('simulation'):
        # generate sce-file
        sc, resources = create_scenario_file(wf, wf._oeda_target["simulationType"])

        # initiate send it on orchestration
        init_simulation(wf, sc, resources)

        ack = experiment_ACK(wf, "Scenario")
        if (len(ack) == 0):
            debug("No acknowledgement received from simulator. Please check if it is running.", Fore.RED)
            exit(1)

    if wf.is_type('analysis'):
        # initialize analysis channels
        # received an ack for the initialized simulation experiment from the simulation service
        # if combined simulation & analysis create the analysis experiment and channels
        print("Simulation && Analysis")
        command = create_start_command(wf)
        send_command_analysis(wf, command)

    if wf.is_type('simulation'):
        # read out result channel, when generated and save it into db
        if wf._oeda_experiment["results_downloadable"]:
            result_url = fetch_results(wf)
            wf.save_experiment_result_url(result_url)

        # execute chosen strategy and run analysis
        run_execution_strategy(wf)

    if wf.is_type('analysis'):
        # wait for response
        waiting = True
        wait_ack_analysis(wf)

        # fetch analysis result from output channel
        fetch_analysis_response(wf)

    wf.run_oeda_callback({"status": "EXPERIMENT_DONE"})

    # we are done, now we clean up
    kill_pre_processors(wf)
    info("> Finished workflow")

import os
import uuid

from colorama import Fore
from typing import Dict

from oeda.databases import db
from oeda.log import debug, info
from oeda.rtxlib.analysischannels.AnalyisStrategySnapshot import AnalysisStrategySnapshot
from oeda.rtxlib.analysischannels.AnalysisStrategy import AnalysisStrategy
from oeda.rtxlib.analysischannels.AnalysisStrategyGroup import AnalysisStrategyGroup
from oeda.rtxlib.dataproviders import KafkaConsumerDataProvider

from oeda.rtxlib.resourcefiles import create_resource_file_references


# send command to analysis module via OrchestrationCommand channel
from oeda.rtxlib.simulationchannels import experiment_ACK






def send_command_analysis(wf, command):
    command_channel = wf.get_channel("OrchestrationCommand")
    command_channel.sendData(command)

# creates a stop command to stop the analysis on the analysis module
def create_stop_command(wf):
    return {'command_type': 'stop',
            'msg_id': str(uuid.uuid1()),
            'job_id': str(wf.id),
            'parameters': {},
            'algorithms': []}

# creates a start command to stop the analysis on the analysis module
def create_start_command(wf):
    # Retrieve parent simulation data for analysis
    simulation_experiment_id = wf.analysis["parent_experiment"]
    simulation_experiment = db().get_experiment(simulation_experiment_id)
    simulation_target = db().get_target(simulation_experiment["targetSystemId"])
    algorithms = wf.analysis['algorithms']

    # channels to analyze from analysis module
    input_topics = []

    # recreate all topic names by topic name convention

    for topic in wf.analysis["input_topics"]:  # create all selected aggregate topics
        for data_provider in simulation_target["dataProviders"]:
            if topic["name"] == data_provider["name"]:
                channel_name = KafkaConsumerDataProvider.create_topic_name(id=simulation_experiment_id,
                                                                           cp=data_provider,
                                                                           simulation_type=
                                                                           simulation_target["simulationType"],
                                                                           target_type='simulation')
                input_topics.append(channel_name)
                break
    info("> Input channel " + str(input_topics), Fore.CYAN)

    # only selected algorithms apply
    algorithms = list(filter(lambda alg: alg['selected'], algorithms))
    # remove data required for Frontend
    for algorithm in algorithms:
        del algorithm['selected']
        del algorithm['alias']
        algorithm['result_output'] = 1 if algorithm['result_output'] else 0

    # prepare arrays to space seperated lists
    for algorithm in algorithms:
            for parameter, values in algorithm['parameters'].items():
                if isinstance(values, list):
                    values = list(map(lambda value: str(value), values))
                    algorithm['parameters'][parameter] = " ".join(values)


    # append resource references to algorithms
    resources = create_analysis_file_reference(simulation_target["simulationType"],
                                               simulation_experiment["simulation"]["resources"])

    for resource_type, resources_file_references in resources.items():
        for algorithm in algorithms:
            algorithm['parameters'][resource_type] = ",".join(resources_file_references)

    # Setup command
    return {
        'command_type': 'start',
        'msg_id': str(uuid.uuid1()),
        'job_id': str(wf.id),
        'parameters': {
            'kafka_input_topics': ",".join(input_topics),
            'kafka_output_topic': wf.get_channel("Output").topic,
            'stop_time': simulation_experiment['simulation']['endTime'] * 1000
        },
        'algorithms': algorithms
    }

def create_analysis_file_reference(simulation_type, resources):
    resources_analysis = {}
    resources_simulation = create_resource_file_references(simulation_type, resources)
    for resource in resources_simulation:
        resource_type = resource["Type"]
        resource_ref = resource["FileReference"]
        if resource_type in resources_analysis:
            resources_analysis[resource_type].append(resource_ref)
        else:
            resources_analysis[resource_type] = [resource_ref]
    return resources_analysis


def wait_ack_analysis(wf):
    waiting = True
    while waiting:
        ack = experiment_ACK(wf, "OrchestrationResponse")
        waiting = validate_ack_analysis(wf, ack)



# get analysis result from analysis topic
def fetch_analysis_response(wf):
    output_channel = wf.get_channel("Output")

    algorithms = wf.analysis['algorithms']

    strategies = create_analysis_strategies(algorithms)
    AnalysisStrategy.create_analysis_directory(wf.id)

    # Listen on output channel until final message
    run = True
    while run:
        # experiment stopped by user => request stop to analysis module
        if wf._oeda_stop_request.isSet():
            raise RuntimeError("Experiment interrupted from OEDA while reading analysis data.")
        # read data until the final result message
        msgs = output_channel.returnDataListNonBlocking()
        if len(msgs) > 0:
            msg = msgs[0]
            algorithm_callback = []
            for algorithm in msg['algorithms']:
                algorithm_name = algorithm['name']
                strategy = strategies[algorithm_name]
                if msg["final"]:
                    strategy.parse_final_result(wf, algorithm)
                else:
                    callback = strategy.parse_intermediate_result(wf, algorithm)
                    algorithm_callback.append({'name': algorithm_name, 'results': callback})

            if msg["final"]:
                run = False
            else:
                oeda_callback_analysis(wf, algorithm_callback)



# update callback with intermediate data from analysis
def oeda_callback_analysis(wf, algorithms):
        wf.run_oeda_callback({"experiment": wf.id,
                              "status": "COLLECTING_ANALYSIS_DATA",
                              "algorithms": algorithms
                              })

def validate_ack_analysis(wf, acks):
    if (len(acks) == 0):
        debug("No acknowledgement received from analysis. Please check if it is running.", Fore.RED)
        exit(1)
    else:
        for ack in acks:
            if wf.id == ack["job_id"]:
                if ack["sub_type"] == "error":
                    debug("Something went in the analysis wrong. Please check input.", Fore.RED)
                    exit(1)
                elif ack["sub_type"] == "ok":
                    debug("Received ack from analysis with id " + str(ack["job_id"]), Fore.CYAN)
                    return False
                else:
                    debug("Received status from analysis with id" + str(ack["job_id"]) + " => " + str(ack["payload"]),
                          Fore.CYAN)
        return True


def create_analysis_strategies(algorithms) -> Dict[str, AnalysisStrategy]:
    strategies = dict()
    for algorithm in algorithms:
            strategy = create_analysis_strategy(algorithm)
            strategies[algorithm['name']] = strategy
    return strategies

def create_analysis_strategy(algorithm) -> AnalysisStrategy:
    if algorithm['name'] == 'ContourPlot':
        return AnalysisStrategySnapshot()
    if algorithm['name'] == 'AnomalyTS' or algorithm['name'] == 'TrafficFlowPrediction':
        return  AnalysisStrategyGroup()
    raise RuntimeError("Algorithm not supported")


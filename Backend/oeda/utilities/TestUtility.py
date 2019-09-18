import os.path
import json
import io
import copy
from random import randint
from uuid import uuid4
from oeda.controller.callback import set_dict as set_dict
from oeda.service.rtx_definition import RTXDefinition
from threading import Event
from oeda.service.execution_scheduler import set_experiment_status
from oeda.service.execution_scheduler import set_target_system_status
from oeda.rtxlib.workflow import execute_workflow

# reads json file located in provided folders
# folder_names should be an array and should start with "oeda"
# e.g. ["oeda", "crowdnav_config"] and config_file_name = "dataProviders"
def parse_config(folder_names, config_file_name):
    goal_dir = os.path.join(os.getcwd(), "..", *folder_names)
    real_dir = os.path.realpath(goal_dir)
    json_object = {}
    for root, dirs, files in os.walk(real_dir):
        for file_name in files:
            if file_name.endswith('.json') and config_file_name in file_name:
                json_file_path = os.path.join(real_dir, file_name)
                with io.open(json_file_path, 'r', encoding='utf8') as json_data:
                    d = json.load(json_data)
                    json_object = d
    return json_object


# usable strategy_names are sequential, self_optimizer, uncorrelated_self_optimizer, step_explorer, forever, random, mlr_mbo
def create_experiment_with_mlr_mbo(strategy_name, sample_size, knobs, considered_data_types, analysis, optimizer_iterations_in_design, acquisition_method="ei", optimizer_iterations=5):
    num = randint(0, 100)
    id = str(uuid4())
    experiment = dict(
        id=id,
        name="test_experiment_" + str(num),
        description="test_experiment_" + str(num),
        considered_data_types=considered_data_types,
        changeableVariables=[],
        executionStrategy=dict(
            type=strategy_name,
            sample_size=sample_size,
            knobs=knobs,
            stages_count=optimizer_iterations + optimizer_iterations_in_design
        ),
        analysis=analysis
    )
    if strategy_name in ["self_optimizer", "uncorrelated_self_optimizer", "mlr_mbo"]:
        experiment["executionStrategy"]["optimizer_iterations"] = optimizer_iterations
        experiment["executionStrategy"]["optimizer_iterations_in_design"] = optimizer_iterations_in_design
    if strategy_name == "mlr_mbo":
        experiment["executionStrategy"]["acquisition_method"] = acquisition_method
    return experiment


def create_target_system(data_providers, default_variables, ignore_first_n_samples):
    num = randint(0, 100)
    id = str(uuid4())
    target = dict(
        id=id,
        name="test_target_" + str(num),
        description="test_target_" + str(num),
        status="READY",
        dataProviders=data_providers,
        primaryDataProvider=dict(),
        secondaryDataProviders=[],
        changeProvider=dict(
            kafka_uri="kafka:9092",
            topic="crowd-nav-commands",
            serializer="JSON",
            type="kafka_producer"
        ),
        incomingDataTypes=[],
        defaultVariables=default_variables,
        changeableVariables=default_variables
    )
    # prepare data providers for target system
    for dp in data_providers:
        if dp["name"] == "Trips":
            dp["is_primary"] = True
            target["primaryDataProvider"] = dp
            target["primaryDataProvider"]["ignore_first_n_samples"] = ignore_first_n_samples
        else:
            target["secondaryDataProviders"].append(dp)

        for data_type in dp["incomingDataTypes"]:
            target["incomingDataTypes"].append(data_type)

    return target

# this function can be adjusted to select different data providers in the future
# deep copy is needed because otherwise incoming_data_types is modified (which is not the desired behavior)
def adjust_functions_and_weights(incoming_data_types):
    dict2 = copy.deepcopy(incoming_data_types)
    considered_data_types = []
    for data_type in dict2:
        if data_type["name"] == "overhead":
            data_type["is_considered"] = True
            data_type["weight"] = 99
            data_type["aggregateFunction"] = "avg"
            considered_data_types.append(data_type)
        elif data_type["name"] == "complaint":
            data_type["is_considered"] = True
            data_type["weight"] = 1
            data_type["aggregateFunction"] = "ratio-True"
            considered_data_types.append(data_type)
        # elif data_type["name"] == "minimalCosts":
        #     data_type["is_considered"] = True
        #     data_type["weight"] = 5
        #     data_type["aggregateFunction"] = "max"
        #     considered_data_types.append(data_type)
    return considered_data_types

# at least 2 factors should present if we want to use two-way-anova
def create_knobs():
    return dict(
        route_random_sigma=(0, 0.2),
        exploration_percentage=(2, 2.7)
    )

def create_analysis():
    return dict(
        alpha=0.05,
        type='t_test',
        outer_key='payload',
        data_type='overhead'
    )

def rtx_execution(experiment, target):
    set_experiment_status(experiment["id"], "RUNNING")
    set_target_system_status(experiment["targetSystemId"], "WORKING")
    # set_dict(experiment["id"], None)
    wf = RTXDefinition(oeda_experiment=experiment, oeda_target=target, oeda_callback=set_dict, oeda_stop_request=Event())
    execute_workflow(wf)
    set_experiment_status(experiment["id"], "SUCCESS")
    set_target_system_status(experiment["targetSystemId"], "READY")
    return wf

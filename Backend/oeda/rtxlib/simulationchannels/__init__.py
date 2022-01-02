from oeda.log import *
from oeda.databases import db
import json
import time
import os
from avro import schema, datafile, io
from oeda.controller.s3_client import S3ClientController
from oeda.rtxlib.resourcefiles import create_kafka_msg, create_resource_file_references


def init_channels(wf):
    debug("Initializing channels > ", Fore.GREEN)

    if wf.is_type('simulation'):
        orchestration_data_providers = json.loads(
            open('oeda/config/simulation_config/orchestrationChannel.json').read())
        wf.secondary_data_providers.extend(orchestration_data_providers)
    if wf.is_type('analysis'):
        orchestration_data_providers_analysis = json.loads(
            open('oeda/config/analysis_config/orchestrationChannel.json').read())
        #provision_data_providers_analysis = json.loads(open('oeda/config/analysis_config/provisionChannel.json').read())
        wf.secondary_data_providers.extend(orchestration_data_providers_analysis)
        #wf.secondary_data_providers.extend(provision_data_providers_analysis)

def create_scenario_file(wf, simulation_type):
    # TODO: break into two methods?

    debug("Updating scenario file > ", Fore.GREEN)

    path_to_scenarios = "oeda/config/simulation_config/scenario_files/"
    # scenario = json.loads(open(path_to_scenarios + "RingRoad_Sumo_With_SpeedObserver.sce").read())
    scenario = {}
    if simulation_type == "sumo": 
        scenario = json.loads(open(path_to_scenarios + "DetectorObserver.sce").read())
    elif simulation_type == "matsim": 
        scenario = json.loads(open(path_to_scenarios + "matsim.sce").read())

    # update scenario properties in the template with the workflow values
    scenario["ID"] = wf.id
    scenario["SimulationStart"] = wf._oeda_experiment["simulation"]["startTime"]
    scenario["SimulationEnd"] = wf._oeda_experiment["simulation"]["endTime"]

    resources = wf._oeda_experiment["simulation"]["resources"]

    # this should correspond to traffic.xml or plans.xml
    input_path = next((item for item in resources if item["type"] == "Input"), None)["name"]
    # this should correspond to network.sumo.xml or network.matsim.xml
    input_roadmap = next((item for item in resources if item["type"] == "RoadMap"), None)["name"]

    scenario["Inputs"] = [{
        "Processing" : "native", 
        "Layer" : "micro", 
        "Path" : input_path
    }]


    # if simulation_type == "sumo": 
    simulators = scenario["TrafficSimulators"]

    # get simulation properties and update those for all simulation types
    for sim in simulators:
        new_sim = sim
        # update resources with the custom resources requested by the user 
        new_resources = {}
        for r in resources:
            if r['type'] == "Input":
                new_resources[str(r['name'])] = "Traffic"
            elif r['type'] == "Other":
                new_resources[str(r['name'])] = "Additional"
            else:
                new_resources[str(r['name'])] = r['type']
        
        new_sim["Resources"] = new_resources

        # if the user does not want to download the result, the simulation service should not upload it to the external data storage
        if not wf._oeda_experiment["results_downloadable"]:
            sim["Results"] = {}

        # sumo simulation type
        if sim["ID"].startswith('sumo'):
            # update Observers, overwrite previous
            # Observer attributes are incoming data types
            # Observer period equals simulation updateInterval (assume it's equal for all observers)
            observers = []

            # per default we create observers for the macro and micro topics for each selected data provider in the target system
            for idt in wf.incoming_data_types:
                # create observers for each of the micro topics, e.g. vehicle.speed or detector.timeSinceDetection
                observer_type = 'avro'
                
                if wf.primary_data_provider["name"] == idt["dataProviderName"]:
                    observer_type = wf.primary_data_provider["serializer"].lower()

                observer = {'Task': 'publish',
                            'Attribute': idt["name"],
                            'Subject': idt["dataProviderName"].lower(),
                            'Filter': 'all',
                            'Period': wf._oeda_experiment["simulation"]["updateInterval"] * 1000,
                            'Trigger': '',
                            'Type': ''}
                observer['Type'] = observer_type

                observers.append(observer)
                # print(type(observer_type))
            
            for data_provider in wf._oeda_target["dataProviders"]:
                # create an observer for each macro topic, e.g. vehicle or detector, of the dp from experiment type simulation
                if data_provider["experiment_type"] == "simulation":
                    observer = {'Task': 'publish',
                                'Attribute': '',
                                'Subject': data_provider["topic"],
                                'Filter': 'all',
                                'Period': wf._oeda_experiment["simulation"]["updateInterval"] * 1000,
                                'Trigger': '',
                                'Type': ''}
                    observer['Type'] = data_provider["serializer"].lower()

                    observers.append(observer)

            new_sim["Observers"] = observers
            new_sim["CustomParams"] = {}
        
        simulators.remove(sim)
        simulators.append(new_sim)
        break

    scenario["TrafficSimulators"] = simulators

    if simulation_type == "sumo":
        # keep record of the scenario file for this simulation
        scenario_filename = path_to_scenarios + "SumoScenario_simID_" + wf.id + ".sce"
    elif simulation_type == "matsim":
        scenario_filename = path_to_scenarios + "MatsimScenario_simID_" + wf.id + ".sce"
    else:
        debug("Invalid simulation type of target. Please check simulation type chosen.", Fore.RED)
        exit(1)

    with open(scenario_filename, 'w') as h:
        json.dump(scenario, h,  indent=4)

    # resources as byte stream to be sent to the kafka broker for further transfer to the simulation service
    resource_msg = create_resource_file_references(simulation_type, resources)

    return scenario, resource_msg


def init_simulation(wf, sc, resources):
    debug("Initializing simulation > ", Fore.GREEN)
    debug("Publishing scenario file on the orchestration channel > ", Fore.GREEN)

    orchestrator = {}
    resource_topic = {}

    for secondary_data_provider in wf.secondary_data_providers:
        if secondary_data_provider["name"] == "OrchestrationBootstrap":
            orchestrator = secondary_data_provider["instance"]
        elif secondary_data_provider["name"] == "Resource":
            resource_topic = secondary_data_provider["instance"]
        if bool(orchestrator) and bool(resource_topic):
            break

    info("Orchestrator channel >>     " + str(orchestrator.topic), Fore.LIGHTYELLOW_EX)

    # publish jsonified scenario file
    orchestrator.sendData(sc)

    # publish resource records
    for res in resources:
        # check if resource_topic is not an empty dict object
        if resource_topic:
            resource_topic.sendData(res)

def experiment_ACK(wf, ack_channel_name):
    
    ack_channel = {}
    print(ack_channel_name)
    print(wf.primary_data_provider["name"])
    for secondary_data_provider in wf.secondary_data_providers:
        print(secondary_data_provider["name"])

    if wf.primary_data_provider["name"] == ack_channel_name:
        ack_channel = wf.primary_data_provider["instance"]
    else:
        for secondary_data_provider in wf.secondary_data_providers:
            if secondary_data_provider["name"] == ack_channel_name:
                ack_channel = secondary_data_provider["instance"]
                break

    print("logging the ack_channel")
    print(ack_channel)
    print(str(ack_channel))
    info("ACK channel >>     " + str(ack_channel.topic), Fore.LIGHTYELLOW_EX)

    # taking a 5 minute timeout for ACK waiting. Can be lower or removed completely
    timeOut = time.time() + 60 * 5 
    ack = []
    
    while ((time.time() < timeOut)):
        ack = ack_channel.returnDataListNonBlocking()
        if len(ack) == 0:
            time.sleep(10) #wait for 10sec for new message
            debug("Waiting for ACK from simulator > ", Fore.GREEN)
        else:
            break
    
    debug("Ack received > " + str(ack))
    
    return ack

def fetch_results(wf):
    # call the result channel using the exp ID
    result_channel = wf.get_channel("Results")

    # while loop, until data is available on the result channel
    while(True):
        result_msg = result_channel.returnDataListNonBlocking()
        if len(result_msg) != 0:
            return result_msg[0]

def fetch_status(wf):
    # call the result channel using the exp ID
    status_channel = wf.get_channel("OrchestrationStatus")

    # while loop, until data is available on the status channel
    while(True):
        result_msg = status_channel.returnDataListNonBlocking()
        if len(result_msg) != 0:
            return result_msg[-1].split(":", 1)[1]

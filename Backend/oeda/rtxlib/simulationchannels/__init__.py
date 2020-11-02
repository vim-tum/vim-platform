from oeda.log import *
import json
import time
import os
from avro import schema, datafile, io

def init_channels(wf):

    debug("Initializing channels > ", Fore.GREEN)

    orchestration_data_providers = json.loads(open('oeda/config/simulation_config/orchestrationChannel.json').read())
    wf.secondary_data_providers.extend(orchestration_data_providers)

def create_scenario_file(wf):
    # TODO: break into two methods?

    debug("Updating scenario file > ", Fore.GREEN)

    path_to_scenarios = "oeda/config/simulation_config/scenario_files/"
    scenario = json.loads(open(path_to_scenarios + "RingRoad_Sumo_With_SpeedObserver.sce").read())

    # update scenario properties in the template with the workflow values
    scenario["ID"] = wf.id
    scenario["SimulationStart"] = wf._oeda_experiment["simulation"]["startTime"]
    scenario["SimulationEnd"] = wf._oeda_experiment["simulation"]["endTime"]

    resources = wf._oeda_experiment["simulation"]["resources"]

    # this should correspond to traffic.xml
    input_path = next((item for item in resources if item["type"] == "Input"), None)["name"]
    # this should correspond to network.sumo.xml
    input_roadmap = next((item for item in resources if item["type"] == "RoadMap"), None)["name"]

    scenario["Inputs"][0]["Path"] = input_path

    simulators = scenario["TrafficSimulators"]

    # get SUMO properties and update
    for sim in simulators:
        if sim["ID"].startswith('sumo'):
            # update Observers, overwrite previous
            # Observer attributes are incoming data types
            # Observer period equals simulation updateInterval (assume it's equal for all observers)
            new_sim = sim
            new_sim["Resources"] = [{'Key': str(input_roadmap), "Value": "RoadMap"}]

            observers = []
            for idt in wf.incoming_data_types:
                observer = {'Task': 'publish',
                            'Attribute': idt["name"],
                            'Subject': idt["dataProviderName"].lower(),
                            'Filter': 'all',
                            'Period': wf._oeda_experiment["simulation"]["updateInterval"] * 1000,
                            'Trigger': ''}
                observers.append(observer)

            new_sim["Observers"] = observers

            simulators.remove(sim)
            simulators.append(new_sim)
            break

    scenario["TrafficSimulators"] = simulators

    # keep record of the scenario file for this simulation
    scenario_filename = path_to_scenarios + "SumoScenario_simID_" + wf.id + ".sce"
    with open(scenario_filename, 'w') as h:
        json.dump(scenario, h,  indent=4)

    # add two necessary resource files: traffic.xml & network.sumo.xml
    # simulator require both these and the sce file to initiate a simulation run
    path_to_sim_resources = "oeda/config/simulation_config/sumo_resources/"
    resource_msg = []
    #
    raw_bytes_traffic = open(os.path.join(path_to_sim_resources, input_path), "rb").read()
    msg1 = {"ID": input_path, "Type": "Input", "File": raw_bytes_traffic}
    resource_msg.append(msg1)

    raw_bytes_network = open(os.path.join(path_to_sim_resources, input_roadmap), "rb").read()
    msg2 = {"ID": input_roadmap, "Type": "RoadMap", "File": raw_bytes_network}
    resource_msg.append(msg2)

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
        resource_topic.sendData(res)

def experiment_ACK(wf):
    
    ack_channel = {}

    if wf.primary_data_provider["name"] == "Scenario":
        ack_channel = wf.primary_data_provider["instance"]
    else:
        for secondary_data_provider in wf.secondary_data_providers:
            if secondary_data_provider["name"] == "Scenario":
                ack_channel = secondary_data_provider["instance"]
                break

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

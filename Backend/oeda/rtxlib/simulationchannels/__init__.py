from oeda.log import *
import json
import time


def init_channels(wf):

    debug("Initializing channels > ", Fore.GREEN)

    orchestration_data_providers = json.loads(open('oeda/config/simulation_config/orchestrationChannel.json').read())
    wf.secondary_data_providers.extend(orchestration_data_providers)

def create_scenario_file(wf):
    debug("Updating scenario file > ", Fore.GREEN)

    path_to_scenarios = "oeda/config/simulation_config/scenario_files/"
    scenario = json.loads(open(path_to_scenarios + "RingRoad_Sumo_With_SpeedObserver.sce").read())

    # update scenario properties in the template with the workflow values
    scenario["ID"] = wf.id
    scenario["SimulationStart"] = wf._oeda_experiment["simulation"]["startTime"]
    scenario["SimulationEnd"] = wf._oeda_experiment["simulation"]["endTime"]

    simulators = scenario["TrafficSimulators"]

    # get SUMO properties and update
    for sim in simulators:
        if sim["ID"].startswith('sumo'):
            # update Observers, overwrite previous
            # Observer attributes are incoming data types
            # Observer period equals simulation updateInterval (assume it's equal for all observers)

            observers = []
            for idt in wf.incoming_data_types:
                observer = {'Task': 'publish',
                            'Attribute': idt["name"],
                            'Subject': idt["dataProviderName"].lower(),
                            'Filter': 'all',
                            'Period': str(wf._oeda_experiment["simulation"]["updateInterval"] * 1000),
                            'Trigger': ''}
                observers.append(observer)

            new_sim = sim
            new_sim["Observers"] = observers

            simulators.remove(sim)
            simulators.append(new_sim)
            break

    scenario["TrafficSimulators"] = simulators

    # keep record of the scenario file for this simulation
    scenario_filename = path_to_scenarios + "SumoScenario_simID_" + wf.id + ".sce"
    with open(scenario_filename, 'w') as h:
        json.dump(scenario, h,  indent=4)

    return scenario

def init_simulation(wf, sc):
    debug("Initializing simulation > ", Fore.GREEN)
    debug("Publishing scenario file on the orchestration channel > ", Fore.GREEN)

    orchestrator = {}
    if wf.primary_data_provider["name"] == "OrchestrationBootstrap":
        orchestrator = wf.primary_data_provider["instance"]
    else:
        for secondary_data_provider in wf.secondary_data_providers:
            if secondary_data_provider["name"] == "OrchestrationBootstrap":
                orchestrator = secondary_data_provider["instance"]
                break

    print("Orchestrator channel is >>" + str(orchestrator.topic))
    # publish jsonified scenario file
    orchestrator.sendData(sc)

def experimentAck(wf):
    
    ackChannel = {}

    if wf.primary_data_provider["name"] == "Scenario":
        ackChannel = wf.primary_data_provider["instance"]
    else:
        for secondary_data_provider in wf.secondary_data_providers:
            if secondary_data_provider["name"] == "Scenario":
                ackChannel = secondary_data_provider["instance"]
                break    

    print("ACK channel is >>" + str(ackChannel.topic))

    #taking a 5 minute timeout for ACK waiting. Can be lower or removed  completely
    timeOut = time.time() + 60 * 5 
    ack = []
    
    while ((time.time() < timeOut)):
        ack = ackChannel.returnDataListNonBlocking()
        if len(ack) == 0:
            time.sleep(10) #wait for 10sec for new message
            debug("Waiting for ACK from simulator > ", Fore.GREEN)
        else:
            break
    
    debug("Ack received > " + str(ack))
    
    return ack
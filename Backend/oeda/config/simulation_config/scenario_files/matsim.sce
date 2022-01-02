{
    "ID": "",
    "RoadMap": "",
    "SimulationStart": 0,
    "SimulationEnd": 500,
    "Inputs": [],
    "Execution": {
        "RandomSeed": 123,
        "Constraints": "",
        "Priority": 0,
        "SyncedParticipants": 1
    },
    "TrafficSimulators": [
        {
            "ID": "matsim42",
            "Type": "MATSimWrapper",
            "StepLength": 1000,
            "Layer": "meso",
            "LayerParams": {},
            "Resources": 
                {   "network.matsim.xml":"RoadMap",
                    "plans.xml":"Traffic"  }
            ,
            "Results": {
                "returnMode": "listed",
                "modestats": "",
                "allVehicles": "",
                "config": "",
                "config_reduced": "",
                "counts": "",
                "events": "",
                "facilities": "",
                "households": "",
                "legs": "",
                "network": "",
                "persons": "",
                "plans": "",
                "trips": "",
                "vehicles": "",
                "ph_modestats": "",
                "pkm_modestats": "",
                "scorestats": "",
                "stopwatch": "",
                "traveldistancestats": ""     
            },
            "Timing" : {
		        "Constrained": "true", 
		        "Regulating": "true", 
		        "Lookahead": 1000
            },
            "Responsibilities": ["all"],
            "Borders": [],
            "Observers": [                {
                    "Task": "publish",
                    "Attribute": "",
                    "Filter": "all",
                    "Period": 1000,
                    "Subject": "vehicle",
                    "Trigger": "",
                    "Type": "avro"
                }   ],
            "CustomParams": { "iterations": "1"}
        } ],
   "Translators" : [ ],
   "AdditionalSimulators": [ ]
}

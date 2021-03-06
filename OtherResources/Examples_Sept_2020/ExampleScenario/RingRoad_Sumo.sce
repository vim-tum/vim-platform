{
    "ID" : "sim42",
    "RoadMap" : "",
    "SimulationStart" : "1",
    "SimulationEnd" : "3600",
    "Inputs": [{
    	"Processing" : "native", 
    	"Layer" : "micro", 
		"Path" : "traffic.xml"
    }],
    "Execution": {
    	"RandomSeed" : "123", 
		"Constraints" : "", 
		"Priority" : "0", 
		"SyncedParticipants" : "1"
    },
    "TrafficSimulators": [{
            "ID": "sumo0", 
            "Type": "SumoWrapper", 
            "StepLength": "100", 
            "Layer": "micro",
            "LayerParams": [
            	{"Key" : "car-following-model", "Value" : "idm"}
            ],
            "Resources": [{"Key" : "network.sumo.xml", "Value" : "RoadMap"}],
            "Results": [
            	{"Key" : "FCD", "Value" : "1000"}
            ],
            "Timing" : {
            	"Constrained": "true", 
				"Regulating": "true", 
				"Lookahead": "100"
            },
            "Responsibilities": [{"Responsibility": "all"}], 
            "Borders": [{"Border": "all"}],
		    "Observers": [],
            "CustomParams": ""
  }],
  "Translators" : [],
  "AdditionalSimulators": []
}


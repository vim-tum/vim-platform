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
            "ID": "sumo0",
            "Type": "SumoWrapper",
            "StepLength": 1000,
            "Layer": "micro",
            "LayerParams": {"foo":"bar"},
            "Resources": 
                {
                    "network.sumo.xml":"RoadMap",
                    "add.xml":"Additional",
                    "vtypes.xml":"Additional",
                    "traffic.xml":"Traffic"
                }
            ,
            "Results": {
                    "fcd-output": "fcd-output.xml",
                    "summary": "summary.xml"
            },
            "Timing" : {
            	"Constrained": true, 
				"Regulating": true, 
				"Lookahead": 1000
            },
            "Responsibilities": ["all"],
            "Borders": [],
            "Observers": [                         
                {
                    "Task": "publish",
                    "Attribute": "lastStepVehicleIDs",
                    "Filter": "all",
                    "Period": 1000,
                    "Subject": "detector",
                    "Trigger": "",
                    "Type": "json"
                }             
            ],
            "CustomParams": ""
        }
    ],
    "Translators": [],
    "AdditionalSimulators": []
}

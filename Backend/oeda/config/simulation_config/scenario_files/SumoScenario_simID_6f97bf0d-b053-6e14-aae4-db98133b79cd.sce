{
    "ID": "6f97bf0d-b053-6e14-aae4-db98133b79cd",
    "RoadMap": "",
    "SimulationStart": 0,
    "SimulationEnd": 500,
    "Inputs": [
        {
            "Processing": "native",
            "Layer": "micro",
            "Path": "traffic.xml"
        }
    ],
    "Execution": {
        "RandomSeed": "123",
        "Constraints": "",
        "Priority": "0",
        "SyncedParticipants": "1"
    },
    "TrafficSimulators": [
        {
            "ID": "sumo0",
            "Type": "SumoWrapper",
            "StepLength": "100",
            "Layer": "micro",
            "LayerParams": [
                {
                    "Key": "car-following-model",
                    "Value": "idm"
                }
            ],
            "Resources": [
                {
                    "Key": "network.sumo.xml",
                    "Value": "RoadMap"
                }
            ],
            "Results": [
                {
                    "Key": "FCD",
                    "Value": "1000"
                }
            ],
            "Timing": {
                "Constrained": "true",
                "Regulating": "true",
                "Lookahead": "100"
            },
            "Responsibilities": [
                {
                    "Responsibility": "all"
                }
            ],
            "Borders": [
                {
                    "Border": "all"
                }
            ],
            "Observers": [
                {
                    "Task": "publish",
                    "Attribute": "emission",
                    "Subject": "road",
                    "Filter": "all",
                    "Period": "1000",
                    "Trigger": ""
                }
            ],
            "CustomParams": ""
        }
    ],
    "Translators": [],
    "AdditionalSimulators": []
}
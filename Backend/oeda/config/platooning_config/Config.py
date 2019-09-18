mqttUpdates = False
mqttHost = "localhost"
mqttPort = "1883"

# the kafka host we want to send our messages to
kafkaHost = "kafka:9092"

# the topics we send the kafka messages to
kafkaTopicCarData = "platooning-car-data"
kafkaTopicPlatooningData = "platooning-data"

# where we receive system changes
kafkaPlatooningCommandsTopic = "platooning-config"

# Initial wait time before publishing data
ignore_first_n_results = 500

# you can also set contextual parameters
parameters = dict(
    contextual=dict(
        lookAheadDistance=500.0, # distance to find a leader vehicle in the simulation
        switchImpatienceFactor=0.1,
        platoonCarCounter=250,
        totalCarCounter=250, # set totalCarCounter as platoonCarCounter, other scenario is not tested excessively
        extended_simpla_logic=True
    ),

    changeable=dict(
        maxVehiclesInPlatoon=10,
        catchupDistance=500.0,
        maxPlatoonGap=500.0,
        platoonSplitTime=10.0,
        joinDistance=3000.0 # to find extreme positions (-+d) of platoon
    )
)
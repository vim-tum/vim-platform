from oeda.log import *

from oeda.rtxlib.dataproviders.HTTPRequestDataProvider import HTTPRequestDataProvider
from oeda.rtxlib.dataproviders.IntervalDataProvider import IntervalDataProvider
from oeda.rtxlib.dataproviders.KafkaConsumerDataProvider import KafkaConsumerDataProvider
from oeda.rtxlib.dataproviders.KafkaProducerDataProvider import KafkaProducerDataProvider
from oeda.rtxlib.dataproviders.MQTTListenerDataProvider import MQTTListenerDataProvider


def init_data_providers(wf):
    """ creates the required data providers """
    # createInstance(wf, wf.primary_data_provider)
    # per default create instances for the aggregated topic and all micro topics
    if 'incomingDataTypes' not in wf.primary_data_provider:
        createInstance(wf, wf.primary_data_provider)
    else:
        createMultipleInstances(wf, wf.primary_data_provider)
    if hasattr(wf, "secondary_data_providers"):
        for cp in wf.secondary_data_providers:
            # create a single instance for aggregate DPs, orchestration channel topics and scenario topic
            if 'incomingDataTypes' not in cp:
                createInstance(wf, cp)
            # otherwise create instances for every incoming data type of a DP and the (aggregated) DP itself
            else:
                createMultipleInstances(wf, cp)


def createInstance(wf, cp):
    """ creates a single instance of a data provider and stores the instance as reference in the definition """
    if cp["type"] == "kafka_consumer":
        cp["instance"] = KafkaConsumerDataProvider(wf, cp)
    elif cp["type"] == "kafka_producer": # call for pushing resources on provision channel
            cp["instance"] = KafkaProducerDataProvider(wf, cp)
    elif cp["type"] == "mqtt_listener":
        cp["instance"] = MQTTListenerDataProvider(wf, cp)
    elif cp["type"] == "http_request":
        cp["instance"] = HTTPRequestDataProvider(wf, cp)
    elif cp["type"] == "interval":
        cp["instance"] = IntervalDataProvider(wf, cp)
    else:
        cp["instance"] = None
        error("Not a valid data_provider")

def createMultipleInstances(wf, cp):
    """ creates multiple instances for each aggregated topic and micro topic (i.e. incoming data type) """
    if cp["type"] == "kafka_consumer":
        instances = []
        # create a dp for the aggregated topic
        instances.append(KafkaConsumerDataProvider(wf, cp))
#        for i in cp["incomingDataTypes"].length:
        for idp in cp["incomingDataTypes"]:
            # create a dp for each idp
            instances.append(KafkaConsumerDataProvider(wf, cp, idp))
        cp["instance"] = instances
    else:
        cp["instance"] = None
        error("Only Kafka instances are supported")

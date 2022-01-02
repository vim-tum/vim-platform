import logging
from colorama import Fore
from kafka import KafkaProducer
from flask import json

from oeda.log import *
from oeda.rtxlib.changeproviders.ChangeProvider import ChangeProvider


class KafkaProducerChangeProvider(ChangeProvider):
    """ implements a change provider based on kafka publish """

    def __init__(self, wf, cp):
        # load config
        try:
            self.kafka_uri = cp["kafka_uri"]
            # self.topic = cp["topic"]
            topicName = cp["topic"] # should be "interaction" as specified in config.py
            topicName = topicName + "." + wf._oeda_target["type"]     #We need to add some logic here to make it compatible to analysis module and multiplen simulators
            ## Get SimID to append with topic (should be same as experiment ID)
            topicName = topicName + "." + str(wf.id)
            #print("Kafka topic selected as >> ", channelName)
            self.topic = topicName

            self.serializer = cp["serializer"]
            info("> KafkaProducer  | " + self.serializer + " | URI: " + self.kafka_uri + " | Topic: " +
                 self.topic, Fore.CYAN)
        except KeyError:
            error("configuration.kafka_producer was incomplete")
            exit(1)
        # look at the serializer
        if self.serializer == "JSON":
            self.serialize_function = lambda v: json.dumps(v).encode('utf-8')
        else:
            error("serializer not implemented")
            exit(1)
        # try to connect
        try:
            # stop annoying logging
            logging.getLogger("kafka.coordinator.consumer").setLevel("ERROR")
            logging.getLogger("kafka.conn").setLevel("ERROR")
            self.producer = KafkaProducer(bootstrap_servers=self.kafka_uri,
                                          value_serializer=self.serialize_function,
                                          request_timeout_ms=5000)
        except:
            error("connection to kafka failed")
            exit(1)

    def applyChange(self, message):
        """ send out a message through kafka """
        debug("Sending out Kafka Message:" + str(message))
        self.producer.send(self.topic, message)

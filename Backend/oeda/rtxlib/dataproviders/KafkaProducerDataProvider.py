import logging
import pickle

from colorama import Fore
from kafka import KafkaProducer
from flask import json
from oeda.log import *
from oeda.rtxlib.dataproviders.DataProvider import DataProvider

# avro imports
import os
from confluent_kafka import avro
from confluent_kafka.avro import AvroProducer
#from confluent_kafka.avro.load import load, loads


class KafkaProducerDataProvider(DataProvider):
    """ implements a data provider based on kafka publish. Required for Provision channel configuration publishing """ 

    def __init__(self, wf, cp):
        # load config
        try:
            self.kafka_uri = cp["kafka_uri"]

            # Get the channel name
            channel_name = str(cp["channel"])

            channel_name += "." + wf._oeda_target["type"]

            if cp["topic"] != "bootstrap":
                channel_name += "." + str(wf.id) + "." + cp["topic"]
            # print("Kafka topic selected as >> ", channel_name)
            self.topic = channel_name

            self.serializer = cp["serializer"]
            info("> KafkaProducer  | " + self.serializer + " | URI: " + self.kafka_uri + " | Topic: " +
                 self.topic, Fore.CYAN)
        except KeyError:
            error("configuration.kafka_producer was incomplete")
            exit(1)

        # look at the serializer
        if self.serializer == "Avro":
            path_to_schemas = "oeda/config/simulation_config/AvroDefinitions/"
            schema = avro.load(os.path.join(path_to_schemas, "Scenario.avsc"))

            self.producer = AvroProducer({'bootstrap.servers': self.kafka_uri, 'schema.registry.url': 'http://127.0.0.1:8081'},
                                         default_value_schema=schema)

            debug(">>>>Created Avro Producer<<<<")
        else:
            if self.serializer == "JSON":
                self.serialize_function = lambda v: json.dumps(v).encode('utf-8')
            elif self.serializer == "pickle":
                self.serialize_function = lambda v: pickle.dumps(v).encode('ascii')
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

    def sendData(self, message):
        """ send out a message through kafka """
        debug("Sending out Kafka Message:" + str(message))

        #check if the producer is Avro serialized
        if self.serializer == "Avro":
            self.producer.produce(topic=self.topic, value=message)
            self.producer.flush()
        else: 
            self.producer.send(self.topic, message)

    def sendFile(self, filename):
        """ serialize and send a file through kafka """
        self.producer.send(self.topic, filename)

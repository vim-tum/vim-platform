import os
import logging
from colorama import Fore
from kafka import KafkaConsumer
from flask import json
from oeda.log import *
from oeda.rtxlib.dataproviders.DataProvider import DataProvider
from confluent_kafka.avro import AvroConsumer
from confluent_kafka import avro


class KafkaConsumerDataProvider(DataProvider):
    """ implements a data provider for kafka """

    def __init__(self, wf, cp, *args):
        idt = args

        self.callBackFunction = None
        # load config
        try:
            # generate the topic name
            channel_name = str(cp["channel"]) + "." + wf._oeda_target["type"]

            if cp["topic"] != "bootstrap":

                # include SimID
                channel_name += "." + str(wf.id)

                # provision channel has additional attributes 'traffic.micro.sumo0'
                if cp["channel"] == "provision" and cp["topic"] != "scenario":
                    channel_name += ".traffic.micro.sumo0"

                channel_name += "." + cp["topic"]

                if cp["topic"] == "scenario":
                    channel_name += ".bytes"

                if idt:
                    data_type_name = idt[0]["name"]
                    channel_name += "." + data_type_name

            self.topic = channel_name

            self.kafka_uri = cp["kafka_uri"]
            self.serializer = cp["serializer"]
            info(
                "> KafkaConsumer  | " + self.serializer + " | URI: " + self.kafka_uri + " | Topic: " +
                self.topic, Fore.CYAN)
        except KeyError as e:
            error("system.kafkaConsumer was incomplete: " + str(e))
            exit(1)

        # look at the serializer
        if self.serializer == "Avro":
            value_schema = self.get_reader_schema(self.topic)
            try:
                self.consumer = AvroConsumer({
                        'bootstrap.servers': self.kafka_uri,
                        'schema.registry.url': 'http://localhost:8081',
                        'group.id': 'my_group', # 'auto.offset.reset': 'earliest',
                    }, reader_value_schema=value_schema)
                self.consumer.subscribe([self.topic])
            except RuntimeError as e:
                error("subscribing to avro consumer failed: " + str(e))
                exit(1)

        elif self.serializer == "JSON":
            self.serialize_function = lambda m: json.loads(m.decode('utf-8'))
            # try to connect
            try:
                # disable logging
                logging.getLogger("kafka.coordinator.consumer").setLevel("ERROR")
                logging.getLogger("kafka.conn").setLevel("ERROR")
                # connect to kafka
                self.consumer = KafkaConsumer(bootstrap_servers=self.kafka_uri,
                                              value_deserializer=self.serialize_function,
                                              enable_auto_commit=True, auto_offset_reset='earliest',
                                              group_id="dataProvider_"+str(wf.id),
                                              consumer_timeout_ms=3000)
                # subscribe to the requested topic
                self.consumer.subscribe([self.topic])
            except RuntimeError as e:
                error("connection to kafka failed: " + str(e))
                exit(1)
        else:
            error("serializer not implemented")
            exit(1)



    def reset(self):
        """ creates a new consumer to get to the current position of the queue """
        if self.serializer == "Avro":
            try:
                value_schema = self.get_reader_schema(self.topic)
                self.consumer = AvroConsumer({
                        'bootstrap.servers': self.kafka_uri,
                        'schema.registry.url': 'http://localhost:8081',
                        'group.id': 'my_group',  # 'auto.offset.reset': 'earliest',
                        }, reader_value_schema=value_schema)
                self.consumer.subscribe([self.topic])
                self.consumer.subscribe([self.topic])
            except RuntimeError as e:
                error("resetting subscription to avro consumer failed: " + str(e))
                exit(1)

        elif self.serializer == "JSON":
            try:
                self.consumer = KafkaConsumer(bootstrap_servers=self.kafka_uri,
                                              value_deserializer=self.serialize_function,
                                              group_id="vim_consumer",
                                              auto_offset_reset='earliest',
                                              consumer_timeout_ms=3000)
                self.consumer.subscribe([self.topic])
            except RuntimeError as e:
                error("connection to kafka failed: " + str(e))
                exit(1)

    def returnData(self):
        """ returns the next data (blocking) """
        if self.serializer == "Avro":
            try:
                new_data = self.consumer.poll()
                return next(new_data.value())
            except StopIteration:
                inline_print(
                    Fore.YELLOW + "> WARNING - No message present within three seconds                          " + Fore.RESET)
                return None
        elif self.serializer == "JSON":
            try:
                return next(self.consumer).value
            except StopIteration:
                inline_print(
                    Fore.RED + "> WARNING - No message present within three seconds                          " + Fore.RESET)
                return None

    def returnDataListNonBlocking(self):
        """ polls for 5ms and returns all messages that came in """
        try:
            values = []
            partitions = self.consumer.poll(5)
            if len(partitions) > 0:
                for p in partitions:
                    for response in partitions[p]:
                        values.append(response.value)
            return values
        except StopIteration:
            return None

    def get_reader_schema(self, topic):
        path_to_schemas = "oeda/config/simulation_config/AvroDefinitions/"

        if "scenario" in topic:
            # scenario ACK topic
            schema_file = "Scenario.avsc"
        elif "status" in topic:
            schema_file = "StatusMsg.avsc"
        # all provision data channels contain "traffic.micro.sumo0" but that's subject to change
        elif "traffic.micro.sumo0" in topic:
            # topic is either aggregate or sub- provision topic
            attr = topic.split("traffic.micro.sumo0.", 1)[1].split(".", 1)
            if len(attr) == 1:
                # aggregate topic
                schema_file = "Micro.avsc"
            elif len(attr) == 2:
                # subtopic of a provision channel
                schema_file = "KeyValue.avsc"
            else:
                error("Error parsing topic")
                exit(1)
        else:
            error("Unknown channel")
            exit(1)
        schema = avro.load(os.path.join(path_to_schemas, schema_file))
        return schema

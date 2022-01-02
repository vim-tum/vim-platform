import os
import logging
from colorama import Fore
from kafka import KafkaConsumer
from flask import json
from oeda.log import *
from oeda.rtxlib.dataproviders.DataProvider import DataProvider
from oeda.rtxlib.dataproviders.AvroProducerConsumer import AvroConsumerStrKey
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
            self.topic = self.create_topic_name(id=wf.id, cp=cp, target_type=wf._oeda_target["type"], simulation_type=wf._oeda_target["simulationType"], incoming_data_types=idt)

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
            # value_schema = self.get_reader_schema(self.topic)
            try:
                self.consumer = AvroConsumerStrKey({
                        'bootstrap.servers': self.kafka_uri,
                        'schema.registry.url': 'http://131.159.24.152:8081',
                        'group.id': 'dataProvider_' + str(wf.id) + '_topic_' + cp["topic"],  
                        'auto.offset.reset': 'earliest',
                    }, reader_key_schema=None)
                print(str(self.consumer._stringDeserializer))
                subscribe_result = self.consumer.subscribe([self.topic])
                print(str(subscribe_result))
            except RuntimeError as e:
                error("subscribing to avro consumer failed: " + str(e))
                exit(1)

        elif self.serializer == "JSON":
            if cp["topic"] == "scenario" or cp["topic"] == "status":
                self.serialize_function = lambda m: m.decode('utf-8')
            else:
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
                                              group_id="dataProvider_" + str(wf.id) + '_topic_' + cp["topic"],
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
                '''
                self.consumer = AvroConsumer({
                        'bootstrap.servers': self.kafka_uri,
                        'schema.registry.url': 'http://localhost:8081',
                        'group.id': 'my_group',  # 'auto.offset.reset': 'earliest',
                        })
                '''
                # self.consumer.subscribe([self.topic])
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
                print("cp['topic'] is : "+ cp['topic'])
                print("self.topic is : " + self.topic)
                self.consumer.subscribe([self.topic])
            except RuntimeError as e:
                error("connection to kafka failed: " + str(e))
                exit(1)

    def returnData(self):
        """ returns the next data (blocking) """
        if self.serializer == "Avro":
            try:
                new_data = self.consumer.poll()
                if  new_data.error():
                    warn(new_data.error(), Fore.RED)
                    return None
                if new_data is None:
                    return None
                else:
                    print(str(new_data))
                    return new_data.value()    
                print(str(new_data))
                print(str(new_data.value()))
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
            print("Reached values = [] point of returnDataList...")
            partitions = self.consumer.poll(5)
            print("Reached partitions polled part")
            print(partitions)
            if self.serializer == "Avro":
                # AvroConsumer poll returns only one message not a list
                # for backwards compatibility still return list with one message
                if partitions is not None:
                    if not partitions.error():
                        values.append(partitions.value())
                    else:
                        # Ignore warning for UNKNOWN_TOPIC_OR_PART
                        warn(partitions.error(), Fore.RED)
            elif self.serializer == "JSON":
                if len(partitions) > 0:
                    for p in partitions:
                        for response in partitions[p]:
                            values.append(response.value)
            return values
        except StopIteration:
            return None

    def get_reader_schema(self, topic):
        path_to_schemas = "oeda/config/simulation_config/AvroDefinitions/"

        print("in get reader schema func call, logging the topic : " + topic)

        if "scenario" in topic:
            # scenario ACK topic
            schema_file = "Scenario.avsc"
        elif "status" in topic:
            schema_file = "StatusMsg.avsc"
        elif "output" in topic:
            schema_file = "AnalysisOutput.avsc"
        elif "response" in topic:
            schema_file = "AnalysisRespond.avsc"
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
        elif "traffic.meso.matsim" in topic:
            attr = topic.split("traffic.meso.matsim", 1)[1].split(".", 1)
            if len(attr) == 1:
                # aggregate topic
                schema_file = "Meso.avsc"
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

    @staticmethod
    def create_topic_name(id, cp, target_type, simulation_type, incoming_data_types=None):
        # generate the topic name
        channel_name = str(cp["channel"]) + "." + cp["experiment_type"]

        scenario = {}
        path_to_scenarios = "oeda/config/simulation_config/scenario_files/"
        if simulation_type == "sumo": 
            scenario = json.loads(open(path_to_scenarios + "DetectorObserver.sce").read())
        elif simulation_type == "matsim": 
            scenario = json.loads(open(path_to_scenarios + "matsim.sce").read())

        if cp["topic"] == "response":
            channel_name += "." + cp["topic"]
        elif cp["topic"] != "bootstrap":

            # include SimID
            channel_name += "." + str(id)

            # provision channel has additional attributes, e.g. 'traffic.micro.sumo0' for sumo simulation type
            if "simulation" in target_type and cp["channel"] == "provision" and cp["topic"] != "scenario" and cp["topic"] != "result" and cp["experiment_type"] != "analysis":
                if simulation_type == "sumo":
                    channel_name += ".traffic.micro." + scenario["TrafficSimulators"][0]["ID"] # read the id of the traffic simulator from the sce file which is used
                elif simulation_type == "matsim":
                    channel_name += ".traffic.meso." + scenario["TrafficSimulators"][0]["ID"] # repeat as for matsim

            channel_name += "." + cp["topic"]

            if cp["topic"] == "scenario":
                channel_name += ".string"

            if incoming_data_types:
                data_type_name = incoming_data_types[0]["name"]
                channel_name += "." + data_type_name
        
        return channel_name

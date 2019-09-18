import logging
from datetime import datetime

from elasticsearch.exceptions import ConnectionError
from elasticsearch.exceptions import TransportError

from elasticsearch import Elasticsearch
from elasticsearch.client import IndicesClient
from elasticsearch.helpers import scan

from .Database import Database
from oeda.log import *

class ElasticSearchDb(Database):
    data_point_definition = None
    experiment_definition = None
    target_system_definition = None
    analysis_definition = None
    stage_definition = None
    settings = None
    definitions = []

    def __init__(self, host, port, db_config):
        self.es = Elasticsearch([{"host": host, "port": port}])
        try:
            if self.es.ping():
                es_logger = logging.getLogger('elasticsearch')
                es_logger.setLevel(logging.CRITICAL)

                self.indices_client = IndicesClient(self.es)

                index_definitions = db_config["index_definitions"]
                self.settings = db_config["settings"]

                self.data_point_definition = index_definitions["data_point"]
                self.create_index_from_definition(self.data_point_definition, self.settings)
                self.data_point_type_name = self.data_point_definition["name"]
                self.data_point_index = self.data_point_definition["index_name"]
                self.definitions.append(self.data_point_definition)

                self.experiment_definition = index_definitions["experiment"]
                self.create_index_from_definition(self.experiment_definition, self.settings)
                self.experiment_type_name = self.experiment_definition["name"]
                self.experiment_index = self.experiment_definition["index_name"]
                self.definitions.append(self.experiment_definition)

                self.target_system_definition = index_definitions["target_system"]
                self.create_index_from_definition(self.target_system_definition, self.settings)
                self.target_system_type_name = self.target_system_definition["name"]
                self.target_system_index = self.target_system_definition["index_name"]
                self.definitions.append(self.target_system_definition)

                self.analysis_definition = index_definitions["analysis"]
                self.create_index_from_definition(self.analysis_definition, self.settings)
                self.analysis_type_name = self.analysis_definition["name"]
                self.analysis_index = self.analysis_definition["index_name"]
                self.definitions.append(self.analysis_definition)

                self.stage_definition = index_definitions["stage"]
                self.create_index_from_definition(self.stage_definition, self.settings)
                self.stage_type_name = self.stage_definition["name"]
                self.stage_index = self.stage_definition["index_name"]
                self.definitions.append(self.stage_definition)

            else:
                raise ConnectionError("Host/port values are not valid")
        except TransportError as err1:
            error("TransportError while creating elasticsearch instance for experiments. Check type mappings in experiment_db_config.json.")
            raise err1

    def create_index_from_definition(self, definition, settings):
        index = definition["index_name"]
        if not self.indices_client.exists(index):
            body = dict()
            body["settings"] = settings
            body["mappings"] = definition["mappings"]
            self.indices_client.create(index=index, body=body)

    def save_target(self, target_system_data):
        target_system_data["createdDate"] = datetime.now().isoformat(' ')
        target_system_id = target_system_data["id"]
        try:
            self.es.index(index=self.target_system_index, id=target_system_id, body=target_system_data)
            return target_system_data
        except ConnectionError as err1:
            error("ConnectionError while saving target system. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while saving target system. Check type mappings in experiment_db_config.json.")
            raise err2

    def get_target(self, target_system_id):
        try :
            res = self.es.get(index=self.target_system_index, id=target_system_id)
            return res["_source"]
        except ConnectionError as err1:
            error("ConnectionError while retrieving target. Check connection to elasticsearch.")
            raise err1

    def delete_target(self, target_system_id):
        try:
            self.es.delete(index=self.target_system_index, id=target_system_id)
            return "deleted"
        except ConnectionError as err1:
            error("ConnectionError while deleting target system. Check connection to elasticsearch.")
            raise err1

    def get_targets(self):
        try:
            query = {
                "size" : 1000,
                "query": {
                    "match_all": {}
                }
            }
            self.es.indices.refresh(index=self.target_system_index)
            res = self.es.search(index=self.target_system_index, body=query)
            return [r["_id"] for r in res["hits"]["hits"]], [r["_source"] for r in res["hits"]["hits"]]
        except ConnectionError as err1:
            error("ConnectionError while retrieving targets. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving targets. Check type mappings in experiment_db_config.json.")
            raise err2

    def save_experiment(self, experiment_data):
        experiment_data["status"] = "OPEN"
        experiment_data["createdDate"] = datetime.now().isoformat(' ')
        experiment_id = experiment_data["id"]

        try:
            self.es.index(index=self.experiment_index, body=experiment_data, id=experiment_id)
        except ConnectionError as err1:
            error("ConnectionError while saving experiment data. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while saving experiment data. Check type mappings in experiment_db_config.json.")
            raise err2

    def get_experiment(self, experiment_id):
        try:
            res = self.es.get(index=self.experiment_index, id=experiment_id)
            return res["_source"]
        except ConnectionError as err1:
            error("ConnectionError while retrieving an experiment. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving an experiment. Check type mappings in experiment_db_config.json.")
            raise err2

    def delete_experiment(self, experiment_id):
        steps_count = self.get_experiment(experiment_id)["numberOfSteps"]
        for step in range(1, steps_count + 1):
            stage_ids, stages = self.get_stages(experiment_id=experiment_id, step_no=step)
            for stage_id in stage_ids:
                debug("deleting stage: " + str(stage_id))
                self.delete_data_points(stage_id=stage_id)
                self.delete_stage(stage_id=stage_id)
        try:
            self.es.delete(index=self.experiment_index, id=experiment_id)
            return "deleted"
        except ConnectionError as err1:
            error("ConnectionError while deleting experiment. Check connection to elasticsearch.")
            raise err1

    def get_experiments(self):
        query = {
            "size": 10000,
            "query": {
                "match_all": {}
            }
        }
        try:
            self.es.indices.refresh(index=self.experiment_index)
            res = self.es.search(index=self.experiment_index, body=query, sort='createdDate')
            return [r["_id"] for r in res["hits"]["hits"]], [r["_source"] for r in res["hits"]["hits"]]
        except ConnectionError as err1:
            error("ConnectionError while getting experiments. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving experiments. Check type mappings in experiment_db_config.json.")
            raise err2

    def update_experiment(self, experiment_id, field, value):
        body = {"doc": {field: value}}
        try:
            self.es.update(index=self.experiment_index, id=experiment_id, body=body)
        except ConnectionError as err:
            error("ConnectionError while updating experiment status. Check connection to elasticsearch.")
            raise err
        except TransportError as err2:
            error("TransportError while updating experiment status. Check type mappings in experiment_db_config.json.")
            raise err2

    def update_target_system(self, target_system_id, field, value):
        body = {"doc": {field: value}}
        try:
            self.es.update(index=self.target_system_index, id=target_system_id, body=body)
        except ConnectionError as err1:
            error("ConnectionError while updating target system status. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while updating target system status. Check type mappings in experiment_db_config.json.")
            raise err2

    def update_data_point(self, experiment_id, status):
        body = {"doc": {"status": status}}
        try:
            self.es.update(index=self.data_point_index, id=experiment_id, body=body)
        except ConnectionError as err1:
            error("ConnectionError while updating experiment status. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while updating experiment status. Check type mappings in experiment_db_config.json.")
            raise err2

    def save_stage(self, experiment_id, step_no, step_name, stage_no, knobs, stage_result=None):
        stage_id = self.create_stage_id(experiment_id, str(step_no), str(stage_no))
        body = dict()
        body["number"] = stage_no
        body["knobs"] = knobs
        body["createdDate"] = datetime.now().isoformat(' ')
        body["experiment_id"] = experiment_id
        body["step_no"] = step_no
        body["step_name"] = step_name

        if stage_result:
            body["stage_result"] = stage_result

        try:
            self.es.index(index=self.stage_index, id=stage_id, body=body)
        except ConnectionError as err1:
            error("ConnectionError while saving stage. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while saving stage. Check type mappings in experiment_db_config.json.")
            raise err2

    def update_stage(self, experiment_id, step_no, stage_no, field, value):
        stage_id = self.create_stage_id(experiment_id, str(step_no), str(stage_no))
        body = {"doc": {field: value}}
        try:
            self.es.update(index=self.stage_index, id=stage_id, body=body)
        except ConnectionError as err1:
            error("ConnectionError while updating stage result. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while updating stage result. Check type mappings in experiment_db_config.json.")
            raise err2

    def delete_stage(self, stage_id):
        try:
            self.es.delete(index=self.stage_index, id=stage_id)
        except ConnectionError as err1:
            error("ConnectionError while updating stage result. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while updating stage result. Check type mappings in experiment_db_config.json.")
            raise err2

    def get_stages(self, experiment_id, step_no):
        query = {
            "query": {
                "match": {
                    "experiment_id": str(experiment_id),
                }
            },
            "post_filter": {
                "term": {"step_no": str(step_no)}
            }
        }

        try:
            # before retrieving stages, refresh index
            self.es.indices.refresh(index=self.stage_index)
            res = self.es.search(index=self.stage_index, body=query, size=10000, sort='createdDate')
            _ids = [r["_id"] for r in res["hits"]["hits"]]
            _sources = [r["_source"] for r in res["hits"]["hits"]]
            return _ids, _sources
        except ConnectionError as err1:
            error("ConnectionError while retrieving stages. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving stages. Check type mappings in experiment_db_config.json.")
            raise err2

    def save_data_point(self, experiment_id, step_no, stage_no, data_point_count, secondary_data_provider_index, payload):
        data_point_id = Database.create_data_point_id(experiment_id, step_no, stage_no, data_point_count, secondary_data_provider_index)
        stage_id = Database.create_stage_id(experiment_id, step_no, stage_no)
        body = dict()
        body["payload"] = payload
        body["createdDate"] = datetime.now().isoformat(' ')  # used to replace 'T' with ' '
        body["stage_id"] = stage_id
        try:
            self.es.index(index=self.data_point_index, body=body, id=data_point_id)
        except ConnectionError as err1:
            error("ConnectionError while saving data point. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while saving data point. Check type mappings in experiment_db_config.json.")
            raise err2

    def delete_data_points(self, stage_id):
        try:
            self.es.delete_by_query(index=self.data_point_index, body={"query": {"match": {'stage_id': stage_id}}})
        except ConnectionError as err1:
            error("ConnectionError while saving data point. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while saving data point. Check type mappings in experiment_db_config.json.")
            raise err2

    def get_data_points(self, experiment_id, step_no, stage_no):
        stage_id = Database.create_stage_id(experiment_id, step_no, stage_no)
        query = {
            "query": {
                "match": {
                    "stage_id": str(stage_id)
                }
            }
        }
        try:
            # before retrieving data points, refresh index
            self.es.indices.refresh(index=self.data_point_index)
            # https://stackoverflow.com/questions/9084536/sorting-by-multiple-params-in-pyes-and-elasticsearch
            # sorting is required for proper visualization of data
            res = self.es.search(index=self.data_point_index, body=query, size=10000, sort='createdDate')
            return [r["_source"] for r in res["hits"]["hits"]]
        except ConnectionError as err1:
            error("ConnectionError while retrieving data points. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving data points. Check type mappings in experiment_db_config.json.")
            raise err2

    def get_aggregation(self, experiment_id, step_no, stage_no, aggregation_name, field):
        # before retrieving aggregation(s), refresh index
        self.es.indices.refresh(index=self.data_point_index)
        stage_id = self.create_stage_id(experiment_id, step_no, stage_no)
        exact_field_name = "payload" + "." + str(field)
        query = {
            "query": {
                "match": {
                    "stage_id": str(stage_id)
                }
            }
        }
        query["size"] = 0 # we are not interested in matching data points

        # prepare the aggregation query
        # https://www.elastic.co/guide/en/elasticsearch/reference/5.5/search-aggregations-metrics-stats-aggregation.html
        # aggregation name can be extended_stats, stats, percentiles etc.
        # so aggregation_result_name would be percentiles_overhead, extended_stats_minimalCosts etc.
        aggregation_key = aggregation_name + "_" + str(field)
        query["aggs"] = {aggregation_key: {aggregation_name: {"field": exact_field_name} } }
        try:
            res = self.es.search(index=self.data_point_index, body=query)
            if aggregation_name == "percentiles":
                return res["aggregations"][aggregation_key]["values"]
            else:
                return res["aggregations"][aggregation_key]
        except ConnectionError as err1:
            error("ConnectionError while retrieving aggregations. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving aggregations. Check type mappings in experiment_db_config.json.")
            raise err2

    # https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-filter-aggregation.html
    # can be extended with aggregations using above link
    # for now we are only interested in the document count
    # we are interested in the ratio of given field=value / number of all data that includes this field
    # so, we only return the doc_count here, another query should be issued to get 'count' of all points
    # if we had used res["hits"]["total"] here, it would be wrong because it also includes data from secondary providers
    def get_count(self, experiment_id, step_no, stage_no, field, value):
        stage_id = self.create_stage_id(experiment_id, step_no, stage_no)
        exact_field_name = "payload" + "." + str(field)
        aggregation_key = "count_" + str(field)
        query = {
            "query": {
                "match": {
                    "stage_id": str(stage_id)
                }
            },
            "size": 0,
            "aggs": {
                aggregation_key: {
                    "filter": {"term": {exact_field_name: value} }
                }
            }
        }
        try:
            # before retrieving aggregation(s), refresh index
            self.es.indices.refresh(index=self.data_point_index)
            res = self.es.search(index=self.data_point_index, body=query)
            return res["aggregations"][aggregation_key]["doc_count"]
        except ConnectionError as err1:
            error("ConnectionError while retrieving aggregations from elasticsearch. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving aggregations. Check type mappings for experiments in experiment_db_config.json.")
            raise err2

    def get_data_points_after(self, experiment_id, step_no, stage_no, timestamp):
        stage_id = Database.create_stage_id(experiment_id, step_no, stage_no)
        query = {
            "query": {
                "match": {
                    "stage_id": str(stage_id)
                }
            },
            "post_filter": {
                "range": {
                    "createdDate": {
                        "gt": timestamp,
                        "format": "yyyy-MM-dd HH:mm:ss.SSSSSS"
                    }
                }
            }
        }
        try:
            # before retrieving data points, refresh index
            self.es.indices.refresh(index=self.data_point_index)
            # https://stackoverflow.com/questions/9084536/sorting-by-multiple-params-in-pyes-and-elasticsearch
            # sorting is required for proper visualization of data
            res = self.es.search(index=self.data_point_index, body=query, size=10000, sort='createdDate')
            return [r["_source"] for r in res["hits"]["hits"]]
        except ConnectionError as err1:
            error("ConnectionError while retrieving data points from elasticsearch. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving data points. Check type mappings for experiments in experiment_db_config.json.")
            raise err2

    def clear_db(self):
        try:
            if self.es.ping():
                for definition in self.definitions:
                    self.indices_client.delete(index=definition["index_name"], ignore=[400, 404])  # remove all records
                    self.create_index_from_definition(definition, self.settings)
        except ConnectionError as err1:
            error("ConnectionError while clearing database. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while clearing database. Check type mappings for experiments in experiment_db_config.json.")
            raise err2

    def get_stages_count(self, experiment_id, step_no):
        query = {
            "query": {
                "match": {
                    "experiment_id": str(experiment_id),
                }
            },
            "post_filter": {
                "match": {"step_no": str(step_no)}
            }
        }

        try:
            self.es.indices.refresh(index=self.stage_index)
            res = self.es.search(index=self.stage_index, body=query, size=10000, sort='createdDate')
            return len(res["hits"]["hits"])
        except ConnectionError as err1:
            error("ConnectionError while retrieving stage count. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving stage count. Check type mappings in experiment_db_config.json.")
            raise err2

    def get_data_for_analysis(self, experiment_id, step_no):
        data = dict()
        knobs = dict()
        stages = self.get_stages(experiment_id=experiment_id, step_no=step_no)
        if len(stages[0]) > 0 and len(stages[1]) > 0:
            stage_ids = stages[0]
            sources = stages[1]
            for idx, stage_id in enumerate(stage_ids):
                data_points = self.get_data_points(experiment_id=experiment_id, step_no=step_no, stage_no=idx + 1) # because stages start from 1 whereas idx start from 0
                if len(data_points) > 0:
                    data[stage_id] = [d for d in data_points]
                    knobs[stage_id] = sources[idx]["knobs"]
            # return value 1 (data): is a key-value pair where key is stage_id and value is array of all data points of that stage,
            # return value 2 (knobs): is a key-value pair where key is stage_id and value is knob object of that stage
            return data, knobs
        raise Exception("Cannot retrieve stage and data from db, please restart")

    # we had to distinguish between anova_result (json of json objects) with regular t_test result (single json object)
    def save_analysis(self, experiment_id, step_no, analysis_name, knobs=None, result=None, anova_result=None):
        analysis_id = Database.create_analysis_id(experiment_id, step_no, analysis_name)
        body = dict()
        body["experiment_id"] = experiment_id
        body["step_no"] = step_no
        body["name"] = analysis_name
        body["result"] = result
        body["anova_result"] = anova_result
        body["createdDate"] = datetime.now().isoformat(' ')

        if knobs:
            body["knobs"] = knobs

        try:
            self.es.index(index=self.analysis_index, body=body, id=analysis_id)
        except ConnectionError as err1:
            error("Error while saving analysis in elasticsearch. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while saving analysis. Check type mappings for analysis in experiment_db_config.json.")
            raise err2

    def get_analysis(self, experiment_id, step_no, analysis_name):
        try:
            analysis_id = Database.create_analysis_id(experiment_id, step_no, analysis_name)
            res = self.es.get(index=self.analysis_index, id=analysis_id)
            return res["_source"]
        except ConnectionError as err1:
            error("Error while retrieving analysis in elasticsearch. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while retrieving analysis. Check type mappings for analysis in experiment_db_config.json.")
            raise err2

    def update_analysis(self, experiment_id, step_no, analysis_name, field, value):
        analysis_id = Database.create_analysis_id(experiment_id, step_no, analysis_name)
        body = {"doc": {field: value}}
        try:
            self.es.update(index=self.analysis_index, id=analysis_id, body=body)
        except ConnectionError as err1:
            error("ConnectionError while updating stage result. Check connection to elasticsearch.")
            raise err1
        except TransportError as err2:
            error("TransportError while updating stage result. Check type mappings in experiment_db_config.json.")
            raise err2

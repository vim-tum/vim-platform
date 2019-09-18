# Abstract interface for a database
#
# A database stores the raw data and the experiment runs of RTX.


class Database:

    def __init__(self):
        pass

    def save_target(self, target_system_data):
        """ saves the data of an OEDA target system, id is retrieved from data """
        pass

    def get_target(self, target_system_id):
        """ returns the configuration of an OEDA target system """
        pass

    def delete_target(self, target_system_data):
        """ deletes a target system """
        pass

    def get_targets(self):
        """ returns all the target systems """
        pass

    def save_experiment(self, experiment_data):
        """ saves the data of an OEDA experiment, id is retrieved from data """
        pass

    def get_experiment(self, experiment_id):
        """ returns the configuration of an OEDA experiment """
        pass

    def delete_experiment(self, experiment_id):
        """ deletes the experiment """
        pass

    def get_experiments(self):
        """ returns all OEDA experiments """
        pass

    def update_experiment(self, experiment_id, field, value):
        """ updates experiment with provided id, field, and value """
        pass

    def update_target_system(self, target_system_id, field, value):
        """ updates experiment status with provided id, field, and value """
        pass

    def save_stage(self, experiment_id, step_no, step_name, stage_no, knobs, stage_result=None):
        """ saves stage of an OEDA experiment with provided step no, stage_no and configuration """
        pass

    def update_stage(self, experiment_id, step_no, stage_no, field, value):
        """ updates stage tuple with provided field & values """
        pass

    def delete_stage(self, stage_id):
        """ deletes the stage given its id """
        pass

    def get_stages(self, experiment_id, step_no):
        """ returns all stages of an OEDA experiment with provided id and step_no """
        pass

    def save_data_point(self, experiment_id, step_no, stage_no, data_point_count, secondary_data_provider_index, payload):
        """ saves data retrieved from data provider for the given stage """
        pass

    def delete_data_points(self, stage_id):
        """ deletes all data_points with the given stage_id """
        pass

    def get_data_points(self, experiment_id, step_no, stage_no):
        """ returns data_points whose stage_id is the concatenated stage_id (see create_stage_id) """
        pass

    def get_data_points_after(self, experiment_id, step_no, stage_no, timestamp):
        """ returns data_points that are created after the given timestamp. Data points' stage_ids are found by create_stage_id method """
        pass

    def get_aggregation(self, experiment_id, step_no, stage_no, aggregation_name, field):
        """ returns aggregations for the given aggregation name, step_no, stage no, and data field found in the payload
            supported aggregations are stats (count, min, max, average, sum), extended_stats (more options),
            and percentiles (1.0, 5.0, 25.0, 50.0 (median), 75.0, 95.0, 99.0 """
        pass

    def get_count(self, experiment_id, step_no, stage_no, field, value):
        """ returns document count for the given data field and its value """
        pass

    def clear_db(self):
        """ just for testing, it re-creates an index """
        pass

    def get_data_for_analysis(self, experiment_id, step_no):
        """ returns data_points (key-value pair),
            knobs and experiment_count of specified experiment & step for analysis """
        pass

    def save_analysis(self, experiment_id, step_no, analysis_name, result, anova_result):
        """ saves data retrieved from different analysis types for given stages """
        pass

    def get_analysis(self, experiment_id, step_no, analysis_name):
        """ returns analysis result for the given step_no & analysis_name """
        pass

    def update_analysis(self, experiment_id, step_no, analysis_name, field, value):
        """ updates result of a stage with provided experiment_id, step_no, and field and value to be updated """
        pass

    @staticmethod
    def create_stage_id(experiment_id, step_no, stage_no):
        return str(experiment_id) + "#" + str(step_no) + "#" + str(stage_no)

    @staticmethod
    def create_data_point_id(experiment_id, step_no, stage_no, data_point_count, secondary_data_provider_index):
        """ if secondary_data_provider_index is provided, then data is meant to be coming from sec. data provider """
        if secondary_data_provider_index:
            return str(experiment_id) + "#" + str(step_no) + "#" + str(stage_no) + "_" + str(data_point_count) + "-" + str(secondary_data_provider_index)
        return str(experiment_id) + "#" + str(step_no) + "#" + str(stage_no) + "_" + str(data_point_count)

    @staticmethod
    def create_analysis_id(experiment_id, step_no, analysis_name):
        """ e.g. a6d30adf-0bdb-7d84-e82b-252473e11699*1*anova """
        return str(experiment_id) + "*" + str(step_no) + "*" + analysis_name


class TargetSystemNotFoundException(Exception):
    pass


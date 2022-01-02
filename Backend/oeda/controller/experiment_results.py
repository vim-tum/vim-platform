from flask import jsonify
from flask_restful import Resource
import oeda.controller.stages as sc
import json as json
import traceback

from oeda.controller.securityUtils import jwt_auth_required, require_permission, Permission
from oeda.controller.experiments import has_access_to_experiment
from oeda.databases import db
from collections import defaultdict

class StageResultsWithExperimentIdController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT, has_access_to_experiment)
    def get(experiment_id, step_no, stage_no):
        try:
            res = db().get_data_points(experiment_id=experiment_id, step_no=step_no, stage_no=stage_no)
            resp = jsonify(res)
            resp.status_code = 200
            return resp
        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"error": e.message}, 404


class AllStageResultsWithExperimentIdController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT, has_access_to_experiment)
    def get(experiment_id):
        try:
            resp = jsonify(get_all_stage_data(experiment_id=experiment_id))
            resp.status_code = 200
            return resp
        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"error": e.message}, 404


def get_all_stage_data(experiment_id, timestamp=None):
    steps_and_stages = sc.StageController.get(experiment_id=experiment_id)
    new_tuples = dict()
    # we get step_no as keys, stage_numbers as inner keys
    for step_no, step in steps_and_stages.items():
        new_tuples[step_no] = dict()
        for stage in step:
            if stage['number'] != "best":
                new_tuples[step_no][stage['number']] = dict()
                if timestamp:
                    data_points = db().get_data_points_after(experiment_id=experiment_id, step_no=step_no, stage_no=stage['number'], timestamp=timestamp)
                else:
                    data_points = db().get_data_points(experiment_id=experiment_id, step_no=step_no, stage_no=stage['number'])

                # wrap the stage data with stage number if there are some data points
                if len(data_points) != 0:
                    stage_and_data = {
                        "knobs": stage["knobs"],
                        "number": stage["number"],
                        "step_name": stage["step_name"],
                        "values": data_points
                    }
                    # also append stage_result if there are any
                    if "stage_result" in stage:
                        stage_and_data["stage_result"] = stage["stage_result"]
                    new_tuples[step_no][stage['number']] = stage_and_data
    return new_tuples
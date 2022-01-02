from flask import jsonify
from flask_restful import Resource

import traceback

from oeda.controller.securityUtils import jwt_auth_required, require_permission, has_access_to_experiment, Permission
from oeda.controller.experiment_results import get_all_stage_data
import oeda.controller.callback as cb

class RunningAllStageResultsWithExperimentIdController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT, has_access_to_experiment)
    def get(experiment_id, timestamp):
        """ first gets all stages of given experiment, then concats all data to a single tuple """
        try:
            if timestamp is None:
                return {"error": "timestamp should not be null"}, 404

            if timestamp == "-1":
                resp = jsonify(get_all_stage_data(experiment_id))
                resp.status_code = 200
                return resp

            all_stage_data = get_all_stage_data(experiment_id, timestamp)
            resp = jsonify(all_stage_data)
            resp.status_code = 200
            return resp
        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"error": e.message}, 404


# returns wf._oedaCallback via API
class OEDACallbackController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT, has_access_to_experiment)
    def get(experiment_id):
        try:
            if experiment_id is None:
                return {"error": "experiment_id should not be null"}, 404

            if cb.get_dict(experiment_id) is None:
                resp = jsonify({"status": "PROCESSING", "message": "OEDA callback for this experiment has not been processed yet..."})
            else:
                # should return the dict after callback is received
                resp = jsonify(cb.get_dict(experiment_id))

            resp.status_code = 200
            return resp

        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"error": e.message}, 404
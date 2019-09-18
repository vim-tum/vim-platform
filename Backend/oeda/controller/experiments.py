from flask import request, jsonify
from flask_restful import Resource
from oeda.databases import db
from oeda.controller.callback import set_dict as set_dict
from oeda.service.execution_scheduler import kill_experiment as kill_experiment
from oeda.controller.callback import pop_from_dict
import traceback

class ExperimentController(Resource):

    @staticmethod
    def get(experiment_id):
        return db().get_experiment(experiment_id)

    @staticmethod
    def post(experiment_id):
        experiment = request.get_json()
        db().save_experiment(experiment)
        # here we refresh the status of oeda callback, too
        set_dict(None, experiment_id)
        resp = jsonify(experiment)
        resp.status_code = 200
        return resp

    @staticmethod
    def put(experiment_id):
        try:
            if experiment_id is None:
                return {"message": "experiment_id should not be null"}, 404
            content = request.get_json()
            status = content["status"]

            if status == "POLLING_FINISHED":
                # just remove dict from callbackDict if we receive respective signal
                # but do not touch experiment status because it can already be updated after workflow execution
                pop_from_dict(experiment_id, None)
                resp = jsonify({"message": "Polling is stopped and callback is removed"})
                resp.status_code = 200
                return

            # kill thread and return respective messages if an interrupt signal is received & update db
            elif status == "INTERRUPTED":
                kill_experiment(experiment_id=experiment_id)
                # also remove callback dict from callbackDict
                pop_from_dict(experiment_id, None)

            db().update_experiment(experiment_id=experiment_id, field="status", value=status)
            resp = jsonify({"message": "Experiment status is updated"})
            resp.status_code = 200
            return resp
        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"message": e.message}, 404
        except KeyError:
            return {"message": "experiment_id does not exist in callbackDict, please re-create experiment"}, 404

class ExperimentsListController(Resource):

    @staticmethod
    def get():
        ids, experiments = db().get_experiments()
        new_experiments = experiments
        i = 0
        for _ in experiments:
            new_experiments[i]["id"] = ids[i]
            i += 1
        return new_experiments

class ExperimentDeleteController(Resource):

    @staticmethod
    def get(experiment_id):
        experiment = db().delete_experiment(experiment_id)
        try:
            return experiment
        except:
            return {"error": "not found"}, 404
import os
from datetime import datetime, timezone, timedelta
from shutil import rmtree
from flask import request, jsonify
from flask_restful import Resource
from oeda.controller.securityUtils import require_permission, jwt_auth_required, get_jwt_auth_identity, not_authorized, \
    Permission, has_access_to_experiment
from oeda.databases import db
from oeda.controller.callback import set_dict as set_dict
from oeda.service.execution_scheduler import kill_experiment as kill_experiment
from oeda.controller.callback import pop_from_dict
from oeda.controller.s3_client import S3ClientController
from confluent_kafka.admin import AdminClient, NewTopic
import traceback

class ExperimentController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT, has_access_to_experiment)
    def get(experiment_id):
        return db().get_experiment(experiment_id)

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.WRITE_EXPERIMENT)
    def post(experiment_id, permission):
        experiment = request.get_json()
        user = get_jwt_auth_identity()
        if permission["access_all"] or experiment["user"] == user:
            db().save_experiment(experiment)
            # here we refresh the status of oeda callback, too
            set_dict(None, experiment_id)
            resp = jsonify(experiment)
            resp.status_code = 200
            return resp
        else:
            return not_authorized


    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT, has_access_to_experiment)
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
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT)
    def get(permission):
        ids, experiments = db().get_experiments()
        new_experiments = experiments
        i = 0
        for _ in experiments:
            new_experiments[i]["id"] = ids[i]
            i += 1
        # filter by user identity if not privileged
        if not permission["access_all"]:
            current_user = get_jwt_auth_identity()
            new_experiments = list(filter(lambda experiment: experiment["user"] == current_user, new_experiments))
        return new_experiments

class ExperimentDeleteController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.DEL_EXPERIMENT, has_access_to_experiment)
    def get(experiment_id):
        experiment = db().delete_experiment(experiment_id)
        try:
            return experiment
        except:
            return {"error": "not found"}, 404

class ExperimentsDeleteController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.DEL_EXPERIMENT, has_access_to_experiment)
    def get(time_in_days):
        ids, experiments = db().get_experiments()
        old_experiments = []
        old_experiment_ids = []
        adminClient = AdminClient({'bootstrap.servers': 'localhost:9092'})
        current_directory = os.path.dirname(__file__)
        parent_directory = os.path.split(current_directory)[0]
        analysis_img_files_directory = os.path.split(parent_directory)[0] + "/files/analysis/results"
        simulation_scenario_file_directory = parent_directory + "/config/simulation_config/scenario_files"

        for e in experiments:
            if datetime.strptime(e["createdDate"], "%Y-%m-%d %H:%M:%S.%f") < datetime.now() - timedelta(days=int(time_in_days)):
                old_experiments.append(e)
                old_experiment_ids.append(e["id"])
                db().delete_experiment(e["id"])
        
        result_files = S3ClientController.get_client().list_objects(Bucket=S3ClientController.bucket_name,Prefix="simulation/results/",Delimiter='/').get('CommonPrefixes', [])
        # per default we set the time threshhold to 30 days or older for selecting the old files
        delete_result_files = []

        for old_e in old_experiments:
            # Remove all image files from the analysis directory under the given path from disk storage
            if os.path.exists(analysis_img_files_directory + "/" + old_e["id"]):
                rmtree(analysis_img_files_directory + "/" + old_e["id"])
            # Remove all scenario files from scenario file directory on the disk storage
            if os.path.exists(simulation_scenario_file_directory):
                # Matsim scenario or sumo scenario files
                onlyfiles = [f for f in os.listdir(simulation_scenario_file_directory) if os.path.isfile(os.path.join(simulation_scenario_file_directory, f))]
                for f in onlyfiles:
                    if old_e["id"] in f:
                        os.remove(simulation_scenario_file_directory + "/" + f)

        for rfile in result_files:
            # Also cleaning up the corresponding results data of experiments in S3 bucket
            experiment_id_in_rfile = rfile['Prefix'].split("/")[2]
            if experiment_id_in_rfile in old_experiment_ids:
                print(rfile['Prefix'])
                db().get_target(e["targetSystemId"])
                # Adapt in future, when other traffic simulator are being added
                delete_result_files.append({'Key': rfile['Prefix'] + "sumo0" + "/results.zip"})
                delete_result_files.append({'Key': rfile['Prefix'] + "matsim42" + "/results.zip"})

        if delete_result_files:
            S3ClientController.get_client().delete_objects(Bucket=S3ClientController.bucket_name, Delete={'Objects': delete_result_files}) 

        all_topics = adminClient.list_topics(timeout=10).topics
        # print(" {} topics:".format(len(all_topics)))

        old_topics = []
        for topic in all_topics:
            for old_id in old_experiment_ids:
                if old_id in topic:
                    old_topics.append(topic)
                    break

        if old_topics:
            # delete all kafka log files in /tmp/kafka-logs/
            onlyfiles = [f for f in os.listdir("/tmp/kafka-logs") if os.path.isfile(os.path.join("/tmp/kafka-logs", f))]
            for f in onlyfiles:
                for old_id in old_experiment_ids:
                    if old_id in f:
                        # Important: Run the server.py with super user priviliges, to be able to delete old files from tmp dir
                        os.remove("/tmp/kafka-logs/" + f)
                        break

            # delete all old topics on the kafka broker
            fs = adminClient.delete_topics(old_topics, operation_timeout=30)
            # Wait for operation to finish.
            for topic, f in fs.items():
                try:
                    f.result()  # The result itself is None
                    print("Topic {} deleted".format(topic))
                except Exception as e:
                    print("Failed to delete topic {}: {}".format(topic, e))

        try:
            return len(old_experiments)
        except:
            return {"error": "not found"}, 404

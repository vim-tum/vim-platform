from flask_restful import Resource

from oeda.controller.securityUtils import jwt_auth_required, require_permission, Permission, has_access_to_experiment, \
    create_jwt_auth_file_access_token, get_jwt_auth_identity
from oeda.databases import db
from flask import jsonify, request
from elasticsearch.exceptions import TransportError
from collections import OrderedDict
import json

class AnalysisController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT, has_access_to_experiment)
    def post(experiment_id, step_no, analysis_name):
        if experiment_id is None:
            return {"error": "experiment_id cannot be null"}, 404

        test_results = {}
        try:
            analysis = db().get_analysis(experiment_id, step_no, analysis_name)

            if analysis:
                # sort PR(>F) values in ascending order for ANOVA results, and None values should be in the end
                # https://stackoverflow.com/questions/48234072/how-to-sort-a-list-and-handle-none-values-properly
                if analysis_name == 'two-way-anova':
                    analysis["anova_result"] = OrderedDict(sorted(analysis["anova_result"].items(), key=lambda item: (item[1]['PR(>F)'] is None, item[1]['PR(>F)'])))
                    analysis["ordered_keys"] = list(analysis["anova_result"].keys())
                test_results[analysis_name] = analysis

                if 'local_image' in analysis['result']:
                    file_access_token = create_jwt_auth_file_access_token(identity=get_jwt_auth_identity(),
                                                                          filename=analysis['result']['local_image'],
                                                                          experiment_id=experiment_id)
                    analysis['result']['file_access_token'] = file_access_token

                if 'local_images' in analysis['result']:
                    for image in analysis['result']['local_images']:
                        file_access_token = create_jwt_auth_file_access_token(identity=get_jwt_auth_identity(),
                                                                          filename=image['local_image'],
                                                                              experiment_id=experiment_id)
                        image['file_access_token'] = file_access_token

                resp = jsonify(analysis)
                resp.status_code = 200
                return resp
            else:
                return {"message": "Cannot get analysis results"}, 404
        except TransportError:
            return {"message": "Analysis result does not exist in database (yet)"}, 404
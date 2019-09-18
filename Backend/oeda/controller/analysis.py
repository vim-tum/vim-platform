from flask_restful import Resource
from oeda.databases import db
from flask import jsonify, request
from elasticsearch.exceptions import TransportError
from collections import OrderedDict
import json

class AnalysisController(Resource):

    @staticmethod
    def post(experiment_id, step_no, analysis_name):
        if experiment_id is None:
            return {"error": "experiment_id cannot be null"}, 404

        test_results = {}
        try:
            res = db().get_analysis(experiment_id, step_no, analysis_name)

            if res:
                # sort PR(>F) values in ascending order for ANOVA results, and None values should be in the end
                # https://stackoverflow.com/questions/48234072/how-to-sort-a-list-and-handle-none-values-properly
                if analysis_name == 'two-way-anova':
                    res["anova_result"] = OrderedDict(sorted(res["anova_result"].items(), key=lambda item: (item[1]['PR(>F)'] is None, item[1]['PR(>F)'])))
                    res["ordered_keys"] = list(res["anova_result"].keys())
                print(json.dumps(res, indent=4))
                test_results[analysis_name] = res
                resp = jsonify(res)
                resp.status_code = 200
                return resp
            else:
                return {"message": "Cannot get analysis results"}, 404
        except TransportError:
            return {"message": "Analysis result does not exist in database (yet)"}, 404
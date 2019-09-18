from flask_restful import Resource
from oeda.databases import db


class StageController(Resource):

    @staticmethod
    def get(experiment_id):
        numberOfSteps = db().get_experiment(experiment_id=experiment_id)["numberOfSteps"]
        steps_and_stages = {}
        # step numbers always start from 1, not 0. and we should pass numberOfSteps + 1 to range fcn
        for step_no in range(1, numberOfSteps + 1):
            stage_ids, stages = db().get_stages(experiment_id=experiment_id, step_no=step_no)
            new_stages = stages
            i = 0
            for _ in stages:
                new_stages[i]["id"] = stage_ids[i]
                i += 1
            steps_and_stages[step_no] = new_stages
        return steps_and_stages

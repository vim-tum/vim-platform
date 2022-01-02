import os

from oeda.databases import db


class AnalysisStrategy:

    SAVE_DIRECTORY = "files/analysis/results/"

    def __init__(self):
        self.version = 0


    @staticmethod
    def create_analysis_directory(experiment_id):
        path = os.path.join(AnalysisStrategy.SAVE_DIRECTORY, experiment_id)
        os.makedirs(path)

    def parse_intermediate_result(self, wf, data):
        self.version = self.version + 1
        self._parse_intermediate_result(wf, data)
        callback = {'version': self.version}
        return callback

    def _parse_intermediate_result(self, wf, data):
        pass

    def parse_final_result(self, wf, data):
        pass

    def store_image(self, experiment_id, image_name, image_format, contour_plot):
        with open(AnalysisStrategy.SAVE_DIRECTORY + experiment_id + "/" + image_name, "wb") as f:
            f.write(contour_plot)

    def store_database(self, experiment_id, algorithm_name, results):
        db().save_analysis(experiment_id=experiment_id, step_no=1, analysis_name=algorithm_name, knobs=None,
                           result=results, anova_result=None)


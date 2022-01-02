from oeda.rtxlib.analysischannels.AnalysisStrategy import AnalysisStrategy


class AnalysisStrategySnapshot(AnalysisStrategy):

    def _parse_intermediate_result(self, wf, data):
        self.parse_final_result(wf, data)

    def parse_final_result(self, wf, data):
        algorithm_name = data['name']
        results = data['results']
        media_type = results['media_type']

        file_name = algorithm_name + "_" + wf.id + ".png"
        contour_plot = results.pop("contour_plot", None)

        self.store_image(experiment_id=wf.id, image_name=file_name, image_format=media_type, contour_plot=contour_plot)
        results["local_image"] = file_name

        self.store_database(experiment_id=wf.id, algorithm_name=algorithm_name, results=results)


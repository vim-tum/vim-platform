from oeda.databases import db
from oeda.rtxlib.analysischannels.AnalysisStrategy import AnalysisStrategy


class AnalysisStrategyGroup(AnalysisStrategy):

    def __init__(self):
        super().__init__()
        self.groups = dict()
        self.interval = 0

    def parse_final_result(self, wf, data):
        pass

    def _parse_intermediate_result(self, wf, data):
        algorithm_name = data['name']
        results = data['results']


        id = results['id']
        #id = results['det_id']
        #results.pop("det_id", None)
        #results['id'] = id
        media_type = results['media_type']
        contour_plot = results.pop("contour_plot", None)

        file_name = algorithm_name + "_" + wf.id + "_" + str(id) + ".png"
        self.store_image(experiment_id=wf.id, image_name=file_name, image_format=media_type, contour_plot=contour_plot)

        results['local_image'] = file_name
        self.groups[id] = results

        self.store_database(experiment_id=wf.id, algorithm_name=algorithm_name,
                            results={'local_images': list(self.groups.values())})



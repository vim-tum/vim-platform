from flask_restful import Resource
from oeda.controller.experiment_results import get_all_stage_data
from oeda.utilities.Structures import DefaultOrderedDict
from collections import OrderedDict
import matplotlib.pyplot as plt
import traceback
import matplotlib.patches as mpatches
import matplotlib.lines as mlines
import json
import numpy as np
from io import BytesIO
import statsmodels.api as sm
import base64
from oeda.databases import db


# https://www.pythonanywhere.com/forums/topic/5017/
# https://stackoverflow.com/questions/38061267/matplotlib-graphic-image-to-base64
class QQPlotController(Resource):

    availableScales = ["normal", "log"]

    def get(self, experiment_id, step_no, stage_no, distribution, scale, incoming_data_type_name):
        try:
            # required because we store them as number in db, but retrieve as string
            step_no = int(step_no)
            if str(scale).lower() not in self.availableScales:
                return {"error": "Provided scale is not supported"}, 404

            pts = []
            # this case corresponds to all stage data of the provided step
            if int(stage_no) == -1:
                steps_and_stages = get_all_stage_data(experiment_id=experiment_id)
                if steps_and_stages is None:
                    return {"error": "Data points cannot be retrieved for given experiment and/or stage"}, 404

                for stage_no in steps_and_stages[step_no]:
                    entity = steps_and_stages[step_no][stage_no]
                    if 'values' in entity:
                        if len(entity['values']) == 0:
                            pass

                        for data_point in entity['values']:
                            # there might be payload data that does not include the selected data type. filter them out
                            point = data_point["payload"].get(incoming_data_type_name)
                            if point:
                                pts.append(point)
            else:
                data_points = db().get_data_points(experiment_id=experiment_id, step_no=step_no, stage_no=stage_no)
                if data_points is None:
                    return {"error": "Data points cannot be retrieved for given experiment and/or stage"}, 404
                for data_point in data_points:
                    point = data_point["payload"].get(incoming_data_type_name)
                    if point:
                        pts.append(point)

            # create the qq plot based on the retrieved data against provided distribution
            array = np.asarray(pts)
            sorted_array = np.sort(array)
            if str(scale).lower() == "log":
                sorted_array = np.log(sorted_array)

            fig1 = sm.qqplot(sorted_array, dist=str(distribution).lower(), line='45', fit=True)
            buf1 = BytesIO()
            fig1.savefig(buf1, format='png')
            buf1.seek(0)

            figure_data_png = base64.b64encode(buf1.getvalue()).decode('ascii')
            buf1.close()
            fig1.clf()
            del fig1
            plt.close('all')
            return figure_data_png

        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"message": e.message}, 404


class BoxPlotController(Resource):
    availableScales = ["normal", "log"]

    def get(self, experiment_id, step_no, stage_no, scale, incoming_data_type_name):
        try:
            # required because we store them as number in db, but retrieve as string
            step_no = int(step_no)
            if str(scale).lower() not in self.availableScales:
                return {"error": "Provided scale is not supported"}, 404

            # this case corresponds to all stage data of the provided step
            if int(stage_no) == -1:
                pts = DefaultOrderedDict(OrderedDict)
                x_values = []
                y_values = []
                steps_and_stages = get_all_stage_data(experiment_id=experiment_id)
                if steps_and_stages is None:
                    return {"error": "Data points cannot be retrieved for given experiment and/or stage"}, 404

                for stage_no in steps_and_stages[step_no]:
                    pts[stage_no] = []
                    entity = steps_and_stages[step_no][stage_no]
                    if 'values' in entity:
                        if len(entity['values']) == 0:
                            pass
                        x_values.append(stage_no)

                        for data_point in entity['values']:
                            # there might be payload data that does not include the selected data type. filter them out
                            point = data_point["payload"].get(incoming_data_type_name)
                            if point:
                                if str(scale).lower() == "log" and point > 0:
                                    pts[stage_no].append(np.log(point))
                                else:
                                    pts[stage_no].append(point)
                        y_values.append(pts[stage_no])

                # show box plots of all stages in a single plot
                # x_values are stage numbers retrieved from db
                # y_values are respective data points
                figure_data_png = draw_box_plot(incoming_data_type_name=incoming_data_type_name, x_values=x_values, y_values=y_values)
                return figure_data_png

            else:
                pts = []
                data_points = db().get_data_points(experiment_id=experiment_id, step_no=step_no, stage_no=stage_no)
                if data_points is None:
                    return {"error": "Data points cannot be retrieved for given experiment and/or stage"}, 404
                for data_point in data_points:
                    point = data_point["payload"].get(incoming_data_type_name)
                    if point:
                        pts.append(point)

                # show box plots of single stage in a single plot
                figure_data_png = draw_box_plot(incoming_data_type_name=incoming_data_type_name, x_values=[stage_no], y_values=pts)
                return figure_data_png

        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"message": e.message}, 404


def draw_box_plot(incoming_data_type_name, x_values, y_values):
    # Create a figure instance
    fig = plt.figure(1, figsize=(9, 6))
    # Create an axes instance
    ax = fig.add_subplot(111)

    # Create the boxplot & format it
    format_box_plot(ax, y_values)

    ax.set_ylabel(incoming_data_type_name)
    ax.set_xlabel("Configurations")

    # Custom x-axis labels for respective samples
    ax.set_xticklabels(x_values)

    # Remove top axes and right axes ticks
    ax.get_xaxis().tick_bottom()
    ax.get_yaxis().tick_left()

    median_legend = mlines.Line2D([], [], color='green', marker='^', linestyle='None',
                                  markersize=5, label='Mean')

    mean_legend = mpatches.Patch(color='red', label='Median')

    plt.legend(handles=[median_legend, mean_legend])

    buf1 = BytesIO()
    plt.savefig(buf1, bbox_inches='tight', format='png')
    buf1.seek(0)

    figure_data_png = base64.b64encode(buf1.getvalue()).decode('ascii')
    buf1.close()
    fig.clf()
    del fig
    plt.close('all')
    return figure_data_png

# http://blog.bharatbhole.com/creating-boxplots-with-matplotlib/
def format_box_plot(ax, y_values):
    bp = ax.boxplot(y_values, showmeans=True, showfliers=False)
    for median in bp['medians']:
        median.set_color('red')
    ## change the style of means and their fill
    for mean in bp['means']:
        mean.set_color('green')
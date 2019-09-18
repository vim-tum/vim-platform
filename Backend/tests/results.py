from oeda.databases import setup_experiment_database, db
from oeda.controller.stages import StageController as sc
from oeda.analysis.two_sample_tests import Ttest
import matplotlib.patches as mpatches
import matplotlib.lines as mlines
import matplotlib.pyplot as plt
import json
import os
import shutil
import numpy as np
import pandas as pd
from pprint import pprint as pp
from datetime import datetime

# to calculate how much we are near/far away from default configurations of target systems in t-test
platooning_results = []
crowdnav_results = []


def delete_files(path):
    for root, dirs, files in os.walk(path):
        for f in files:
            os.unlink(os.path.join(root, f))
        for d in dirs:
            shutil.rmtree(os.path.join(root, d))


def percentage_change(optimized, default):
    if default != 0:
        return float(optimized - default) / abs(default) * 100
    else:
        return "undefined"


def add_to_ttest_results(target_system_type, steps_and_stages, last_step_number, direction):
    # first stage, the stage at index 0, is the result of default configuration, in db it's number is 1
    # pp(steps_and_stages[last_step_number])
    default_config_results = float(steps_and_stages[last_step_number][0]["stage_result"])
    # second stage, the stage at index 1, is the result of optimizer configuration, in db it's number is 2
    optimizer_results = float(steps_and_stages[last_step_number][1]["stage_result"])
    res = percentage_change(optimizer_results, default_config_results)
    if direction == "Minimize":
        res = -1.0 * res

    if target_system_type == "Platooning":
        platooning_results.append(res)
    elif target_system_type == "CrowdNav":
        crowdnav_results.append(res)
    print("d: ", default_config_results, " opt: ", optimizer_results, " res: ", res)


def extract_overall_results_for_anova_and_ttest():
    experiment_ids = db().get_experiments()[0]
    nrOfExperiments = len(experiment_ids)
    nrOfPlatooningExperiments = 0
    passed_anova_platooning = 0
    passed_ttest_platooning = 0
    failed_anova_platooning = 0
    anova_size_error_platooning = 0
    failed_effect_size_platooning = 0
    failed_pvalue_platooning = 0
    failed_ttest_platooning = 0

    nrOfCrowdnavExperiments = 0
    passed_anova_crowdnav = 0
    passed_ttest_crowdnav = 0
    failed_anova_crowdnav = 0
    anova_size_error_crowdnav = 0
    failed_effect_size_crowdnav = 0
    failed_pvalue_crowdnav = 0
    failed_ttest_crowdnav = 0

    for exp_id in experiment_ids:
        experiment = db().get_experiment(exp_id)
        steps_and_stages = sc.get(experiment_id=exp_id)
        last_step_number = steps_and_stages.keys()[-1]

        file_name = str(experiment["name"]).split("Experiment #")[1][:2].rstrip() + "_"

        targetSystemId = experiment["targetSystemId"]
        ts = db().get_target(targetSystemId)

        direction = experiment["considered_data_types"][0]["criteria"]
        originalEffectSize = experiment["analysis"]["tTestEffectSize"]

        if "Platooning" in ts["name"]:
            file_name += "_Platooning_"
            nrOfPlatooningExperiments += 1

            try:
                anova = db().get_analysis(exp_id, 1, "two-way-anova")
                anova_eligible_for_bogp = anova["eligible_for_next_step"]
                if anova_eligible_for_bogp:
                    passed_anova_platooning += 1
                    t_test = db().get_analysis(exp_id, last_step_number, "t-test")
                    t_test_result = t_test["result"]
                    different_averages = t_test_result["different_averages"]
                    effect_size = t_test_result["effect_size"]
                    if direction == 'Maximize':
                        # significant and effect size is enough
                        if effect_size < -1.0 * originalEffectSize and different_averages:
                            passed_ttest_platooning += 1
                        # not significant but effect size is enough
                        elif effect_size < -1.0 * originalEffectSize and not different_averages:
                            failed_pvalue_platooning += 1
                        # significant but effect size is not enough
                        elif effect_size >= -1.0 * originalEffectSize and different_averages:
                            failed_effect_size_platooning += 1
                        # not significant and effect size is not enough
                        else:
                            failed_ttest_platooning += 1
                    else:
                        if effect_size > originalEffectSize and different_averages:
                            passed_ttest_platooning += 1
                        # not significant but effect size is enough
                        elif effect_size > originalEffectSize and not different_averages:
                            failed_pvalue_platooning += 1
                        # significant but effect size is not enough
                        elif effect_size <= originalEffectSize and different_averages:
                            failed_effect_size_platooning += 1
                        else:
                            failed_ttest_platooning += 1
                    add_to_ttest_results("Platooning", steps_and_stages, last_step_number, direction)
                else:
                    failed_anova_platooning += 1
            except:
                print("anova failed for Platooning Experiment # " + file_name)
                anova_size_error_platooning += 1

        elif "CrowdNav" in ts["name"]:
            file_name += "_CrowdNav_"
            nrOfCrowdnavExperiments += 1
            try:
                anova = db().get_analysis(exp_id, 1, "two-way-anova")
                anova_eligible_for_bogp = anova["eligible_for_next_step"]
                if anova_eligible_for_bogp:
                    passed_anova_crowdnav += 1
                    t_test = db().get_analysis(exp_id, last_step_number, "t-test")
                    t_test_result = t_test["result"]
                    different_averages = t_test_result["different_averages"]
                    effect_size = t_test_result["effect_size"]

                    if direction == 'Maximize':
                        if effect_size < -1.0 * originalEffectSize and different_averages:
                            passed_ttest_crowdnav += 1
                        elif effect_size < -1.0 * originalEffectSize and not different_averages:
                            failed_pvalue_crowdnav += 1
                        elif effect_size >= -1.0 * originalEffectSize and different_averages:
                            failed_effect_size_crowdnav += 1
                        else:
                            failed_ttest_crowdnav += 1
                    else:
                        if effect_size > originalEffectSize and different_averages:
                            passed_ttest_crowdnav += 1
                        elif effect_size > originalEffectSize and not different_averages:
                            failed_pvalue_crowdnav += 1
                        elif effect_size <= originalEffectSize and different_averages:
                            failed_effect_size_crowdnav += 1
                        else:
                            failed_ttest_crowdnav += 1
                    add_to_ttest_results("CrowdNav", steps_and_stages, last_step_number, direction)
                else:
                    failed_anova_crowdnav += 1
            except:
                print("anova failed for CrowdNav Experiment # " + file_name)
                anova_size_error_crowdnav += 1

        res = {}
        res["nrOfExperiments"] = nrOfExperiments
        res["platooning"] = {}
        res["platooning"]["anova"] = {}
        res["platooning"]["ttest"] = {}

        res["crowdnav"] = {}
        res["crowdnav"]["anova"] = {}
        res["crowdnav"]["ttest"] = {}

        res["platooning"]["nrOfExperiments"] = nrOfPlatooningExperiments
        res["platooning"]["anova"]["passed"] = passed_anova_platooning
        res["platooning"]["anova"]["failed"] = failed_anova_platooning
        res["platooning"]["anova"]["size_error"] = anova_size_error_platooning

        res["platooning"]["ttest"]["passed"] = passed_ttest_platooning
        res["platooning"]["ttest"]["failed"] = failed_ttest_platooning
        res["platooning"]["ttest"]["effect_size"] = failed_effect_size_platooning
        res["platooning"]["ttest"]["pvalue"] = failed_pvalue_platooning

        res["crowdnav"]["nrOfExperiments"] = nrOfCrowdnavExperiments
        res["crowdnav"]["anova"]["passed"] = passed_anova_crowdnav
        res["crowdnav"]["anova"]["failed"] = failed_anova_crowdnav
        res["crowdnav"]["anova"]["size_error"] = anova_size_error_crowdnav

        res["crowdnav"]["ttest"]["passed"] = passed_ttest_crowdnav
        res["crowdnav"]["ttest"]["failed"] = failed_ttest_crowdnav
        res["crowdnav"]["ttest"]["effect_size"] = failed_effect_size_crowdnav
        res["crowdnav"]["ttest"]["pvalue"] = failed_pvalue_crowdnav

        with open('./results/overall.json', 'w') as outfile:
            json.dump(res, outfile, sort_keys=False, indent=4, ensure_ascii=False)

        ttest_results = {}
        ttest_results["platooning"] = {}
        ttest_results["platooning"]["results"] = platooning_results
        ttest_results["platooning"]["avg"] = np.average(platooning_results)

        ttest_results["crowdnav"] = {}
        ttest_results["crowdnav"]["results"] = crowdnav_results
        ttest_results["crowdnav"]["avg"] = np.average(crowdnav_results)

        with open('./results/ttest.json', 'w') as outfile2:
            json.dump(ttest_results, outfile2, sort_keys=False, indent=4, ensure_ascii=False)


def convert_time_difference_to_mins(tstamp1, tstamp2):
    if tstamp1 > tstamp2:
        td = tstamp1 - tstamp2
    else:
        td = tstamp2 - tstamp1
    td_mins = int(round(td.total_seconds() / 60))
    return td_mins


def calculate_results_and_flush(experiments, target_system, y_key, sample_size):
    experiments = sorted(experiments, key=lambda elem: elem[1]["result"]["effect_size"], reverse=True)
    # pp(passed_experiments)
    opt_percentages = []
    best_results_arr = []
    for exp, t_test, last_step_number in experiments:
        experiment_id = exp["id"]
        first_data_point_of_experiment = db().get_data_points(experiment_id, 1, 1)[0]
        first_timestamp = first_data_point_of_experiment["createdDate"]
        last_stage_result_of_experiment = db().get_data_points(experiment_id, last_step_number, 2)
        last_stage_length = len(last_stage_result_of_experiment)
        last_timestamp = last_stage_result_of_experiment[last_stage_length - 1]["createdDate"]

        last_date = datetime.strptime(last_timestamp, "%Y-%m-%d %H:%M:%S.%f")
        first_date = datetime.strptime(first_timestamp, "%Y-%m-%d %H:%M:%S.%f")
        difference = convert_time_difference_to_mins(first_date, last_date)

        steps_and_stages = sc.get(experiment_id=experiment_id)
        last_step_number = steps_and_stages.keys()[-1]
        default_and_best_stages = steps_and_stages[last_step_number]
        default_and_best_stages.append(difference)
        default_and_best_stages[1]["elapsed_time"] = difference

        assert default_and_best_stages[0]["number"] == 1
        default_config_result = default_and_best_stages[0]["stage_result"]
        assert default_and_best_stages[1]["number"] == 2
        best_config_result = default_and_best_stages[1]["stage_result"]
        best_knobs = default_and_best_stages[1]["knobs"]
        best_results_arr.append(default_and_best_stages[1])
        opt_percentage = -1.0 * percentage_change(best_config_result, default_config_result)
        opt_percentages.append(opt_percentage)

    # if len(best_knobs_arr) != 0:
    best_results_arr = sorted(best_results_arr, key=lambda elem: elem["stage_result"])
    out_json = {}
    out_json["numberOfExperiments"] = len(best_results_arr)
    out_json["best_results"] = best_results_arr

    out_json["optimization_percentages"] = opt_percentages
    out_json["average_optimization_percentage"] = np.mean(opt_percentages)

    out_json["experiment_durations"] = [elem["elapsed_time"] for elem in best_results_arr]
    out_json["average_experiment_duration"] = np.mean(out_json["experiment_durations"])

    with open('./results/' + target_system + '/' + str(y_key) + "_" + str(sample_size) + '.json', 'w') as outfile:
        json.dump(out_json, outfile, sort_keys=False, indent=4, ensure_ascii=False)


def get_best_configurations(target_system, sample_size, y_key):
    passed_experiments = []
    not_passed_experiments = []
    anova_passed = 0
    anova_failed = 0
    total = 0
    experiment_ids = db().get_experiments()[0]
    # experiment_ids = [experiment_ids[0]]
    for exp_id in experiment_ids:
        experiment = db().get_experiment(exp_id)
        steps_and_stages = sc.get(experiment_id=exp_id)
        last_step_number = steps_and_stages.keys()[-1]
        originalEffectSize = experiment["analysis"]["tTestEffectSize"]
        considered_data_type = experiment["considered_data_types"][0]
        direction = considered_data_type["criteria"]

        targetSystemId = experiment["targetSystemId"]
        ts = db().get_target(targetSystemId)
        if str(target_system) in ts["name"] and experiment["executionStrategy"]["sample_size"] == sample_size and considered_data_type["name"] == y_key:
            try:
                anova = db().get_analysis(exp_id, 1, "two-way-anova")
                anova_eligible_for_bogp = anova["eligible_for_next_step"]

                if anova_eligible_for_bogp:
                    anova_passed += 1
                    t_test = db().get_analysis(exp_id, last_step_number, "t-test")
                    t_test_result = t_test["result"]
                    different_averages = t_test_result["different_averages"]
                    effect_size = t_test_result["effect_size"]
                    if direction == 'Maximize':
                        # significant and effect size is enough
                        if effect_size < -1.0 * originalEffectSize and different_averages:
                            passed_experiments.append((experiment, t_test, last_step_number))
                        else:
                            not_passed_experiments.append((experiment, t_test, last_step_number))
                    else:
                        if effect_size > originalEffectSize and different_averages:
                            passed_experiments.append((experiment, t_test, last_step_number))
                        else:
                            not_passed_experiments.append((experiment, t_test, last_step_number))
                total += 1
            except:
                anova_failed += 1

    if target_system == "CrowdNav":
        calculate_results_and_flush(not_passed_experiments, target_system, y_key, sample_size)
    else:
        calculate_results_and_flush(passed_experiments, target_system, y_key, sample_size)


def compare_best_results_of_3_method_process_with_best_results_of_bogp(target_system, sample_size, data_type, alpha=0.05):
    filenames = os.listdir("./results/default/" + target_system)
    best_results_bogp = []
    for fn in filenames:
        if data_type in fn:
            with open('./results/default/' + target_system + '/' + fn) as f:
                data = json.load(f)
                best_results_bogp.append(data)

    with open('./results/' + target_system + '/' + data_type + '_' + str(sample_size) + '.json') as f2:
        three_method_result = json.load(f2)

    out_obj = {}
    results = []
    # take same number of result from 3-method process
    best_three_method_results = three_method_result["best_results"][:len(best_results_bogp)]
    best_three_method_durations = three_method_result["experiment_durations"][:len(best_results_bogp)]
    for idx, res in enumerate(best_three_method_results):
        experiment_id = res["experiment_id"]
        data_points = db().get_data_points(experiment_id, res["step_no"], res["number"])
        extracted_data_points = [d["payload"][data_type] for d in data_points]
        stage_id = str(experiment_id) + "#" + str(res["step_no"]) + "#" + str(res["number"])

        for bogp_result in best_results_bogp:
            extracted_data_points_bogp = [d["payload"][data_type] for d in bogp_result["stage_data"]]
            bogp_stage_id = str(bogp_result["experiment"]["id"]) + '#' + str(bogp_result["stage_number"])
            test1 = Ttest(stage_ids=[stage_id, bogp_stage_id], y_key=data_type, alpha=alpha)
            result = test1.run(data=[extracted_data_points, extracted_data_points_bogp], knobs=None)
            result["3_method_average"] = np.mean(extracted_data_points)
            result["sm_average"] = np.mean(extracted_data_points_bogp)

            # assuming that bogp results are always better than 3-method process, should be checked after generating data
            result_difference_percentage = percentage_change(result["sm_average"], result["3_method_average"])
            result["result_difference_percentage"] = result_difference_percentage

            # assuming that 3-method process duration is less than bogp
            result["sm_duration"] = bogp_result["experiment_duration"]
            result["3_method_duration"] = best_three_method_durations[idx]

            duration_difference_percentage = percentage_change(result["3_method_duration"], result["sm_duration"])
            result["duration_difference_percentage"] = duration_difference_percentage
            pp(result)

            results.append(result)

    if len(results) != 0:
        sum_duration_diff = 0
        sum_result_diff = 0
        three_method_result_avg = 0
        three_method_duration_avg = 0
        single_method_result_avg = 0
        single_method_duration_avg = 0

        for r in results:
            sum_result_diff += r["result_difference_percentage"]
            sum_duration_diff += r["duration_difference_percentage"]

            three_method_result_avg += r["3_method_average"]
            three_method_duration_avg += r["3_method_duration"]

            single_method_result_avg += r["sm_average"]
            single_method_duration_avg += r["sm_duration"]

        out_obj["average_result_difference"] = sum_result_diff / (1.0 * len(results))
        out_obj["average_duration_difference"] = sum_duration_diff / (1.0 * len(results))

        out_obj["average_experiment_duration_3M"] =  three_method_duration_avg / (1.0 * len(results))
        out_obj["average_result_3M"] = three_method_result_avg / (1.0 * len(results))

        out_obj["average_experiment_duration_SM"] =  single_method_duration_avg / (1.0 * len(results))
        out_obj["average_result_SM"] = single_method_result_avg / (1.0 * len(results))

        out_obj["results"] = results

        with open('./results/3_method_bogp_comparison/' + target_system + "_" + str(data_type) + "_" + str(sample_size) + '.json', 'w') as outfile:
            json.dump(out_obj, outfile, sort_keys=False, indent=4, ensure_ascii=False)

    # prepare data for boxplot, i.e. first plot bogp results, then 3-method results
    x_values = []
    y_values = []
    for bogp_result in best_results_bogp:
        x_values.append("SM -" + str(bogp_result["experiment"]["executionStrategy"]["stages_count"]))
        extracted_data_points_bogp = [d["payload"][data_type] for d in bogp_result["stage_data"]]
        y_values.append(extracted_data_points_bogp)

    print(len(best_three_method_results))
    for res2 in best_three_method_results:
        experiment_id = res2["experiment_id"]
        experiment = db().get_experiment(experiment_id)
        x_values.append("3M - " + str(experiment["executionStrategy"]["optimizer_iterations"]))
        data_points = db().get_data_points(experiment_id, res2["step_no"], res2["number"])
        extracted_data_points = [d["payload"][data_type] for d in data_points]
        y_values.append(extracted_data_points)

    draw_box_plot(data_type, x_values, y_values, target_system, "3_method_bogp_comparison", sample_size)


def draw_box_plot(incoming_data_type_name, x_values, y_values, ts_name, folder_name, sample_size):
    # Create a figure instance
    fig = plt.figure(1, figsize=(9, 6))
    # Create an axes instance
    ax = fig.add_subplot(111)
    # Create the boxplot & format it
    format_box_plot(ax, y_values)
    ax.set_title('Boxplots of single-method process (SM) and 3-method process (3M), ' + str(sample_size) + " sample size")
    ax.set_ylabel(incoming_data_type_name)
    ax.set_xlabel("Type of process and number of optimizer iterations applied")
    # Custom x-axis labels for respective samples
    ax.set_xticklabels(x_values)
    # Remove top axes and right axes ticks
    ax.get_xaxis().tick_bottom()
    ax.get_yaxis().tick_left()
    median_legend = mlines.Line2D([], [], color='green', marker='^', linestyle='None',
                                  markersize=5, label='Mean')
    mean_legend = mpatches.Patch(color='red', label='Median')
    plt.legend(handles=[median_legend, mean_legend])
    # plt.xticks(rotation=45)
    plot_path = './results/' + str(folder_name) + '/' + str(ts_name).lower() + '/comparison_' + str(incoming_data_type_name) + "_" + str(sample_size) + ".png"
    plt.savefig(plot_path, bbox_inches='tight', format='png')
    plt.close()


# http://blog.bharatbhole.com/creating-boxplots-with-matplotlib/
def format_box_plot(ax, y_values):
    bp = ax.boxplot(y_values, showmeans=True, showfliers=False)
    for median in bp['medians']:
        median.set_color('red')
    ## change the style of means and their fill
    for mean in bp['means']:
        mean.set_color('green')

if __name__ == '__main__':
    setup_experiment_database("elasticsearch", "localhost", 9200)
    # extract_overall_results_for_anova_and_ttest()

    ############### Platooning ########################
    # get_best_configurations("Platooning", 500, "overhead")
    # get_best_configurations("Platooning", 1000, "overhead")
    # get_best_configurations("Platooning", 5000, "overhead")
    compare_best_results_of_3_method_process_with_best_results_of_bogp("Platooning", 500, "overhead")
    compare_best_results_of_3_method_process_with_best_results_of_bogp("Platooning", 1000, "overhead")

    # get_best_configurations("Platooning", 500, "fuelConsumption")
    # get_best_configurations("Platooning", 1000, "fuelConsumption")
    # get_best_configurations("Platooning", 5000, "fuelConsumption")
    compare_best_results_of_3_method_process_with_best_results_of_bogp("Platooning", 500, "fuelConsumption")
    compare_best_results_of_3_method_process_with_best_results_of_bogp("Platooning", 1000, "fuelConsumption")

    # get_best_configurations("Platooning", 500, "tripDuration")
    # get_best_configurations("Platooning", 1000, "tripDuration")
    # get_best_configurations("Platooning", 5000, "tripDuration")
    compare_best_results_of_3_method_process_with_best_results_of_bogp("Platooning", 500, "tripDuration")
    compare_best_results_of_3_method_process_with_best_results_of_bogp("Platooning", 1000, "tripDuration")

    ############################################################

    ############### CrowdNav ########################
    # get_best_configurations("CrowdNav", 500, "overhead")
    # get_best_configurations("CrowdNav", 1000, "overhead")
    # get_best_configurations("CrowdNav", 2000, "overhead")
    # get_best_configurations("CrowdNav", 5000, "overhead")
    #
    compare_best_results_of_3_method_process_with_best_results_of_bogp("CrowdNav", 500, "overhead")
    compare_best_results_of_3_method_process_with_best_results_of_bogp("Platooning", 1000, "overhead")
    ############################################################



    # file_name += str(experiment["executionStrategy"]["sample_size"]) + "_"
    # file_name += str(experiment["executionStrategy"]["stages_count"]) + "_"
    # file_name += str(experiment["analysis"]["data_type"]["name"])
    #
    # out_json = {}
    # out_json["experiment"] = experiment
    # stage_ids, stages = db().get_stages(exp_id)
    # stages = sorted(stages, key=lambda k: k['stage_result'])
    # out_json["stages"] = stages
    # with open('./results/' + file_name + '.json', 'w') as outfile:
    #     json.dump(out_json, outfile, sort_keys=True, indent=4, ensure_ascii=False)
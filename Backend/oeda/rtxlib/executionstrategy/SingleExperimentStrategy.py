import traceback

from colorama import Fore
# from oeda.analysis.analysis_execution import get_tuples, start_one_sample_tests
from oeda.databases import db
from oeda.log import *
from oeda.rtxlib.execution import experimentFunction


def start_single_experiment_strategy(wf):
    info("> Starting a single experiment ", Fore.LIGHTRED_EX)
    knob = wf.execution_strategy["knobs"]

    wf.step_no = 1
    wf.step_name = "Single_Experiment_Run"
    wf.totalExperiments = 1 # len(wf.execution_strategy["knobs"])
    wf.setup_stage(wf, knob)
    db().update_experiment(experiment_id=wf.id, field='numberOfSteps', value=wf.step_no)

    experimentFunction(wf, {
        "knobs": knob,
        "ignore_first_n_samples": wf.primary_data_provider["ignore_first_n_samples"],
        "sample_size": wf.execution_strategy["sample_size"],
    })

    considered_data_type_name = wf.considered_data_types[0]["name"]
    wf.analysis["data_type"] = considered_data_type_name

    # indicate the end of whole execution

    wf.run_oeda_callback({"status": "COLLECTING_DATA",
                          "experiment_counter": wf.experimentCounter, "total_experiments": wf.totalExperiments,
                          "remaining_time_and_stages": wf.remaining_time_and_stages})


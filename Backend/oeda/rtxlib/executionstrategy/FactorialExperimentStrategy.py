from colorama import Fore
from oeda.log import *
from oeda.analysis.analysis_execution import start_factorial_tests, start_two_sample_tests
from oeda.databases import db
from oeda.rtxlib.executionstrategy.StepStrategy import start_step_strategy
from oeda.rtxlib.executionstrategy.SequencialStrategy import start_sequential_strategy
from oeda.analysis.analysis_execution import get_tuples, get_significant_interactions, start_bogp
from oeda.rtxlib.executionstrategy import create_knob_from_default

import pprint
pp = pprint.PrettyPrinter(indent=4)

def start_factorial_experiment(wf):
    """ executes ANOVA, bayesian opt, and Ttest """
    info("> Analysis   | 3-Phase", Fore.CYAN)
    info("> Starting experimentFunction for ANOVA, setting step_no to 1, updating numberOfSteps in experiment")
    # set step_no to 1 initially and update experiment, because it will be used in front-end
    wf.step_no = 1
    wf.step_name = "ANOVA"
    db().update_experiment(experiment_id=wf.id, field='numberOfSteps', value=wf.step_no)

    default_knob = create_knob_from_default(wf=wf)
    info("> Default knob for Workflow, " + str(default_knob))

    start_step_strategy(wf)
    info("> Starting ANOVA, step_no is still 1")

    # we have only one data type, e.g. overhead
    considered_data_type_name = wf.considered_data_types[0]["name"]
    wf.analysis["data_type"] = considered_data_type_name
    successful = start_factorial_tests(wf)
    if successful:
        all_res = db().get_analysis(experiment_id=wf.id, step_no=wf.step_no, analysis_name='two-way-anova')
        # now we want to select the most important factors out of anova result
        sorted_significant_interactions = get_significant_interactions(all_res["anova_result"], wf.analysis["anovaAlpha"], wf.analysis["nrOfImportantFactors"])
        info("> Sorted significant interactions " + str(sorted_significant_interactions))
        # in this case, we can't find any significant interactions
        db().update_analysis(experiment_id=wf.id, step_no=wf.step_no, analysis_name='two-way-anova', field='eligible_for_next_step', value=False)
        db().update_experiment(experiment_id=wf.id, field='numberOfSteps', value=wf.step_no)
        info("> Cannot find significant interactions, aborting process")
    else:
        error("> ANOVA failed")

    # return back to default
    info("> Reverting back to default configuration:" + str(default_knob))
    wf.change_provider["instance"].applyChange(default_knob)

    # indicate the end of whole execution
    wf.run_oeda_callback({"status": "EXPERIMENT_DONE",
                          "experiment_counter": wf.experimentCounter, "total_experiments": wf.totalExperiments,
                          "remaining_time_and_stages": wf.remaining_time_and_stages})

    info(">")
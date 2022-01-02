from oeda.log import *
from oeda.rtxlib.execution import experimentFunction

from oeda.rtxlib.executionstrategy.SingleExperimentStrategy import start_single_experiment_strategy


def run_execution_strategy(wf):
    """ we run the correct execution strategy """
    applyInitKnobs(wf)
    # start the right execution strategy
    if wf.execution_strategy["type"] == "single_experiment_run":
        start_single_experiment_strategy(wf)

    # finished
    info(">")
    applyDefaultKnobs(wf)


def applyInitKnobs(wf):
    """ we are done, so revert to default if given """
    if "pre_workflow_knobs" in wf.execution_strategy:
        try:
            info("> Applied the pre_workflow_knobs")
            wf.change_provider["instance"] \
                .applyChange(wf.change_event_creator(wf.execution_strategy["pre_workflow_knobs"]))
        except:
            error("apply changes did not work")


def applyDefaultKnobs(wf):
    """ we are done, so revert to default if given """
    if "post_workflow_knobs" in wf.execution_strategy:
        try:
            info("> Applied the post_workflow_knobs")
            wf.change_provider["instance"] \
                .applyChange(wf.change_event_creator(wf.execution_strategy["post_workflow_knobs"]))
        except:
            error("apply changes did not work")


''' re-creates knobs from defaultVariables e.g.{"name":...,"default":...}, {"name":...,"default":...}, {"name":...,"default":...} ...'''
def create_knob_from_default(wf):
    knob = {}
    for definition in wf._oeda_target["defaultVariables"]:
        key = definition["name"]
        value = definition["default"]
        knob[key] = float(value)
    return knob

''' converts values from unicode to float. 
    not applied to SelfOptimizerStrategy and mlrMBO strategy, 
    as they are converted to float according to their min & max values '''
def parseKnobs(knobs):
    for knob in knobs:
        knobs[knob] = float(knobs[knob])
    return knobs
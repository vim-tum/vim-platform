from colorama import Fore
from oeda.log import *
from oeda.rtxlib.execution import experimentFunction
from oeda.rtxlib.executionstrategy import applyInitKnobs
from oeda.rtxlib.executionstrategy import applyDefaultKnobs
from oeda.rtxlib.executionstrategy import parseKnobs

def start_sequential_strategy(wf):
    applyInitKnobs(wf)

    """ executes all experiments from the definition file """
    info("> ExecStrategy   | Sequential", Fore.CYAN)
    wf.totalExperiments = len(wf.execution_strategy["knobs"])
    for knob in wf.execution_strategy["knobs"]:
        knob = parseKnobs(knob)
        wf.setup_stage(wf, knob)
        experimentFunction(wf, {
            "knobs": knob,
            "ignore_first_n_samples": wf.primary_data_provider["ignore_first_n_samples"],
            "sample_size": wf.execution_strategy["sample_size"],
        })

    # finished
    info(">")
    applyDefaultKnobs(wf)

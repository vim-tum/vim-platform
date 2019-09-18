from oeda.databases import db
from oeda.log import *
from oeda.analysis.two_sample_tests import Ttest, TtestPower, TtestSampleSizeEstimation
from oeda.analysis.one_sample_tests import DAgostinoPearson, AndersonDarling, KolmogorovSmirnov, ShapiroWilk
from oeda.analysis.n_sample_tests import Bartlett, FlignerKilleen, KruskalWallis, Levene, OneWayAnova
from oeda.analysis.factorial_tests import FactorialAnova
from oeda.rtxlib.executionstrategy.SelfOptimizerStrategy import start_self_optimizer_strategy
from oeda.rtxlib.executionstrategy.MlrStrategy import start_mlr_mbo_strategy

from collections import OrderedDict
from oeda.utilities.Structures import DefaultOrderedDict
from copy import deepcopy
import traceback

outer_key = "payload" # this is by default, see: data_point_type properties in experiment_db_config.json


def run_analysis(wf):
    """ we run the correct analysis """
    if wf.analysis["type"] == "two_sample_tests":
        start_two_sample_tests(wf)

    elif wf.analysis["type"] == "factorial_tests":
        start_factorial_tests(wf)

    elif wf.analysis["type"] == "one_sample_tests":
        start_one_sample_tests(wf)

    elif wf.analysis["type"] == "n_sample_tests":
        start_n_sample_tests(wf)

    info("> Finished analysis")


# there are always 2 samples for the t-test
def start_two_sample_tests(wf):
    experiment_id = wf.id
    alpha = wf.analysis["tTestAlpha"]
    key = wf.analysis["data_type"]
    mean_diff = 0.1 # as in crowdnav-elastic-ttest-sample-size/definition.py # TODO: get it from user ??

    # this part will test this way of t-test: Default --> Best configuration
    stage_ids, samples, knobs = get_tuples(experiment_id=experiment_id, step_no=wf.step_no, key=key)
    test1 = Ttest(stage_ids=stage_ids, y_key=key, alpha=alpha)
    result = test1.run(data=samples, knobs=knobs)

    # prepare default & optimal knobs to save to analysis
    stage_no = 1
    knobs = {}
    for tpl in wf.execution_strategy["knobs"]:
        knobs[stage_no] = tpl
        stage_no += 1

    db().save_analysis(experiment_id=experiment_id, step_no=wf.step_no, analysis_name=test1.name, result=result, knobs=knobs)

    # if we want to integrate following tests, they should be saved as another step_no, just increment it before saving
    # x1 = samples[0]
    # x2 = samples[1]
    # pooled_std = sqrt((np.var(x1) + np.var(x2)) / 2)
    # effect_size = mean_diff / pooled_std
    # effect_size = wf.analysis["tTestEffectSize"]
    # test2 = TtestPower(stage_ids=stage_ids, y_key=key, effect_size=effect_size)
    # result2 = test2.run(data=samples, knobs=knobs)
    # db().save_analysis(experiment_id=experiment_id, step_no=wf.step_no, analysis_name=test2.name, result=result2)
    #
    # test3 = TtestSampleSizeEstimation(stage_ids=stage_ids, y_key=key, effect_size=None, mean_diff=mean_diff)
    # result3 = test3.run(data=samples, knobs=knobs)
    # db().save_analysis(experiment_id=experiment_id, step_no=wf.step_no, analysis_name=test3.name, result=result3)
    return result


##########################
## One sample tests (Normality tests)
##########################
def start_one_sample_tests(wf):
    id = wf.id
    alpha = wf.analysis["alpha"]
    key = wf.analysis["data_type"]

    stage_ids, samples, knobs = get_tuples(experiment_id=id, step_no=wf.step_no, key=key)
    test = AndersonDarling(id, key, alpha=alpha)
    # as we have only one sample, we need to pass data=samples[0]
    result = test.run(data=samples[0], knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    test = DAgostinoPearson(id, key, alpha=alpha)
    result = test.run(data=samples[0], knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    test = KolmogorovSmirnov(id, key, alpha=alpha)
    result = test.run(data=samples[0], knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    test = ShapiroWilk(id, key, alpha=alpha)
    result = test.run(data=samples[0], knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    return


#########################
# Different distributions tests
# pass necessary stage_ids to db().save_analysis() method
#########################
def start_n_sample_tests(wf):
    id = wf.id
    alpha = wf.analysis["alpha"]
    key = wf.analysis["data_type"]
    stage_ids, samples, knobs = get_tuples(experiment_id=id, step_no=wf.step_no, key=key)

    test = OneWayAnova(stage_ids=stage_ids, y_key=key, alpha=alpha)
    result = test.run(data=samples, knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    test = KruskalWallis(stage_ids=stage_ids, y_key=key, alpha=alpha)
    result = test.run(data=samples, knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    test = Levene(stage_ids=stage_ids, y_key=key, alpha=alpha)
    result = test.run(data=samples, knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    test = Bartlett(stage_ids=stage_ids, y_key=key, alpha=alpha)
    result = test.run(data=samples, knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    test = FlignerKilleen(stage_ids=stage_ids, y_key=key, alpha=alpha)
    result = test.run(data=samples, knobs=knobs)
    db().save_analysis(experiment_id=id, step_no=wf.step_no, analysis_name=test.name, result=result)

    return


# there are >= 2 samples for factorial_tests
# ES saves the ordered dict in unordered format because of JSON serialization / deserialization
# see https://github.com/elastic/elasticsearch-py/issues/68 if you want to preserve order in ES
def start_factorial_tests(wf):
    experiment_id = wf.id
    key = wf.analysis["data_type"]

    # key = "overhead"
    if key is not None:
        try:
            stage_ids, samples, knobs = get_tuples(experiment_id=experiment_id, step_no=wf.step_no, key=key)
            test = FactorialAnova(stage_ids=stage_ids, y_key=key, knob_keys=None, stages_count=len(stage_ids))
            aov_table, aov_table_sqr = test.run(data=samples, knobs=knobs)
            # before saving and merging tables, extract useful information
            aov_table = delete_combination_notation(aov_table)
            aov_table_sqr = delete_combination_notation(aov_table_sqr)

            # type(dd) is DefaultOrderedDict
            # keys = [exploration_percentage, route_random_sigma, exploration_percentage,route_random_sigma...]
            # resultDict e.g. {'PR(>F)': 0.0949496951695454, 'F': 2.8232330924997346 ...
            dod = iterate_anova_tables(aov_table=aov_table, aov_table_sqr=aov_table_sqr)

            # from now on, caller functions should fetch result from DB
            db().save_analysis(experiment_id=experiment_id, step_no=wf.step_no, analysis_name=test.name, anova_result=dod, knobs=knobs)
            return True
        except Exception as e:
            print("error in factorial tests, while performing anova")
            tb = traceback.format_exc()
            error(tb)
            return False
    else:
        error("data type for anova is not properly provided")
        return False


def get_tuples(experiment_id, step_no, key):
    stage_ids = db().get_stages(experiment_id, step_no)[0]
    data, knobs = db().get_data_for_analysis(experiment_id, step_no)
    extract_inner_values(key=key, stage_ids=stage_ids, data=data)
    # parse data & knobs (k-v pairs) to a proper array of values
    samples = [data[stage_id] for stage_id in stage_ids]
    knobs = [knobs[stage_id] for stage_id in stage_ids]
    return stage_ids, samples, knobs


def extract_inner_values(key, stage_ids, data):
    for stage_id in stage_ids:
        res = []
        # AnalysisTest.data is a dict of stage_ids and data_points
        for data_point in data[stage_id]:
            if key in data_point[outer_key]:
                res.append(data_point[outer_key][key])
        data[stage_id] = res


# type(table) is DataFrame
# rows are keys of the result obj param1; param2; param1, param2 etc.
# values are inner keys of those keys, type of values is dict
# set NaN or nan values to None to save to DB properly
# they are like (nan, <type 'float'>), so we compare them by str
def iterate_anova_tables(aov_table, aov_table_sqr):
    dd = DefaultOrderedDict(OrderedDict)
    # iterate first table
    for row in aov_table.itertuples():
        for col_name in list(aov_table):
            if col_name == "PR(>F)" and hasattr(row, "_4"): # PR(>F) is translated to _4 because of pandas?
                val = getattr(row, "_4")
                if str(val) == 'nan' or str(val) == 'NaN':
                    val = None
                dd[row.Index][col_name] = val
            elif hasattr(row, col_name):
                val = getattr(row, col_name)
                if str(val) == 'nan' or str(val) == 'NaN':
                    val = None
                dd[row.Index][col_name] = val

    # iterate second table
    for row in aov_table_sqr.itertuples():
        for col_name in list(aov_table_sqr):
            if hasattr(row, col_name):
                val = getattr(row, col_name)
                if str(val) == 'nan' or str(val) == 'NaN':
                    val = None
                dd[row.Index][col_name] = val

    return dd


# https://stackoverflow.com/questions/4406501/change-the-name-of-a-key-in-dictionary
# https://stackoverflow.com/questions/40855900/pandas-rename-index-values
def delete_combination_notation(table):
    for r in table.index:
        corrected = []
        keys = str(r).split(':')
        for k in keys:
            k = str(k).replace('C(', '').replace(')', '')
            corrected.append(k)
        if len(corrected) != 0:
            res = ""
            for idx, k in enumerate(corrected):
                res += k
                if idx != len(corrected) - 1:
                    res += ", "
            table = table.rename(index={r: res})
    return table


# https://stackoverflow.com/questions/16412563/python-sorting-dictionary-of-dictionaries
def get_significant_interactions(anova_result, alpha, nrOfParameters):
    # now we want to select the most important factors out of result
    significant_interactions = []
    for interaction_key in anova_result.keys():
        res = anova_result[interaction_key]
        # Residual will be filtered here because of None check
        if 'PR(>F)' in res:
            pvalue = res['PR(>F)']
            if pvalue is not None and pvalue < alpha:
                significant_interactions.append((interaction_key, res, pvalue))

    # sort w.r.t pvalue and also pass other values to caller fcn
    sorted_significant_interactions = sorted((pvalue, interaction_key, res) for (interaction_key, res, pvalue) in significant_interactions)
    if sorted_significant_interactions:
        dd = DefaultOrderedDict(OrderedDict)
        # Filtering phase
        idx = 0
        for (pvalue, interaction_key, res) in sorted_significant_interactions:
            if idx < nrOfParameters:
                # TODO: mark the selected ones in DB, for UI to use this properly, update_analysis method should be changed
                # for now, we'll re-iterate tuples and mark them in UI
                res["is_selected"] = True
                dd[interaction_key] = res
            idx += 1
        return dd
    return None


''' distributes number of iterations within optimization to respective significant interactions
    e.g. nrOfFoundInteractions = 10, and we have 3 influencing factors; then
        4 will be assigned to first (most) influencing factor, 3 will be assigned to second & third factor
    as we use DefaultOrderedDict, we preserve the insertion order of tuples and we get keys based on index of values
'''
def assign_iterations(experiment, significant_interactions, execution_strategy_type):
    nrOfFoundInteractions = len(significant_interactions.keys())
    optimizer_iterations = experiment["executionStrategy"]["optimizer_iterations"]

    values = []
    # https://stackoverflow.com/questions/10366327/dividing-a-integer-equally-in-x-parts
    for i in range(nrOfFoundInteractions):
        values.append(optimizer_iterations / nrOfFoundInteractions)    # integer division

    # divide up the remainder
    for i in range(optimizer_iterations % nrOfFoundInteractions):
        values[i] += 1
    # here, values = [4, 3, 3] for nrOfFoundInteractions = 3, optimizer_iterations = 10
    # keys = ['route_random_sigma', 'exploration_percentage', 'route_random_sigma, exploration_percentage']
    info("> values " + str(values))
    for i in range(len(values)):
        key = list(significant_interactions.keys())[i]
        # TODO: set UI so that smaller value cannot be retrieved,

        # if you have more values in keys, then you need to set opt_iter_in_design accordingly
        # the restriction of n_calls <= 4 * nrOfParams is coming from gp_minimize
        # TODO: depending on execution_strategy_type, different values can be assigned
        if values[i] < len(str(key).split(', ')) * 4:
            values[i] = len(str(key).split(', ')) * 4
        significant_interactions[key]["optimizer_iterations"] = values[i]
        significant_interactions[key]["optimizer_iterations_in_design"] = len(str(key).split(', ')) * 4
    info("> Significant Interactions " + str(significant_interactions))
    return significant_interactions


def start_bogp(wf, sorted_significant_interactions):
    execution_strategy_type = wf.execution_strategy["type"]
    assigned_iterations = assign_iterations(wf._oeda_experiment, sorted_significant_interactions, execution_strategy_type)
    newExecutionStrategy = deepcopy(wf._oeda_experiment["executionStrategy"])
    # print(newExecutionStrategy)
    knobs = newExecutionStrategy["knobs"]
    # k, v example: "route_random_sigma, exploration_percentage": {"optimizer_iterations": 3,"PR(>F)": 0.13678788369818956, "optimizer_iterations_in_design": 8 ...}
    # after changing knobs parameter of experiment.executionStrategy, perform experimentation for each interaction (v)
    optimal_tuples = []
    optimizer_run = 1 # to create step_name to be passed to oedaCallback
    for k, v in sorted_significant_interactions.items():
        print("k: ", k, " v: ", v)
        # here chVars are {u'route_random_sigma': [0, 0.4], u'exploration_percentage': [0, 0.4, 0.6]}
        # print(experiment["changeableVariables"])
        # if there is only one x value in key, then fetch min & max values from chVars after sorting them because user can provide unsorted values in UI
        new_knob = {}
        params = str(k).split(', ')
        # convert values to float because their original type is unicode and skicit gives error about it
        if len(params) == 1:
            knobs[k] = sorted(knobs[k])
            min_value = knobs[k][0]
            max_value = knobs[k][-1]
            new_knob[str(k)] = [float(min_value), float(max_value)]
        else:
            for parameter in params:
                all_values = knobs[parameter] # user can provide different values [0, 0.2, 0.4], [0, 0.4, 0.2] etc.
                all_values = sorted(all_values)
                new_knob[parameter] = [float(all_values[0]), float(all_values[-1])]

        # prepare everything needed for experimentation
        # fetch optimizer_iterations and optimizer_iterations_in_design from assigned_iterations
        newExecutionStrategy["knobs"] = new_knob
        newExecutionStrategy["optimizer_iterations"] = assigned_iterations[k]["optimizer_iterations"]
        newExecutionStrategy["optimizer_iterations_in_design"] = assigned_iterations[k]["optimizer_iterations_in_design"]

        # set new values in wf
        wf.execution_strategy = newExecutionStrategy
        wf.step_name = "Bayesian Optimization - Run: " + str(optimizer_run)

        # perform desired optimization process
        # after each experimentation, we will get best value & knob related with that value
        # to find optimum out of all experiments, we use optimal_tuples array to keep track & sort at the end
        # also save this optimum as stage_result and distinguish between regular stage & overall stage (final) result
        stage_no = "best"
        if wf.execution_strategy["type"] == 'self_optimizer':
            optimal_knob, optimal_result = start_self_optimizer_strategy(wf)
            optimal_tuples.append((optimal_knob, optimal_result))
            info("> Saving optimal knob at the end of Bayesian process (scikit): " + str(optimal_knob) + ", " + str(optimal_result))
            db().save_stage(experiment_id=wf.id, step_no=wf.step_no, step_name=wf.step_name, stage_no=stage_no, knobs=optimal_knob, stage_result=optimal_result)
        elif wf.execution_strategy["type"] == 'mlr_mbo':
            optimal_knob, optimal_result = start_mlr_mbo_strategy(wf)
            optimal_tuples.append((optimal_knob, optimal_result))
            db().save_stage(experiment_id=wf.id, step_no=wf.step_no, step_name=wf.step_name, stage_no=stage_no, knobs=optimal_knob, stage_result=optimal_result)
            info("> Saving optimal knob at the end of Bayesian process (mlr-mbo): " + str(optimal_knob) + ", " + str(optimal_result))

        optimizer_run += 1

        # increment step_no by one as we treat each run of optimization as one step
        wf.step_no += 1
        # also reset stage_counter
        wf.stage_counter = 1
        wf.resetExperimentCounter(wf)
        # also update experiment's numberOfSteps
        db().update_experiment(experiment_id=wf.id, field='numberOfSteps', value=wf.step_no)

        intermediate_tuples = sorted(optimal_tuples, key=lambda x: x[1])
        info("> Intermediate_tuples & values " + str(intermediate_tuples))
        intermediate_knobs = intermediate_tuples[0][0]
        info("> intermediate_knobs " + str(intermediate_knobs))
        # find best configuration for intermediate runs and apply it on target system (if applicable)
        if wf.change_provider["changesApplicable"]:
            info("> applying changes using intermediate_knobs " + str(intermediate_knobs))
            wf.change_provider["instance"].applyChange(intermediate_knobs)


    info("> All knobs & values " + str(optimal_tuples))
    # find the best tuple (knob & result) for overall execution
    sorted_tuples = sorted(optimal_tuples, key=lambda x: x[1])
    info("> Sorted knobs & values " + str(sorted_tuples))
    # e.g. ({'route_random_sigma': 0.3, 'exploration_percentage': 0.5}), 0.4444444
    info("> sorted_tuples[0][0] " + str(sorted_tuples[0][0]) + " " + str(sorted_tuples[0][1]))
    return sorted_tuples[0][0], sorted_tuples[0][1]

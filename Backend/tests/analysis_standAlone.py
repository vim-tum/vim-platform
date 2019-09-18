from oeda.databases import setup_experiment_database, setup_user_database, db
from oeda.analysis.factorial_tests import FactorialAnova
from oeda.analysis.analysis_execution import delete_combination_notation, iterate_anova_tables, get_tuples
from collections import OrderedDict
from oeda.utilities.Structures import DefaultOrderedDict
from scipy import stats
import pprint
import json
pp = pprint.PrettyPrinter(indent=4)

def start_workflow_with_anova(experiment_id, step_no, key, alpha, nrOfImportantFactors, executionStrategyType, performAnova=False):
    stage_ids, samples, knobs = get_tuples(experiment_id, step_no, key)
    if performAnova:
        perform_anova(experiment_id, step_no, stage_ids, samples, knobs, key)

    # retrieved = db().get_analysis(experiment_id=experiment_id, step_no=step_no, analysis_name='two-way-anova')
    # significant_interactions = get_significant_interactions(retrieved['anova_result'], alpha, nrOfImportantFactors)
    # significant_interactions = assign_iterations(experiment, significant_interactions, executionStrategyType)
    # print("ssi", significant_interactions)

def perform_anova(experiment_id, step_no, stage_ids, samples, knobs, key):
    test = FactorialAnova(stage_ids=stage_ids, y_key=key, knob_keys=None, stages_count=len(stage_ids))
    aov_table, aov_table_sqr = test.run(data=samples, knobs=knobs)

    aov_table = delete_combination_notation(aov_table)
    aov_table_sqr = delete_combination_notation(aov_table_sqr)

    # type(dd) is DefaultOrderedDict
    dod = iterate_anova_tables(aov_table=aov_table, aov_table_sqr=aov_table_sqr)
    print("before")
    print(json.dumps(dod, indent=4))
    dd = OrderedDict(sorted(dod.items(), key=lambda item: (item[1]['PR(>F)'] is None, item[1]['PR(>F)'])))
    print("AFTER")
    print(json.dumps(dd, indent=4))
    # db().save_analysis(experiment_id=experiment_id, step_no=step_no, analysis_name=test.name, anova_result=dd)

def start_workflow_with_ttest(experiment_id, key, alpha):
    experiment = db().get_experiment(experiment_id)
    pp.pprint(experiment)
    last_step_no = experiment["numberOfSteps"]
    stage_ids, samples, knobs = get_tuples(experiment_id=experiment_id, step_no=last_step_no, key=key)
    pp.pprint(stage_ids)
    pp.pprint(samples)
    pp.pprint(knobs)

    #
    # test1 = Ttest(stage_ids=stage_ids, y_key=key, alpha=alpha)
    # result = test1.run(data=samples, knobs=knobs)
    # print(json.dumps(result, indent=4))
    # db().save_analysis(experiment_id=experiment_id, step_no=wf.step_no, analysis_name=test1.name, result=result)

def sort():
    tuples = []
    tuple_1 = ({"ep": 0.2, "rrs": 0.4}, 0.5555)
    tuple_2 = ({"ep": 0.5, "rrs": 0.3}, 0.4444)
    tuple_3 = ({"ep": 0.2222, "rrs": 0.222}, 0.8888)
    tuple_4 = ({"ep": 0.3333, "rrs": 0.333}, 0.6666)
    tuples.append(tuple_1)
    tuples.append(tuple_2)
    tuples.append(tuple_3)
    tuples.append(tuple_4)
    sorted_tuples = sorted(tuples, key=lambda x: x[1])
    print("sorted_tuples", sorted_tuples)
    print("best_knob", sorted_tuples[0][0], " best_value", sorted_tuples[0][1])

def check_normality_assumption(experiment_id, step_no, key, alpha):
    stage_ids, samples, knobs = get_tuples(experiment_id, step_no, key)
    for sample in samples:
        statistic, pvalue = stats.normaltest(sample)
        if pvalue < alpha:  # null hypothesis: x comes from a normal distribution
            continue
        else:
            return False
    return True

def check_homogenity_of_variance_assumption(experiment_id, step_no, key, alpha):
    stage_ids, samples, knobs = get_tuples(experiment_id, step_no, key)
    statistic, pvalue = stats.levene(*samples)
    # Levene's test of homogeneity of variance is non-significant which indicates that the groups have equal variances
    if pvalue < alpha:
        return False
    return True

if __name__ == '__main__':
    nrOfImportantFactors = 3 # to be retrieved from analysis definition
    alpha = 0.05 # to be retrieved from analysis definition
    setup_experiment_database("elasticsearch", "localhost", 9200)
    experiment_id = "076861f3-b77b-d1a3-90c4-cc34c00712aa"
    experiment = db().get_experiment(experiment_id)
    pp.pprint(experiment)
    ttest_step_no = experiment["numberOfSteps"]

    anova_step_no = "1" # 1 denotes step-strategy phase for ANOVA, last one denotes T-test, intermediate ones denote Bayesian Opt
    key = "fuelConsumption"
    # test_data_points(experiment_id, step_no)
    # start_workflow_with_anova(experiment_id, anova_step_no, key, alpha, nrOfImportantFactors, 'self-optimizer', True)
    # start_workflow_with_ttest(experiment_id=experiment_id, key=key, alpha=alpha)

    # normality = check_normality_assumption(experiment_id, anova_step_no, key, alpha)
    # hom_var = check_homogenity_of_variance_assumption(experiment_id, anova_step_no, key, alpha)
    # print("Normality of ANOVA", normality)
    # print("Homogenity of variances ANOVA", hom_var)
    #
    # normality_ttest = check_normality_assumption(experiment_id, ttest_step_no, key, alpha)
    # hom_var_ttest = check_homogenity_of_variance_assumption(experiment_id, ttest_step_no, key, alpha)
    # print("Normality of T-test", normality_ttest)
    # print("Homogenity of variances T-test", hom_var_ttest)

    # asd = db().get_experiment(experiment_id=experiment_id)["numberOfSteps"]
    # all_stage_data = get_all_stage_data(experiment_id=experiment_id)
    # print(json.dumps(all_stage_data, indent=4))
    # print(all_stage_data.keys())
    # print(all_stage_data[1])
    # stage_ids, stages = db().get_stages(experiment_id=experiment_id, step_no=step_no)





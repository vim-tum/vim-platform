import pandas as pd
from itertools import combinations
from statsmodels.formula.api import ols
from statsmodels.stats.anova import anova_lm
from oeda.log import error
from oeda.analysis import Analysis
from copy import deepcopy

class FactorialAnova(Analysis):
    """ For explanation of the different types of ANOVA check:
    https://mcfromnz.wordpress.com/2011/03/02/anova-type-iiiiii-ss-explained/

    Some errors that can occur:
        1) raise LinAlgError("Singular matrix")
        2) raise ValueError("must have at least one row in constraint matrix")
    """


    name = "two-way-anova"

    # TODO: refactor Analysis classes because we don't have stage_ids associated with analysis tuple in ES anymore
    def __init__(self, stage_ids, y_key, knob_keys, stages_count):
        super(FactorialAnova, self).__init__(stage_ids, y_key)
        self.knob_keys = knob_keys
        self.stages_count = stages_count

    def run(self, data, knobs):
        dataframe_data = dict()
        # NEW: removed logic of d[self.y_key] because they are already retrieved in proper form
        y_values = [d for i in range(self.stages_count) for d in data[i]]
        dataframe_data[self.y_key] = y_values

        # NEW: alter knob_keys to fit for the previous logic
        # IMPORTANT ASSUMPTION HERE: as discussed before, we apply these analysis tests to stages of the same experiment
        # so, knobs[0].keys() == knobs[1].keys() == knobs[2].keys() == global keys
        if not self.knob_keys:
            self.knob_keys = knobs[0].keys()

        if len(self.knob_keys) < 2:
            error("Cannot run " + self.name + " on one factor.")
            error("Aborting analysis")
            return

        for knob_key in self.knob_keys:
            res = []
            for i in range(self.stages_count):
                for d in data[i]:
                    res.append(knobs[i][knob_key])
            dataframe_data[knob_key] = res

        # data for quick tests:
        # dataframe_data = {}
        # dataframe_data["overhead"] = [2.3, 1.3, 2.8, 2.5, 2.9, 2.4, 1.4, 2.6, 1.8, 1.9, 1.2, 3.0]
        # dataframe_data["route_random_sigma"] = [0, 0, 0, 0.2, 0.2, 0.2, 0, 0, 0, 0, 0, 0]
        # dataframe_data["exploration_percentage"] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.2, 0.2]

        df = pd.DataFrame(dataframe_data)
        print(df)
        print("------------------")

        formula = self.create_formula()
        # formula = "overhead ~ route_random_sigma * exploration_percentage"
        print(formula)
        print("------------------")

        data_lm = ols(formula, data=dataframe_data).fit()
        print(data_lm.summary())
        print("------------------")

        aov_table = anova_lm(data_lm, typ=2)
        aov_table_sqr = deepcopy(aov_table)
        self.eta_squared(aov_table_sqr)
        self.omega_squared(aov_table_sqr)
        # TODO: aov_table = aov_table[aov_table["omega_sq"] > min_effect_size] can also be integrated

        # remove same cols, see: https://stackoverflow.com/questions/13411544/delete-column-from-pandas-dataframe-using-del-df-column-name
        columns = ['sum_sq', 'df', 'F', 'PR(>F)']
        aov_table_sqr.drop(columns, inplace=True, axis=1)
        return aov_table, aov_table_sqr

    def create_formula(self):
        """Example for 3 factors:
             overhead ~ C(route_random_sigma) + C(exploration_percentage) + C(max_speed_and_length_factor)' \
                    ' + C(route_random_sigma):C(exploration_percentage)' \
                    ' + C(route_random_sigma):C(max_speed_and_length_factor)' \
                    ' + C(exploration_percentage):C(max_speed_and_length_factor)' \
                    ' + C(route_random_sigma):C(exploration_percentage):C(max_speed_and_length_factor)'
        """

        formula = self.y_key + " ~ "
        formula += " + ".join("C(" + knob_key + ")" for knob_key in self.knob_keys)
        formula += " + "

        formula += \
            " + ".join(
                " + ".join(
                    ":".join("C(" + c + ")" for c in comb)
                    for comb in combinations(self.knob_keys, comb_num))
                for comb_num in range(2, len(self.knob_keys)+1))

        return formula

    def eta_squared(self, aov):
        aov['eta_sq'] = 'NaN'
        aov['eta_sq'] = aov[:-1]['sum_sq']/sum(aov['sum_sq'])

    def omega_squared(self, aov):
        mse = aov['sum_sq'][-1]/aov['df'][-1]
        aov['omega_sq'] = 'NaN'
        aov['omega_sq'] = (aov[:-1]['sum_sq']-(aov[:-1]['df']*mse))/(sum(aov['sum_sq'])+mse)
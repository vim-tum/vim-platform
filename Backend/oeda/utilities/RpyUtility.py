from rpy2.robjects.packages import importr, isinstalled
from rpy2.rinterface import FloatSexpVector, ComplexSexpVector
from rpy2.robjects.conversion import Converter
import rpy2.robjects as robjects
import pandas as pd

# method to return Python representation of R vectors
@robjects.conversion.py2ri.register(FloatSexpVector)
def tuple_str(tpl):
    return FloatSexpVector(tpl)

@robjects.conversion.py2ri.register(ComplexSexpVector)
def complex_sexp_str(dictionary):
    return ComplexSexpVector(dictionary)

my_converter = Converter('my converter')
my_converter.py2ri.register(tuple, tuple_str)
my_converter.py2ri.register(dict, complex_sexp_str)

''' installs required packages and libraries for executing R functions  '''
def install_packages():
    packnames = ('base', 'ggplot2', 'smoof', 'mlr', 'mlrMBO', 'DiceKriging', 'randomForest', 'ParamHelpers', 'stats', 'rgenoud', 'lhs', 'methods', 'emoa')

    if all(isinstalled(x) for x in packnames):
        have_tutorial_packages = True
    else:
        have_tutorial_packages = False

    if not have_tutorial_packages:
        # import R's utility package
        utils = importr('utils')
        # select a mirror for R packages
        utils.chooseCRANmirror(ind = 1) # select the first mirror in the list

        # R vector of strings
        from rpy2.robjects.vectors import StrVector
        # file
        packnames_to_install = [x for x in packnames if not isinstalled(x)]
        if len(packnames_to_install) > 0:
            utils.install_packages(StrVector(packnames_to_install))


''' converts python dict to panda DataFrame to be passed as arg to MLR MBO '''
# https://stackoverflow.com/questions/18837262/convert-python-dict-into-a-dataframe
def convert_dict_to_df(dictionary):
    your_df_from_dict = pd.DataFrame([dictionary])
    print(your_df_from_dict)
    return your_df_from_dict

def convert_df_to_dict(df):
    converted_dict = pd.DataFrame.to_dict(df, orient='index')
    return converted_dict[0]

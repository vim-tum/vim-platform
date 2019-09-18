from rpy2.robjects import pandas2ri
from datetime import datetime
import pandas as pd
import numpy as np


# In rpy2.robjects, DataFrame represents the R class data.frame
def pandas_df_conversion():
    n = 10
    df = pd.DataFrame({
        "timestamp": [datetime.now() for t in range(n)],
        "value": np.random.uniform(-1, 1, n)
    })
    r_dataframe = pandas2ri.py2ri(df)
    print(r_dataframe)


# https://stackoverflow.com/questions/13575090/construct-pandas-dataframe-from-items-in-nested-dictionary
def pandas_df_conversion_nested():
    user_dict = {12: {'Category 1': {'att_1': 1, 'att_2': 'whatever'},
                      'Category 2': {'att_1': 23, 'att_2': 'another'}},
                 15: {'Category 1': {'att_1': 10, 'att_2': 'foo'},
                      'Category 2': {'att_1': 30, 'att_2': 'bar'}}}
    df = pd.DataFrame.from_dict({(i,j): user_dict[i][j]
                            for i in user_dict.keys()
                            for j in user_dict[i].keys()},
                           orient='index')
    print(df)

if __name__ == '__main__':
    pandas2ri.activate() # required
    pandas_df_conversion()
    pandas_df_conversion_nested()
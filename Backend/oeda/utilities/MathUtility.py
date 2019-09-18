from math import isnan
from numpy import reciprocal
from oeda.log import *


def take_inverse(x):
    print("x", x)
    if x == 0 or isnan(float(x)) or x == "0":
        error("Division by zero or NaN, returning 0")
        return 0
    else:
        if isinstance(x, int):
            return 1./x
        elif isinstance(x, float):
            return reciprocal(x)
        elif isinstance(x, str):
            return reciprocal(float(x))
        else:
            error("Type is not supported, returning 0")
            return 0
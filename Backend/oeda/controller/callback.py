callbackDict = dict()


def set_dict(dictionary, experiment_id):
    callbackDict[experiment_id] = dictionary


def get_dict(experiment_id):
    if experiment_id in callbackDict:
        return callbackDict[experiment_id]
    return None


def pop_from_dict(experiment_id, default_return_value=None): # return None if key isn't in the dict
    callbackDict.pop(experiment_id, default_return_value)
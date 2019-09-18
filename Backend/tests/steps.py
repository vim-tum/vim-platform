import itertools


def recreate_knob_from_step_explorer_values(variables, configuration):
    knob_object = {}
    # create the knobObject based on the position of the configuration and variables in their array
    for idx, val in enumerate(variables):
        knob_object[val] = configuration[idx]
    return knob_object

def get_cartesian_product(knobs):
    keys, values = knobs.keys(), knobs.values()
    opts = [dict(zip(keys, items)) for items in itertools.product(*values)]
    return opts

if __name__ == '__main__':
    knobs = {}
    knobs["asd"] = [0, 0.2]
    knobs["route_random_sigma"] = [0, 0.6]
    knobs["exploration_percentage"] = [0, 0.3, 0.6]
    opts = get_cartesian_product(knobs)
    print(opts)
    print(len(opts))


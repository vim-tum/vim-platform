from oeda.log import *
from oeda.databases import db
import json
import time
import os
from avro import schema, datafile, io
from oeda.controller.s3_client import S3ClientController

def equal_experiment_check(experiment):
    ids, available_experiments = db().get_experiments()

    for other_exp in available_experiments:
        print(other_exp["results_downloadable"])
        print(other_exp)
        print(experiment["targetSystemId"] == other_exp["targetSystemId"])
        print(experiment["results_downloadable"] == other_exp["results_downloadable"])
        print(experiment["simulation"]["startTime"] == other_exp["simulation"]["startTime"])
        print(experiment["simulation"]["endTime"] == other_exp["simulation"]["endTime"])
        print(experiment["simulation"]["updateInterval"] == other_exp["simulation"]["updateInterval"])
        print(experiment["id"] != other_exp["id"])
        # only consider experiments run on the same target system
        # pick only successfull experiments
        # check if results dwonloadable property is equal and the start and end time and updateInterval
        # and other_exp["status"] == "SUCCESS" \
        if experiment["targetSystemId"] == other_exp["targetSystemId"] \
            and experiment["results_downloadable"] == other_exp["results_downloadable"] \
            and experiment["simulation"]["startTime"] == other_exp["simulation"]["startTime"] \
            and experiment["simulation"]["endTime"] == other_exp["simulation"]["endTime"] \
            and experiment["simulation"]["updateInterval"] == other_exp["simulation"]["updateInterval"] \
            and experiment["user"] == other_exp["user"] \
            and other_exp["status"] == "SUCCESS" \
            and experiment["id"] != other_exp["id"]:
            exp_resources = experiment["simulation"]["resources"]
            other_exp_resource = other_exp["simulation"]["resources"]
            # check if all resource files are the same, respectively the amount and kind of resources
            if len(exp_resources) != len(other_exp_resource):
                continue
            print("Reached heeere")
            # set to true for the case where both experiments do not have any resource files attached.
            found_matching_res = True

            for res in exp_resources:
                for other_res in other_exp_resource:
                    found_matching_res = False
                    if res == other_res:
                        print(res)
                        print(other_res)
                        found_matching_res = True
                        break
                    print("found_equal_res")
                    print(found_equal_res)
                    print(other_res)
                    print(res)

                print("got where thereo")
                if not found_matching_res:
                    print("debugg 4 ")
                    break
            
            print("got here")
            print(found_matching_res)
            if found_matching_res:
                print("debug 3")
                return [other_exp]
    
    return []
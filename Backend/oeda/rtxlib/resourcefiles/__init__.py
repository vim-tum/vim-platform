import os

from colorama import Fore

from oeda.controller.s3_client import S3ClientController
from oeda.log import debug


def create_resource_file_references(simulation_type, resources):
    if simulation_type == "sumo":
        # add two necessary resource files: traffic.xml & network.sumo.xml
        # simulator require both these and the sce file to initiate a simulation run
        path_to_simulation_resources = "oeda/config/simulation_config/sumo_resources/"
    elif simulation_type == "matsim":
        path_to_simulation_resources = "oeda/config/simulation_config/matsim_resources/"
    else:
        debug("Invalid simulation type of target. Please check simulation type chosen.", Fore.RED)
        exit(1)

    # resources as byte stream to be sent to the kafka broker for further transfer to the simulation service
    resource_msg = []
    for r in resources:
        resource_msg.append(create_kafka_msg(path_to_simulation_resources, r['type'], r['name']))
    return resource_msg


def create_kafka_msg(path_to_sim_resources, resource_file_type, resource_file_name):
    # Check if the resources are available in s3 bucket
    # Use naming schema for comparison of resource files

    # We need to store/check the resources in the S3 bucket, when a new experiment is being created.
    # Check if the resource is already available (or unchanged?) in the storage hierachy and use that or otherwise update/upload the new one.
    path_to_simulation_resources = path_to_sim_resources
    # Establish s3 connection
    s3_client = S3ClientController()
    s3_bucket_name = "s3://" + s3_client.bucket_name
    path_for_map_resources = s3_client.path_for_map_resources
    path_for_input_resources = s3_client.path_for_input_resources
    path_for_other_resources = s3_client.path_for_other_resources

    map_files = s3_client.get_files(path_for_map_resources)
    input_files = s3_client.get_files(path_for_input_resources)
    other_files = s3_client.get_files(path_for_other_resources)

    input_file_reference, map_file_reference, other_resource_file_reference = "", "", ""

    if resource_file_type == "Input":
        if (path_for_input_resources + resource_file_name) in input_files:
            print(
                "resource - input file named " + resource_file_name + " available in s3 bucket under the path " + path_for_input_resources)
            # Custom resource files will not be stored on the server side, rather pass the file reference to the s3 storage
            input_file_reference = s3_bucket_name + "/" + path_for_input_resources + resource_file_name
            print("input file reference is: " + input_file_reference)
            msg1 = {"ID": resource_file_name, "Type": "Input", "File": None, "FileReference": input_file_reference}

            return msg1
        else:
            # Upload the resource to the s3 bucket
            debug(
                "You need to upload resource file named " + resource_file_name + "with the file type " + resource_file_type + " to s3 bucket",
                Fore.YELLOW)
    elif resource_file_type == "RoadMap":
        if (path_for_map_resources + resource_file_name) in map_files:
            print(
                "resource - map file named " + resource_file_name + " available in s3 bucket under the path " + path_for_map_resources)
            map_file_reference = s3_bucket_name + "/" + path_for_map_resources + resource_file_name
            print("map file reference is: " + map_file_reference)
            msg2 = {"ID": resource_file_name, "Type": "RoadMap", "File": None, "FileReference": map_file_reference}

            return msg2
        else:
            # Upload the resource to the s3 bucket
            debug(
                "You need to upload resource file named " + resource_file_name + "with the file type " + resource_file_type + " to s3 bucket",
                Fore.YELLOW)
    elif resource_file_type == "Other":
        if (path_for_other_resources + resource_file_name) in other_files:
            print(
                "resource - other file named " + resource_file_name + " available in s3 bucket under the path " + path_for_other_resources)
            other_resource_file_reference = s3_bucket_name + "/" + path_for_other_resources + resource_file_name
            print("other file reference is: " + other_resource_file_reference)
            print("Printing the r of r in resources : " + resource_file_name + " with the type : " + resource_file_type)
            msg_c_r_f = {"ID": resource_file_name, "Type": "Other", "File": None,
                         "FileReference": other_resource_file_reference}

            return msg_c_r_f
        else:
            # Upload the resource to the s3 bucket
            debug(
                "You need to upload resource file named " + resource_file_name + "with the file type " + resource_file_type + " to s3 bucket",
                Fore.YELLOW)
    else:
        debug("Invalid resource file type of simulation resources. Please check resource file type chosen.", Fore.RED)
        exit(1)

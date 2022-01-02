from datetime import datetime, timedelta
from flask_restful import Resource
from boto3 import client
from botocore.client import Config

from oeda.controller.securityUtils import jwt_auth_required, Permission, require_permission, require_role, Role, \
    has_access_to_experiment
from oeda.databases import db

class S3ClientController(Resource):
    bucket_name = "s3bvimpprddatastorage"
    path_for_map_resources = 'simulation/resources/maps/'
    path_for_input_resources = 'simulation/resources/inputs/'
    path_for_other_resources = 'simulation/resources/others/'

    @staticmethod
    def get_client():
        return client(
            's3',
            config=Config(signature_version='s3v4'),
            region_name='eu-central-1'
        )

    @staticmethod
    def generate_url(download_url):
        return S3ClientController.get_client().generate_presigned_url('get_object',
                                                               Params={'Bucket': S3ClientController.bucket_name,
                                                                       'Key': download_url},
                                                               ExpiresIn=60  # seconds
                                                               )

    @staticmethod
    def post(file_name, path_in_bucket, path_to_local_disk):
        s3_client = S3ClientController.get_client()
        # append the path to the file on the local disk of the server
        filename = path_to_local_disk + file_name
        # set the objectkey to the internal s3 path you want to store the file to
        objectkey = path_in_bucket.replace("-", "/") + "/" + file_name

        presigned_post_url = s3_client.upload_file(
            filename, 
            S3ClientController.bucket_name, 
            objectkey, 
            ExtraArgs={"ServerSideEncryption": "aws:kms", "SSEKMSKeyId": "a7f5b8db-e3b1-428c-b4dc-3132494a29ba"}
        )

        return presigned_post_url

    @staticmethod
    def get_all_files():
        files = []
        for item in S3ClientController.get_client().list_objects(Bucket=S3ClientController.bucket_name)['Contents']:
            files.append(item)
        return files

    @staticmethod
    def get_files(path_in_bucket):
        results = S3ClientController.get_client().list_objects(Bucket=S3ClientController.bucket_name,Prefix=path_in_bucket,Delimiter='/')
        files_under_path = []
        for f in results['Contents']:
            files_under_path.append(f['Key'])
        return files_under_path

class S3FileDeleteController(Resource):
    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def get(path_in_bucket):
        files = S3ClientController.get_client().list_objects_v2(Bucket=S3ClientController.bucket_name)['Contents']

        # per default we set the time threshhold to 30 days or older for selecting the old files
        old_files = [{'Key': file['Key']} for file in files if file['LastModified'] < datetime.now().astimezone() - timedelta(days=30)]
            
        S3ClientController.get_client().delete_objects(Bucket=S3ClientController.bucket_name, Delete={'Objects': old_files}) 

        return len(old_files)

class S3ExperimentResultsController(Resource):
    # Can be used to generate a temporary valid download URL for a certain amount of time
    # see: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html#S3.Client.generate_presigned_url
    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.GET_EXPERIMENT, has_access_to_experiment)
    def get(experiment_id, experiment_type):
        experiment_results_url = ""
        # fetch the download url from the db
        experiment = db().get_experiment(experiment_id)
        # TODO: Ask if prefix could be left out when sending the url
        # TODO: Use experiment_type to distinguish the proper download url
        download_url = ""
        if experiment_type == "simulation":
            download_url = experiment["simulation"]["result_url"]["FileReference"][27:]

        experiment_results_url = S3ClientController.generate_url(download_url=download_url)

        return experiment_results_url


class S3ResourceController(Resource):
    # Can be used to generate a temporary valid download URL for a certain amount of time
    # see: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html#S3.Client.generate_presigned_url
    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.WRITE_EXPERIMENT)
    def get(resource_type, resource_name):


        if resource_type == 'RoadMap':
            path_to_resources = S3ClientController.path_for_map_resources
        if resource_type == 'Input':
            path_to_resources = S3ClientController.path_for_input_resources
        if resource_type == 'Other':
            path_to_resources = S3ClientController.path_for_other_resources

        download_url = path_to_resources + resource_name
        resource_results_url = S3ClientController.generate_url(download_url=download_url)
        return resource_results_url
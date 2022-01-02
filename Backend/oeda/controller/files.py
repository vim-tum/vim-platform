import os
import json
from flask import request, jsonify, send_file
from flask_restful import Resource
from oeda.controller.s3_client import S3ClientController
from oeda.controller.securityUtils import jwt_auth_required, require_permission, Permission, has_access_to_experiment, \
    file_access_token_required, get_jwt_auth_claims
import traceback

from oeda.rtxlib.analysischannels import AnalysisStrategy


class FilesListController(Resource):
    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.WRITE_EXPERIMENT)
    def get(path_in_bucket):
        # append backslash for the correct path in the s3 bucket
        path_in_bucket = path_in_bucket.replace("-", "/") + "/"
        results = S3ClientController.get_client().list_objects(Bucket=S3ClientController.bucket_name,Prefix=path_in_bucket,Delimiter='/')
        files_under_path = []
        files_in_bucket = results.get('Contents', [])
        if files_in_bucket is []:
            return []
        for f in files_in_bucket:
            files_under_path.append(f['Key'][len(path_in_bucket):])

        return files_under_path

class CheckFilesController(Resource):
    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.WRITE_EXPERIMENT)
    # check s3 bucket if a specific file exists using the file name and file size
    def get(path_in_bucket, file_name, file_size):
        result_dict = {'file_exists': "file already exists", 'file_name_taken': "file name already taken", 'upload_file': "file not uploaded"}
        # append backslash for the correct path in the s3 bucket
        path_in_bucket = path_in_bucket.replace("-", "/") + "/"
        results = S3ClientController.get_client().list_objects(Bucket=S3ClientController.bucket_name,Prefix=path_in_bucket,Delimiter='/')
        files_in_bucket = results.get('Contents', [])
        if files_in_bucket is []:
            return result_dict['upload_file']
        for f in files_in_bucket:
            # check for same file name under the s3 storage hierarchy and for the file byte size
            if f['Key'] == path_in_bucket + file_name:
                if f['Size'] == int(file_size):
                    return result_dict['file_exists']
                return result_dict['file_name_taken']
        return result_dict['upload_file']

class FilesUploadController(Resource):
    @staticmethod
    @jwt_auth_required()
    @require_permission(Permission.WRITE_DATASTORAGE)
    def post(path_in_bucket, file_name):
        try:
            if request.headers["Content-Type"] == "text/xml" or request.headers["Content-Type"] == "text/plain":
                # write the byte stream to a file on the local disk storage
                current_directory = os.path.dirname(__file__)
                parent_directory = os.path.split(current_directory)[0]
                file = open(parent_directory + file_name, "wb")
                file.write(request.data)
                file.close()
                # use the file to send it to the S3 bucket
                post_result = S3ClientController.post(file_name, path_in_bucket, parent_directory)
                # remove the file from the local disk storage
                os.remove(parent_directory + file_name)

        except Exception as e:
            print(e)
            tb = traceback.format_exc()
            print(tb)
            return {"error": e.message}, 404

        return

class FilesGetController(Resource):
    @staticmethod
    # get a particular file from the s3 bucket using the corresponding path in the bucket and the filename
    @jwt_auth_required()
    @require_permission(Permission.WRITE_EXPERIMENT)
    def get(path_in_bucket, file_name):
        # append backslash for the correct path in the s3 bucket
        path_in_bucket = path_in_bucket.replace("-", "/") + "/"
        s3_object = S3ClientController.get_client().get_object(Bucket=S3ClientController.bucket_name, Key=path_in_bucket + file_name)
        body = s3_object['Body']
        description = body.read().decode('utf-8')
        return description

class ImageController(Resource):

    @staticmethod
    @file_access_token_required()
    def get():
        claims = get_jwt_auth_claims()
        imageWithPath = AnalysisStrategy.SAVE_DIRECTORY + claims['experiment_id'] + "/" + claims['filename']
        if os.path.isfile(imageWithPath):
            return send_file(
                imageWithPath,
                mimetype='image/png'
            )
        else:
            return {"error": "image not found"}, 404

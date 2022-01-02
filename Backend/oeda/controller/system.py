from flask import request, jsonify
from flask_restful import Resource

from oeda.controller.securityUtils import  jwt_auth_required,  \
     create_jwt_auth_access_token, get_jwt_auth_identity,  \
     require_role, Role,  get_jwt_auth_claims
from oeda.databases import  setup_experiment_database

from elasticsearch.exceptions import ConnectionError
from oeda.service.execution_scheduler import initialize_execution_scheduler



class SystemConfigurationController(Resource):

    # updates the user information and returns newly created jwt token
    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def post():
        try:
            content = request.get_json()
            print('printing content in controller: ....')
            print(content)
            # if type, host, and port are provided, setup experiment database and update user
            if 'host' in content['db_configuration'] and 'port' in content['db_configuration'] and 'type' in content[
                'db_configuration']:
                try:
                    setup_experiment_database(str(content['db_configuration']['type']),
                                              str(content['db_configuration']['host']),
                                              str(content['db_configuration']['port']))
                except:
                    return {"message": "Experiments database configuration needs to be set before proceeding"}, 500
                # user_db().update_user(content)
                # start execution scheduler using updated config
                initialize_execution_scheduler(10)
                # TODO security leak: Admin token can refresh themselves
                username = get_jwt_auth_identity()
                claims = get_jwt_auth_claims()
                claims['user']['db_configuration'] = content['db_configuration']
                access_token = create_jwt_auth_access_token(identity=username,
                                                            additional_claims=claims)
                resp = jsonify({"message": "Update successful", "token": access_token})
                resp.status_code = 200
                return resp
            else:
                resp = jsonify({"message": "Host and/or port values are missing"})
                resp.status_code = 404
                return resp
        except ConnectionError as e:
            resp = jsonify({"message": e.message})
            resp.status_code = 404
            return resp

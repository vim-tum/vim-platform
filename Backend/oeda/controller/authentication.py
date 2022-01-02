from flask import request, jsonify
from flask_restful import Resource

from oeda.controller.securityUtils import  jwt_auth_required, \
     create_jwt_auth_access_token, get_jwt_auth_identity, create_jwt_auth_refresh_token, \
    refresh_token_required, require_role, Role
from oeda.databases import user_db, setup_experiment_database, experiments_db
import  traceback
from werkzeug.security import generate_password_hash, check_password_hash
from oeda.service.execution_scheduler import initialize_execution_scheduler
from oeda.service.execution_scheduler import get_execution_scheduler_timer
from oeda.service.mail import RegistrationMailFactory

class UserRegisterController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def post():
        try:
            content = request.get_json()
            if len(content['name']) != 0 and len(content['password']) != 0:
                # check if given username is unique
                users = user_db().get_users()
                password = content['password']
                for user in users:
                    if user['name'] == content['name']:
                        return {"message": "Username already exists"}, 409
                content['password'] = generate_password_hash(content['password'])
                new_user = user_db().save_user(content)

                content['password'] = password
                (RegistrationMailFactory(content)).send_mail()

                return new_user
            else:
                return {"message": "Invalid information"}, 404
        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"message": e.message}, 404

class UserLoginController(Resource):
    @staticmethod
    def post():
        try:
            content = request.get_json()
            username = content["username"]
            password = content["password"]

            if len(username) != 0 and len(password) != 0:
                users = user_db().get_user(username)
                if users is not None:
                    user_info_without_id = users[0]
                    print(user_info_without_id)
                    if check_password_hash(user_info_without_id['password'], password):
                        del user_info_without_id['password']

                        if 'host' in user_info_without_id['db_configuration'] and 'port' in user_info_without_id[
                            'db_configuration'] and 'type' in user_info_without_id['db_configuration']:
                            # if user is logged-in, and configured experiments database previously:
                            # initialize experiment database and start execution scheduler if they are not done before
                            if experiments_db() is None:
                                try:
                                    setup_experiment_database(str(user_info_without_id['db_configuration']['type']),
                                                              str(
                                                                  user_info_without_id['db_configuration']['host']),
                                                              str(user_info_without_id['db_configuration']['port']))
                                except:
                                    return {
                                               "message": "Experiments database configuration needs to be set before proceeding"}, 500

                            if get_execution_scheduler_timer() is None:
                                initialize_execution_scheduler(10)
                        else:
                            print('emptiness')
                            user_info_without_id['db_configuration'] = {}
                            user_info_without_id['db_configuration']['type'] = "elasticsearch"
                            user_info_without_id['db_configuration']['host'] = "localhost"
                            user_info_without_id['db_configuration']['port'] = 9200

                            if experiments_db() is None:
                                try:
                                    setup_experiment_database(str(user_info_without_id['db_configuration']['type']),
                                                              str(
                                                                  user_info_without_id['db_configuration']['host']),
                                                              str(user_info_without_id['db_configuration']['port']))
                                except:
                                    return {
                                               "message": "Experiments database configuration needs to be set before proceeding"}, 500

                            if get_execution_scheduler_timer() is None:
                                initialize_execution_scheduler(10)
                        # return the usual jwt token
                        # return {"token": str(encoded_jwt)}, 200
                        access_token = create_jwt_auth_access_token(identity=username,
                                                                    additional_claims={"user": user_info_without_id})
                        refresh_token = create_jwt_auth_refresh_token(identity=username)
                        return jsonify(token=access_token, refresh_token=refresh_token)
                    else:
                        return {"message": "Provided credentials are not correct"}, 403
                else:
                    return {"message": "User does not exist. Please register first."}, 404

                # try with elasticsearch for backward compatibility TODO?
                # user_info_without_id = single_user[1]
                # #print(user_info_without_id)
                # if len(user_info_without_id) is not 0:
                #     # assuming that only one user is returned from DB
                #     user_info_without_id = user_info_without_id[0]
                #     if check_password_hash(user_info_without_id['password'], password):
                #         del user_info_without_id['password']
                #         encoded_jwt = jwt.encode({"user": user_info_without_id}, key, algorithm="HS256")
                #
                #         if 'host' in user_info_without_id['db_configuration'] and 'port' in user_info_without_id['db_configuration'] and 'type' in user_info_without_id['db_configuration']:
                #             # if user is logged-in, and configured experiments database previously:
                #             # initialize experiment database and start execution scheduler if they are not done before
                #             if experiments_db() is None:
                #                 setup_experiment_database(str(user_info_without_id['db_configuration']['type']), str(user_info_without_id['db_configuration']['host']), str(user_info_without_id['db_configuration']['port']))
                #             if get_execution_scheduler_timer() is None:
                #                 initialize_execution_scheduler(10)
                #
                #         # return the usual jwt token
                #         return {"token": encoded_jwt}, 200
                #     else:
                #         return {"message": "Provided credentials are not correct"}, 403
                # else:
                #     return {"message": "User does not exist. Please register first."}, 404

            else:
                return {"message": "Invalid information"}, 404

        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"message": e.message}, 404


class TokenRefreshController(Resource):

    @staticmethod
    @refresh_token_required()
    def post():
        identity = get_jwt_auth_identity()
        users = user_db().get_user(identity)
        if users is None:
            return {"message": "User does not exists"}, 404
        user_info = users[0]
        access_token = create_jwt_auth_access_token(identity=identity, additional_claims={"user": user_info})
        return jsonify(token=access_token)
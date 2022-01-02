import hashlib
from datetime import datetime
import secrets

from flask import request, jsonify, current_app
from flask_restful import Resource

from oeda.controller.securityUtils import  jwt_auth_required, \
    require_role, Role, identity_is_username
from oeda.databases import user_db
import traceback
from werkzeug.security import generate_password_hash, check_password_hash
from elasticsearch.exceptions import ConnectionError
from oeda.service.mail import ResetPasswordMailFactory, UserUpdateMailFactory


class UserProfileController(Resource):

    @staticmethod
    @jwt_auth_required()
    @identity_is_username()
    def put(username):
        try:
            content = request.get_json()
            user_db().update_user_profile(username, content)
        except ConnectionError as e:
            resp = jsonify({"message": e.message})
            resp.status_code = 404
            return resp



class UserController(Resource):

    # retrieves the user information (1-st element) as well as its id (0-th element)
    @staticmethod
    @jwt_auth_required()
    @identity_is_username()
    def get(username):
        try:
            user = user_db().get_user(username)
            if len(user) == 0:
                return None
            return user
        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"message": e.message}, 404


    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def put(username):
            content = request.get_json()
            user = user_db().get_user(content['name'])
            (UserUpdateMailFactory(content)).send_mail()
            if user:
                user_db().update_user(content)
            else:
                return {"message": "User does not exists!"}, 404
            return {}

    # deletes the user information
    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def delete(username):
        try:
            res = user_db().delete_user(username)
            if res:
                resp = jsonify(
                    {"message": "User Deleted"})
                resp.status_code = 201
                return resp
            else:
                resp = jsonify(
                    {"message": "User could not be deleted"})
                resp.status_code = 200
                return resp
        except ConnectionError as e:
            resp = jsonify({"message": e.message})
            resp.status_code = 404
            return resp

class UserListController(Resource):

    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def get():
        try:
            users = user_db().get_users()
            if len(users) == 0:
                return {"message": "Users are not found"}, 404
            return users
        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"message": e.message}, 404


class UserChangePasswordController(Resource):

    @staticmethod
    @jwt_auth_required()
    @identity_is_username()
    def post(username):
        content = request.get_json()
        users = user_db().get_user(username)
        if users is None:
            return {"message": "User does not exists"}, 404

        user = users[0]
        current_password = user['password']

        if not check_password_hash(current_password, content['oldPassword']):
            return {"message": "Old password is not valid!"}, 400

        if check_password_hash(current_password, content['newPassword']):
            return {"message": "Old password can't be the new password!"}, 400

        new_password = generate_password_hash(content['newPassword'])
        user_db().update_user_password(user['id'], new_password)
        return {}, 200


class UserResetPasswordController(Resource):

    @staticmethod
    def post():
        content = request.get_json()
        username = content['username']
        users = user_db().get_user(username)
        if users is None:
            return {"message": "User does not exists"}, 404
        user = users[0]
        reset_token = secrets.token_urlsafe()
        reset_token_hash = hashlib.pbkdf2_hmac('sha256', reset_token.encode('ascii'), b'', 100000).hex()
        expires = current_app.config['RESET_TOKEN_EXPIRES']
        expiry_date = datetime.now() + expires
        user_db().create_password_reset_token(user_id=user['id'], expiry_date=expiry_date,
                                              token_hash=reset_token_hash)

        email = {
            "link": current_app.config['FRONTEND_DOMAIN'] + "/resetPassword/" + reset_token,
            "expiry_delta": expires
        }

        (ResetPasswordMailFactory(user, email)).send_mail()

        return {}, 200

    @staticmethod
    def put():
        content = request.get_json()
        reset_token = content["token"]
        new_password = generate_password_hash(content["password"])
        reset_token_hash = hashlib.pbkdf2_hmac('sha256', reset_token.encode('ascii'), b'', 100000).hex()
        token = user_db().get_password_reset_token(token_hash=reset_token_hash)
        if token is not None:
            user_db().delete_password_reset_token(token_id=token['id'])

        if token is None or datetime.now() >= token["expiry_date"]:
            return {"message": "Link expired! Please request a new one!"}, 400
        else:
            user_db().update_user_password(user_id=token['user_id'], password=new_password)
        return {}, 200

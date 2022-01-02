from flask import request
from flask_restful import Resource

from oeda.controller.securityUtils import jwt_auth_required, require_role, Role, identity_is_username
from oeda.databases import user_db


class UserPermissionController(Resource):

    @staticmethod
    @jwt_auth_required()
    @identity_is_username()
    def get(username):
        user = user_db().get_user(username)
        if user is not None:
            permissions = user_db().get_permissions(username)
            return {"roles": user[0]['roles'], "permissions": permissions}, 200
        else:
            return {"message": "User does not exist."}, 404


class UserRoleController(Resource):
    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def get():
        return {"roles": user_db().get_roles(), "permissions": user_db().get_all_permissions()}

    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def put():
        content = request.get_json()
        for role in user_db().get_roles():
            if role['role_id'] == content['id']:
                user_db().update_role(content)
                return {}
        return {"message": "Role does not exists!"}, 404

    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def post():
        content = request.get_json()
        content['basic'] = False
        for role in user_db().get_roles():
            if role['name'] == content['name']:
                return {"message": "Role with the same name already exists!"}, 409

        user_db().create_role(content)
        return {"ok": "post"}

    @staticmethod
    @jwt_auth_required()
    @require_role(Role.ADMIN)
    def delete():
        content = request.get_json()
        user_db().delete_role(content)
        return {"ok": "delete"}